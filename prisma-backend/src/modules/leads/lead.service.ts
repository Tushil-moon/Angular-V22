import { AppError } from "../../shared/errors/app-error";
import type { Prisma } from "@prisma/client";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { mapLead } from "../../shared/utils/lead-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertRecordOwnerAccess,
  buildOrgScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { emitDomainEvent } from "../../shared/events/domain-events";
import { shouldScopeToOwner } from "../../shared/utils/permission";
import { contactService } from "../contacts/contact.service";
import { leadRepository } from "./lead.repository";
import {
  calculateLeadScore,
  isOpenLeadStage,
  leadsToCsv,
  parseCsvLeads,
  scoreToRating,
} from "./lead.utils";
import type {
  AssignLeadInput,
  CreateLeadInput,
  DisqualifyLeadInput,
  ImportLeadsCsvInput,
  ImportLeadsInput,
  ListLeadsQuery,
  QualifyLeadInput,
  UpdateLeadInput,
} from "./lead.validation";
import type { ConvertLeadInput } from "../contacts/contact.validation";

const buildLeadScopedWhere = (auth: AuthContext, where: Record<string, unknown>) => {
  const scoped = buildOrgScopedWhere(auth, where);
  if (!shouldScopeToOwner(auth.roles, auth.permissions)) return scoped;

  const contact = (scoped.contact as Record<string, unknown> | undefined) ?? {};
  return {
    ...scoped,
    contact: {
      ...contact,
      ownerId: auth.userId,
    },
  };
};

