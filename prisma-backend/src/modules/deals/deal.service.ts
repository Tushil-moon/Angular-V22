import type { DealHistoryAction, DealStage, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { mapDeal } from "../../shared/utils/crm-mapper";
import { mapPipeline } from "../../shared/utils/pipeline-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertRecordOwnerAccess,
  buildOwnerScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { ensureTags, syncDealTags } from "../../shared/utils/tag-sync";
import { pipelineRepository } from "../pipelines/pipeline.repository";
import { dealRepository } from "./deal.repository";
import {
  computeWeightedValue,
  dealsToCsv,
  OPEN_DEAL_STAGES,
  parseCsvDeals,
  resolveDealProbability,
} from "./deal.utils";
import type {
  CreateDealInput,
  DisqualifyDealInput,
  ImportDealsCsvInput,
  ImportDealsInput,
  ListDealsQuery,
  ReopenDealInput,
  UpdateDealInput,
  WinDealInput,
} from "./deal.validation";

const resolveTagIds = async (auth: AuthContext, tagIds?: string[], tagNames?: string[]) => {
  const organizationId = requireOrganizationContext(auth);
  const ids = [...(tagIds ?? [])];
  if (tagNames?.length) ids.push(...(await ensureTags(organizationId, tagNames)));
  return [...new Set(ids)];
};

const recordHistory = async (
  auth: AuthContext,
  dealId: string,
  action: DealHistoryAction,
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await dealRepository.addHistory({
    organizationId,
    dealId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

const resolvePipelineContext = async (organizationId: string, stage: DealStage) => {
  const pipeline = await pipelineRepository.ensureDefaultPipeline(organizationId);
  const pipelineStage = await pipelineRepository.findStageByKey(pipeline.id, stage);
  if (!pipelineStage) {
    throw new AppError(500, "Pipeline stage not configured", "PIPELINE_STAGE_MISSING");
  }
  return { pipeline, pipelineStage };
};

const assertLinkedRecords = async (auth: AuthContext, contactId?: string, companyId?: string) => {
  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: buildOwnerScopedWhere(auth, { id: contactId, deletedAt: null }),
    });
    if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
  }

  if (companyId) {
    const company = await prisma.company.findFirst({
      where: buildOwnerScopedWhere(auth, { id: companyId, deletedAt: null }),
    });
    if (!company) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }
};

const buildListWhere = (query: ListDealsQuery, auth: AuthContext) => {
  const search = query.search?.trim() ?? "";

  return buildOwnerScopedWhere(auth, {
    deletedAt: null,
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
    ...(query.contactId ? { contactId: query.contactId } : {}),
    ...(query.companyId ? { companyId: query.companyId } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
    ...(query.openOnly ? { stage: { in: [...OPEN_DEAL_STAGES] } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { competitor: { contains: search, mode: "insensitive" as const } },
            {
              contact: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" as const } },
                  { lastName: { contains: search, mode: "insensitive" as const } },
                  { company: { contains: search, mode: "insensitive" as const } },
                ],
              },
            },
            {
              company: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  });
};

const applyStageChange = async (
  auth: AuthContext,
  dealId: string,
  organizationId: string,
  pipelineId: string | null,
  nextStage: DealStage,
  extra?: Prisma.DealUpdateInput,
) => {
  const resolvedPipelineId = pipelineId ?? (await pipelineRepository.ensureDefaultPipeline(organizationId)).id;
  const pipelineStage = await pipelineRepository.findStageByKey(resolvedPipelineId, nextStage);
  if (!pipelineStage) {
    throw new AppError(500, "Pipeline stage not configured", "PIPELINE_STAGE_MISSING");
  }

  const probability = extra?.probability === undefined ? pipelineStage.probability : undefined;

  return dealRepository.update(dealId, {
    stage: nextStage,
    pipeline: { connect: { id: resolvedPipelineId } },
    pipelineStage: { connect: { id: pipelineStage.id } },
    ...(probability !== undefined ? { probability } : {}),
    ...extra,
  });
};

export const dealService = {
  async listDeals(query: ListDealsQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const skip = (query.page - 1) * query.pageSize;

    const [deals, total] = await prisma.$transaction([
      dealRepository.findMany(where, skip, query.pageSize),
      dealRepository.count(where),
    ]);

    return {
      data: deals.map(mapDeal),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getPipelineSummary(auth: AuthContext, pipelineId?: string) {
    const organizationId = requireOrganizationContext(auth);
    const pipeline = pipelineId
      ? await pipelineRepository.findById(organizationId, pipelineId)
      : await pipelineRepository.ensureDefaultPipeline(organizationId);

    if (!pipeline) throw new AppError(404, "Pipeline not found", "PIPELINE_NOT_FOUND");

    const openStages = pipeline.stages.filter((stage) => !stage.isClosed);

    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      pipelineId: pipeline.id,
      stage: { in: openStages.map((stage) => stage.stageKey) },
    });

    const groups = await prisma.deal.groupBy({
      by: ["stage"],
      where,
      _count: { _all: true },
      _sum: { value: true },
    });

    return {
      pipeline: mapPipeline(pipeline),
      stages: openStages.map((stage) => {
        const row = groups.find((group) => group.stage === stage.stageKey);
        const value = Number(row?._sum.value ?? 0);
        const probability = stage.probability;
        return {
          stageId: stage.id,
          stageKey: stage.stageKey,
          name: stage.name,
          probability,
          count: row?._count._all ?? 0,
          value,
          weightedValue: computeWeightedValue(value, probability),
        };
      }),
    };
  },

  async getBoard(auth: AuthContext, pipelineId?: string) {
    const organizationId = requireOrganizationContext(auth);
    const pipeline = pipelineId
      ? await pipelineRepository.findById(organizationId, pipelineId)
      : await pipelineRepository.ensureDefaultPipeline(organizationId);

    if (!pipeline) throw new AppError(404, "Pipeline not found", "PIPELINE_NOT_FOUND");

    const openStages = pipeline.stages.filter((stage) => !stage.isClosed);
    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      pipelineId: pipeline.id,
      stage: { in: openStages.map((stage) => stage.stageKey) },
    });

    const deals = await dealRepository.listBoard(where);
    const mapped = deals.map(mapDeal);

    return {
      pipeline: mapPipeline(pipeline),
      columns: openStages.map((stage) => ({
        stageId: stage.id,
        stageKey: stage.stageKey,
        name: stage.name,
        probability: stage.probability,
        stage: stage.stageKey,
        deals: mapped.filter((deal) => deal.stage === stage.stageKey),
      })),
    };
  },

  async getDealById(id: string, auth: AuthContext) {
    const deal = await dealRepository.findById(buildOwnerScopedWhere(auth, { id, deletedAt: null }));
    if (!deal) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    return mapDeal(deal);
  },

  async getDealHistory(id: string, auth: AuthContext) {
    const deal = await this.getDealById(id, auth);
    const history = await dealRepository.listHistory(deal.id);
    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
      user: entry.user ? { id: entry.user.id, email: entry.user.email } : null,
    }));
  },

  async createDeal(input: CreateDealInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    await assertLinkedRecords(auth, input.contactId, input.companyId);

    const stage = input.stage ?? "LEAD";
    const { pipeline, pipelineStage } = await resolvePipelineContext(organizationId, stage);
    const tagIds = await resolveTagIds(auth, input.tagIds, input.tagNames);
    const probability = resolveDealProbability(input.probability, pipelineStage.probability);

    const deal = await prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          organizationId,
          title: input.title.trim(),
          value: input.value,
          currency: input.currency ?? "USD",
          stage,
          pipelineId: pipeline.id,
          pipelineStageId: pipelineStage.id,
          contactId: input.contactId,
          companyId: input.companyId,
          leadId: input.leadId,
          ownerId: input.ownerId ?? auth.userId,
          probability,
          expectedCloseDate: input.expectedCloseDate,
          description: input.description?.trim() || undefined,
          competitor: input.competitor?.trim() || undefined,
        },
      });

      if (tagIds.length) {
        await tx.dealTag.createMany({
          data: tagIds.map((tagId) => ({ dealId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      return created.id;
    });

    const saved = await dealRepository.findById({ id: deal });
    if (!saved) throw new AppError(500, "Deal could not be created", "DEAL_CREATE_FAILED");

    await recordHistory(auth, saved.id, "CREATED", { stage, value: input.value });
    return mapDeal(saved);
  },

  async updateDeal(id: string, input: UpdateDealInput, auth: AuthContext) {
    const existing = await dealRepository.findById(buildOwnerScopedWhere(auth, { id, deletedAt: null }));
    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    await assertLinkedRecords(auth, input.contactId, input.companyId);

    const tagIds =
      input.tagIds !== undefined || input.tagNames !== undefined
        ? await resolveTagIds(auth, input.tagIds, input.tagNames)
        : undefined;

    let updatedId = id;

    await prisma.$transaction(async (tx) => {
      const data: Prisma.DealUpdateInput = {
        title: input.title?.trim(),
        value: input.value,
        currency: input.currency,
        expectedCloseDate: input.expectedCloseDate,
        description: input.description?.trim(),
        competitor: input.competitor?.trim(),
        probability: input.probability,
        sortOrder: input.sortOrder,
      };

      if (input.contactId !== undefined) {
        data.contact = input.contactId ? { connect: { id: input.contactId } } : { disconnect: true };
      }
      if (input.companyId !== undefined) {
        data.company = input.companyId ? { connect: { id: input.companyId } } : { disconnect: true };
      }
      if (input.ownerId !== undefined) {
        data.owner = input.ownerId ? { connect: { id: input.ownerId } } : { disconnect: true };
      }

      if (input.stage && input.stage !== existing.stage) {
        const organizationId = requireOrganizationContext(auth);
        const pipelineStage = await pipelineRepository.findStageByKey(
          existing.pipelineId ?? (await pipelineRepository.ensureDefaultPipeline(organizationId)).id,
          input.stage,
        );
        if (!pipelineStage) {
          throw new AppError(500, "Pipeline stage not configured", "PIPELINE_STAGE_MISSING");
        }
        data.stage = input.stage;
        data.pipelineStage = { connect: { id: pipelineStage.id } };
        if (input.probability === undefined) {
          data.probability = pipelineStage.probability;
        }
        if (pipelineStage.isClosed) {
          data.closedAt = new Date();
        } else {
          data.closedAt = null;
          data.winReason = null;
          data.lossReason = null;
        }
      }

      await tx.deal.update({ where: { id }, data });

      if (tagIds !== undefined) {
        await syncDealTags(id, tagIds);
      }
    });

    const deal = await dealRepository.findById({ id: updatedId });
    if (!deal) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");

    if (input.stage && input.stage !== existing.stage) {
      await recordHistory(auth, id, "STAGE_CHANGED", {
        from: existing.stage,
        to: input.stage,
      });
    }
    if (input.value !== undefined && Number(existing.value) !== input.value) {
      await recordHistory(auth, id, "VALUE_CHANGED", {
        from: Number(existing.value),
        to: input.value,
      });
    }
    if (input.ownerId && input.ownerId !== existing.ownerId) {
      await recordHistory(auth, id, "ASSIGNED", { ownerId: input.ownerId });
    }

    return mapDeal(deal);
  },

  async winDeal(id: string, input: WinDealInput, auth: AuthContext) {
    const existing = await dealRepository.findById(buildOwnerScopedWhere(auth, { id, deletedAt: null }));
    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    const organizationId = requireOrganizationContext(auth);
    const deal = await applyStageChange(auth, id, organizationId, existing.pipelineId, "WON", {
      winReason: input.winReason?.trim() || undefined,
      lossReason: null,
      closedAt: new Date(),
    });

    await recordHistory(auth, id, "WON", { winReason: input.winReason ?? null });
    return mapDeal(deal);
  },

  async loseDeal(id: string, input: DisqualifyDealInput, auth: AuthContext) {
    const existing = await dealRepository.findById(buildOwnerScopedWhere(auth, { id, deletedAt: null }));
    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    const organizationId = requireOrganizationContext(auth);
    const deal = await applyStageChange(auth, id, organizationId, existing.pipelineId, "LOST", {
      lossReason: input.lossReason.trim(),
      winReason: null,
      closedAt: new Date(),
      competitor: input.competitor?.trim() || existing.competitor,
    });

    await recordHistory(auth, id, "LOST", {
      lossReason: input.lossReason,
      competitor: input.competitor ?? null,
    });
    return mapDeal(deal);
  },

  async reopenDeal(id: string, input: ReopenDealInput, auth: AuthContext) {
    const existing = await dealRepository.findById(buildOwnerScopedWhere(auth, { id, deletedAt: null }));
    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    const organizationId = requireOrganizationContext(auth);
    const nextStage = input.stage ?? "QUALIFIED";
    const deal = await applyStageChange(auth, id, organizationId, existing.pipelineId, nextStage, {
      closedAt: null,
      winReason: null,
      lossReason: null,
    });

    await recordHistory(auth, id, "REOPENED", { stage: nextStage });
    return mapDeal(deal);
  },

  async deleteDeal(id: string, auth: AuthContext) {
    const existing = await dealRepository.findById(buildOwnerScopedWhere(auth, { id, deletedAt: null }));
    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);
    await dealRepository.softDelete(id);
  },

  async importDeals(input: ImportDealsInput, auth: AuthContext) {
    const created = [];
    const skipped: Array<{ row: number; reason: string }> = [];
    const failed: Array<{ row: number; reason: string }> = [];

    for (let index = 0; index < input.rows.length; index += 1) {
      const row = input.rows[index];
      try {
        let contactId: string | undefined;
        if (row.contactEmail) {
          const contact = await prisma.contact.findFirst({
            where: buildOwnerScopedWhere(auth, {
              email: row.contactEmail.trim().toLowerCase(),
              deletedAt: null,
            }),
            select: { id: true },
          });
          if (!contact && input.skipMissingContacts) {
            skipped.push({ row: index + 1, reason: "Contact not found" });
            continue;
          }
          contactId = contact?.id;
        }

        const deal = await this.createDeal(
          {
            title: row.title,
            value: row.value,
            currency: row.currency ?? "USD",
            stage: (row.stage as DealStage | undefined) ?? "LEAD",
            contactId,
            description: row.description,
            competitor: row.competitor,
            expectedCloseDate: row.expectedCloseDate ? new Date(row.expectedCloseDate) : undefined,
          },
          auth,
        );
        created.push(deal);
      } catch {
        failed.push({ row: index + 1, reason: "Could not create deal" });
      }
    }

    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      created,
      skipped,
      failed,
    };
  },

  async importDealsCsv(input: ImportDealsCsvInput, auth: AuthContext) {
    const rows = parseCsvDeals(input.csv);
    return this.importDeals(
      {
        rows: rows.map((row) => ({
          title: row.title,
          value: row.value,
          currency: row.currency,
          stage: row.stage as DealStage | undefined,
          contactEmail: row.contactEmail,
          description: row.description,
          competitor: row.competitor,
          expectedCloseDate: row.expectedCloseDate ? new Date(row.expectedCloseDate) : undefined,
        })),
        skipMissingContacts: input.skipMissingContacts ?? true,
      },
      auth,
    );
  },

  async exportDeals(query: ListDealsQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const deals = await dealRepository.listForExport(where);
    const csv = dealsToCsv(
      deals.map((deal) => ({
        title: deal.title,
        value: Number(deal.value),
        currency: deal.currency,
        stage: deal.stage,
        contactEmail: deal.contact?.email ?? undefined,
        company: deal.contact?.company ?? undefined,
        expectedCloseDate: deal.expectedCloseDate?.toISOString().slice(0, 10),
        description: deal.description ?? undefined,
        competitor: deal.competitor ?? undefined,
      })),
    );
    return { csv };
  },
};
