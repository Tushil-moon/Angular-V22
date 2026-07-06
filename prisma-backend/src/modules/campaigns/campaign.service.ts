import type { CampaignHistoryAction, CampaignStatus, Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapCampaign, mapCampaignHistoryEntry } from "../../shared/utils/marketing-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { campaignRepository } from "./campaign.repository";
import { assertCampaignTransition, buildCampaignListWhere } from "./campaign.utils";
import type {
  AddCampaignMembersInput,
  CreateCampaignInput,
  ListCampaignsQuery,
  RemoveCampaignMemberInput,
  UpdateCampaignInput,
} from "./campaign.validation";

const recordHistory = async (
  auth: AuthContext,
  campaignId: string,
  action: CampaignHistoryAction,
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await campaignRepository.addHistory({
    organizationId,
    campaignId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

export const campaignService = {
  async listCampaigns(query: ListCampaignsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildCampaignListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      campaignRepository.findMany(where, skip, query.pageSize),
      campaignRepository.count(where),
    ]);

    return { data: data.map(mapCampaign), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getCampaignById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await campaignRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    return mapCampaign(item);
  },

  async createCampaign(input: CreateCampaignInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await campaignRepository.create({
      organization: { connect: { id: organizationId } },
      name: input.name,
      description: input.description,
      type: input.type,
      status: input.status ?? "DRAFT",
      budget: input.budget,
      startDate: input.startDate,
      endDate: input.endDate,
      owner: input.ownerId
        ? { connect: { id: input.ownerId } }
        : auth.userId
          ? { connect: { id: auth.userId } }
          : undefined,
      emailTemplate: input.emailTemplateId ? { connect: { id: input.emailTemplateId } } : undefined,
      emailSequence: input.emailSequenceId ? { connect: { id: input.emailSequenceId } } : undefined,
    });

    await recordHistory(auth, item.id, "CREATED");
    return mapCampaign(item);
  },

  async updateCampaign(id: string, input: UpdateCampaignInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await campaignRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");

    if (input.status && input.status !== existing.status) {
      try {
        assertCampaignTransition(existing.status, input.status);
      } catch {
        throw new AppError(409, "Invalid campaign status transition", "CAMPAIGN_INVALID_TRANSITION");
      }
    }

    await campaignRepository.update(id, {
      name: input.name,
      description: input.description === null ? null : input.description,
      type: input.type,
      status: input.status,
      budget: input.budget === null ? null : input.budget,
      startDate: input.startDate === null ? null : input.startDate,
      endDate: input.endDate === null ? null : input.endDate,
      activatedAt:
        input.status === "ACTIVE" && existing.status !== "ACTIVE" ? new Date() : undefined,
      completedAt:
        input.status === "COMPLETED" && existing.status !== "COMPLETED" ? new Date() : undefined,
      owner:
        input.ownerId === null
          ? { disconnect: true }
          : input.ownerId
            ? { connect: { id: input.ownerId } }
            : undefined,
      emailTemplate:
        input.emailTemplateId === null
          ? { disconnect: true }
          : input.emailTemplateId
            ? { connect: { id: input.emailTemplateId } }
            : undefined,
      emailSequence:
        input.emailSequenceId === null
          ? { disconnect: true }
          : input.emailSequenceId
            ? { connect: { id: input.emailSequenceId } }
            : undefined,
    });

    if (input.status && input.status !== existing.status) {
      await recordHistory(auth, id, input.status === "ACTIVE" ? "ACTIVATED" : "UPDATED", {
        from: existing.status,
        to: input.status,
      });
    } else {
      await recordHistory(auth, id, "UPDATED");
    }

    const refreshed = await campaignRepository.findById({ id, organizationId });
    return mapCampaign(refreshed!);
  },

  async deleteCampaign(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await campaignRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    await campaignRepository.delete(id);
  },

  async activateCampaign(id: string, auth: AuthContext) {
    return this.updateCampaign(id, { status: "ACTIVE" as CampaignStatus }, auth);
  },

  async completeCampaign(id: string, auth: AuthContext) {
    const result = await this.updateCampaign(id, { status: "COMPLETED" as CampaignStatus }, auth);
    await recordHistory(auth, id, "COMPLETED");
    return result;
  },

  async addMembers(id: string, input: AddCampaignMembersInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await campaignRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");

    await campaignRepository.addMembers(id, input.contactIds);
    await recordHistory(auth, id, "MEMBER_ADDED", { count: input.contactIds.length });
    const refreshed = await campaignRepository.findById({ id, organizationId });
    return mapCampaign(refreshed!);
  },

  async removeMember(id: string, input: RemoveCampaignMemberInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await campaignRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");

    await campaignRepository.removeMember(id, input.contactId);
    await recordHistory(auth, id, "MEMBER_REMOVED", { contactId: input.contactId });
    const refreshed = await campaignRepository.findById({ id, organizationId });
    return mapCampaign(refreshed!);
  },

  async sendCampaign(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await campaignRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    if (existing.status !== "ACTIVE") {
      throw new AppError(409, "Only active campaigns can be sent", "CAMPAIGN_NOT_ACTIVE");
    }
    if (!existing.emailTemplateId && existing.type === "EMAIL") {
      throw new AppError(400, "Email template required for email campaigns", "CAMPAIGN_NO_TEMPLATE");
    }

    const pendingCount = existing.members.filter((member) => member.status === "PENDING").length;
    if (!pendingCount) {
      throw new AppError(400, "No pending members to send to", "CAMPAIGN_NO_MEMBERS");
    }

    await campaignRepository.markMembersSent(id);
    await campaignRepository.update(id, {
      sentCount: { increment: pendingCount },
    });

    await recordHistory(auth, id, "EMAIL_SENT", { count: pendingCount });
    const refreshed = await campaignRepository.findById({ id, organizationId });
    return mapCampaign(refreshed!);
  },

  async listHistory(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await campaignRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    const history = await campaignRepository.listHistory(id);
    return history.map(mapCampaignHistoryEntry);
  },
};