const buildListWhere = (query: ListLeadsQuery, auth: AuthContext) => {
  const search = query.search?.trim() ?? "";
  const now = new Date();

  return buildLeadScopedWhere(auth, {
    contact: {
      deletedAt: null,
      status: "LEAD",
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.leadSource ? { leadSource: query.leadSource } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    ...(query.stage ? { stage: query.stage } : {}),
    ...(query.rating ? { rating: query.rating } : {}),
    ...(query.minScore !== undefined ? { score: { gte: query.minScore } } : {}),
    ...(query.followUpDue
      ? {
          nextFollowUpAt: { lte: now },
          stage: { notIn: ["CONVERTED", "LOST"] },
        }
      : {}),
  });
};

const recordHistory = async (
  auth: AuthContext,
  leadId: string,
  action: Parameters<typeof leadRepository.addHistory>[0]["action"],
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await leadRepository.addHistory({
    organizationId,
    leadId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

const scoreLeadRecord = async (organizationId: string, leadId: string, contactId: string) => {
  const contact = await leadRepository.findContactForScoring(contactId);
  if (!contact) return null;

  const rules = await leadRepository.listScoreRules(organizationId);
  const score = calculateLeadScore(
    {
      status: contact.status,
      leadSource: contact.leadSource,
      jobTitle: contact.jobTitle,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
    },
    rules,
  );

  return leadRepository.update(leadId, {
    score,
    rating: scoreToRating(score),
    lastScoredAt: new Date(),
  });
};

export const leadService = {
  async listLeads(query: ListLeadsQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const skip = (query.page - 1) * query.pageSize;

    const [leads, total] = await Promise.all([
      leadRepository.findMany(where, skip, query.pageSize),
      leadRepository.count(where),
    ]);

    return {
      data: leads.map(mapLead),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getLeadById(id: string, auth: AuthContext) {
    const lead = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!lead) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    return mapLead(lead);
  },

  async getLeadHistory(id: string, auth: AuthContext) {
    const lead = await this.getLeadById(id, auth);
    const history = await leadRepository.listHistory(lead.id);
    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
      user: entry.user ? { id: entry.user.id, email: entry.user.email } : null,
    }));
  },

  async createLead(input: CreateLeadInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);

    const contact = await contactService.createContact(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.company,
        companyId: input.companyId,
        jobTitle: input.jobTitle,
        status: "LEAD",
        leadSource: input.leadSource,
        sourceDetail: input.sourceDetail,
        ownerId: input.ownerId,
        notes: input.notes,
        tagIds: input.tagIds,
        tagNames: input.tagNames,
      },
      auth,
    );

    const existingLead = await leadRepository.findByContactId(organizationId, contact.id);
    if (existingLead) return mapLead(existingLead);

    let lead = await leadRepository.create({
      organization: { connect: { id: organizationId } },
      contact: { connect: { id: contact.id } },
      stage: input.stage ?? "NEW",
      nextFollowUpAt: input.nextFollowUpAt,
    });

    const scored = await scoreLeadRecord(organizationId, lead.id, contact.id);
    if (scored) lead = scored;

    await recordHistory(auth, lead.id, "CREATED", {
      contactId: contact.id,
      stage: lead.stage,
    });

    await emitDomainEvent(organizationId, "lead.created", {
      leadId: lead.id,
      contactId: contact.id,
      userId: auth.userId,
    });

    return mapLead(lead);
  },

  async updateLead(id: string, input: UpdateLeadInput, auth: AuthContext) {
    const existing = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!existing) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.contact.ownerId);

    if (input.ownerId) {
      await contactService.updateContact(
        existing.contactId,
        { ownerId: input.ownerId },
        auth,
      );
      await recordHistory(auth, id, "ASSIGNED", { ownerId: input.ownerId });
    }

    const lead = await leadRepository.update(id, {
      stage: input.stage,
      nextFollowUpAt: input.nextFollowUpAt,
      qualificationNotes: input.qualificationNotes,
      lostReason: input.lostReason,
      ...(input.stage === "LOST" ? { lostAt: new Date() } : {}),
    });

    if (input.stage) {
      await recordHistory(auth, id, "STAGE_CHANGED", { stage: input.stage });
    }
    if (input.nextFollowUpAt !== undefined) {
      await recordHistory(auth, id, "FOLLOW_UP_SET", {
        nextFollowUpAt: input.nextFollowUpAt,
      });
    }

    const refreshed = await leadRepository.findById({ id });
    return mapLead(refreshed!);
  },

  async qualifyLead(id: string, input: QualifyLeadInput, auth: AuthContext) {
    const existing = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!existing) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.contact.ownerId);

    if (!isOpenLeadStage(existing.stage)) {
      throw new AppError(400, "Closed leads cannot be qualified", "INVALID_STAGE");
    }

    const lead = await leadRepository.update(id, {
      stage: "QUALIFIED",
      qualifiedAt: new Date(),
      qualificationNotes: input.qualificationNotes,
    });

    await recordHistory(auth, id, "QUALIFIED", {
      qualificationNotes: input.qualificationNotes,
    });

    return mapLead(lead);
  },

  async disqualifyLead(id: string, input: DisqualifyLeadInput, auth: AuthContext) {
    const existing = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!existing) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.contact.ownerId);

    const lead = await leadRepository.update(id, {
      stage: "LOST",
      lostAt: new Date(),
      lostReason: input.lostReason,
    });

    await contactService.updateContact(
      existing.contactId,
      { status: "INACTIVE" },
      auth,
    );

    await recordHistory(auth, id, "DISQUALIFIED", { lostReason: input.lostReason });
    return mapLead(lead);
  },

  async assignLead(id: string, input: AssignLeadInput, auth: AuthContext) {
    return this.updateLead(id, { ownerId: input.ownerId }, auth);
  },

  async scoreLead(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!existing) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");

    const lead = await scoreLeadRecord(organizationId, id, existing.contactId);
    if (!lead) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");

    await recordHistory(auth, id, "SCORED", { score: lead.score, rating: lead.rating });
    return mapLead(lead);
  },

  async convertLead(id: string, input: ConvertLeadInput, auth: AuthContext) {
    const existing = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!existing) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.contact.ownerId);

    const result = await contactService.convertLead(existing.contactId, input, auth);

    const lead = await leadRepository.update(id, {
      stage: "CONVERTED",
      convertedAt: new Date(),
    });

    await recordHistory(auth, id, "CONVERTED", {
      status: input.status,
      dealId: result.deal?.id ?? null,
    });

    return { lead: mapLead(lead), contact: result.contact, deal: result.deal };
  },

  async deleteLead(id: string, auth: AuthContext) {
    const existing = await leadRepository.findById(
      buildLeadScopedWhere(auth, { id, contact: { deletedAt: null } }),
    );
    if (!existing) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.contact.ownerId);
    await contactService.deleteContact(existing.contactId, auth);
  },

  async importLeads(input: ImportLeadsInput, auth: AuthContext) {
    const created = [];
    const skipped: Array<{ row: number; reason: string }> = [];
    const failed: Array<{ row: number; reason: string }> = [];

    for (let index = 0; index < input.rows.length; index += 1) {
      const row = input.rows[index];

      if (input.skipDuplicates && (row.email || row.phone)) {
        const duplicates = await contactService.checkDuplicates(
          {
            email: row.email,
            phone: row.phone,
            firstName: row.firstName,
            lastName: row.lastName,
            company: row.company,
          },
          auth,
        );
        if (duplicates.length) {
          skipped.push({ row: index + 1, reason: "Duplicate lead detected" });
          continue;
        }
      }

      try {
        const lead = await this.createLead(
          {
            ...row,
            leadSource: row.leadSource ?? "IMPORT",
            stage: row.stage ?? "NEW",
          },
          auth,
        );
        created.push(lead);
      } catch {
        failed.push({ row: index + 1, reason: "Could not create lead" });
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

  async importLeadsCsv(input: ImportLeadsCsvInput, auth: AuthContext) {
    const rows = parseCsvLeads(input.csv).filter((row) => row.firstName && row.lastName);
    if (!rows.length) {
      throw new AppError(400, "No valid lead rows found in CSV", "INVALID_CSV");
    }

    return this.importLeads(
      {
        rows: rows.map((row) => ({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          company: row.company,
          jobTitle: row.jobTitle,
          leadSource: row.leadSource as ImportLeadsInput["rows"][number]["leadSource"],
          notes: row.notes,
          stage: row.stage as ImportLeadsInput["rows"][number]["stage"],
        })),
        skipDuplicates: input.skipDuplicates,
      },
      auth,
    );
  },

  async exportLeads(query: ListLeadsQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const leads = await leadRepository.listForExport(where);
    const csv = leadsToCsv(
      leads.map((lead) => ({
        firstName: lead.contact.firstName,
        lastName: lead.contact.lastName,
        email: lead.contact.email ?? undefined,
        phone: lead.contact.phone ?? undefined,
        company: lead.contact.company ?? undefined,
        jobTitle: lead.contact.jobTitle ?? undefined,
        leadSource: lead.contact.leadSource ?? undefined,
        stage: lead.stage,
        notes: lead.contact.notes ?? undefined,
      })),
    );

    return { csv, count: leads.length };
  },
};
