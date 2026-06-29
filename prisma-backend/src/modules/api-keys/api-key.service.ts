import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { randomToken, sha256 } from "../../shared/utils/crypto";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateApiKeyInput, ListApiKeysQuery } from "./api-key.validation";

const apiKeySelect = {
  id: true,
  organizationId: true,
  name: true,
  prefix: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const apiKeyService = {
  async listApiKeys(query: ListApiKeysQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = { organizationId };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.apiKey.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: query.pageSize, select: apiKeySelect }),
      prisma.apiKey.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getApiKeyById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.apiKey.findFirst({ where: { id, organizationId }, select: apiKeySelect });
    if (!item) throw new AppError(404, "API key not found", "API_KEY_NOT_FOUND");
    return item;
  },

  async createApiKey(input: CreateApiKeyInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const rawKey = `crm_${randomToken(32)}`;
    const prefix = rawKey.slice(0, 12);
    const keyHash = sha256(rawKey);
    const item = await prisma.apiKey.create({
      data: { organizationId, name: input.name, keyHash, prefix, expiresAt: input.expiresAt },
      select: apiKeySelect,
    });
    return { ...item, key: rawKey };
  },

  async deleteApiKey(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.apiKey.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "API key not found", "API_KEY_NOT_FOUND");
    await prisma.apiKey.delete({ where: { id } });
  },
};
