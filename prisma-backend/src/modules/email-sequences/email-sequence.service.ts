import { AppError } from "../../shared/errors/app-error";
import { mapEmailSequence } from "../../shared/utils/marketing-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { emailSequenceRepository } from "./email-sequence.repository";
import { buildEmailSequenceListWhere, normalizeSequenceSteps } from "./email-sequence.utils";
import type {
  CreateEmailSequenceInput,
  ListEmailSequencesQuery,
  UpdateEmailSequenceInput,
} from "./email-sequence.validation";

export const emailSequenceService = {
  async listSequences(query: ListEmailSequencesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildEmailSequenceListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      emailSequenceRepository.findMany(where, skip, query.pageSize),
      emailSequenceRepository.count(where),
    ]);
    return { data: data.map(mapEmailSequence), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getSequenceById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await emailSequenceRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Email sequence not found", "EMAIL_SEQUENCE_NOT_FOUND");
    return mapEmailSequence(item);
  },

  async createSequence(input: CreateEmailSequenceInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const steps = normalizeSequenceSteps(input.steps ?? []);

    const item = await emailSequenceRepository.create({
      organization: { connect: { id: organizationId } },
      name: input.name,
      description: input.description,
      active: input.active ?? true,
      ...(steps.length
        ? {
            steps: {
              create: steps.map((step) => ({
                order: step.order,
                delayDays: step.delayDays,
                template: { connect: { id: step.templateId } },
              })),
            },
          }
        : {}),
    });

    return mapEmailSequence(item);
  },

  async updateSequence(id: string, input: UpdateEmailSequenceInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await emailSequenceRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Email sequence not found", "EMAIL_SEQUENCE_NOT_FOUND");

    if (input.steps !== undefined) {
      const steps = normalizeSequenceSteps(input.steps);
      await emailSequenceRepository.replaceSteps(
        id,
        steps.map((step) => ({ sequenceId: id, ...step })),
      );
    }

    await emailSequenceRepository.update(id, {
      name: input.name,
      description: input.description === null ? null : input.description,
      active: input.active,
    });

    const refreshed = await emailSequenceRepository.findById({ id, organizationId });
    return mapEmailSequence(refreshed!);
  },

  async deleteSequence(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await emailSequenceRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Email sequence not found", "EMAIL_SEQUENCE_NOT_FOUND");
    await emailSequenceRepository.delete(id);
  },
};
