import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { contactSelect, dealSelect, mapContact, mapDeal } from "../../shared/utils/crm-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertRecordOwnerAccess,
  buildOwnerScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { ensureTags, syncContactTags } from "../../shared/utils/tag-sync";
import type {
  ConvertLeadInput,
  CreateContactInput,
  ListContactsQuery,
  UpdateContactInput,
} from "./contact.validation";

const normalizeEmail = (email?: string) => {
  const trimmed = email?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
};

const resolveTagIds = async (auth: AuthContext, tagIds?: string[], tagNames?: string[]) => {
  const organizationId = requireOrganizationContext(auth);
  const ids = [...(tagIds ?? [])];
  if (tagNames?.length) {
    ids.push(...(await ensureTags(organizationId, tagNames)));
  }
  return [...new Set(ids)];
};

export const contactService = {
  async listContacts(query: ListContactsQuery, auth: AuthContext) {
    const search = query.search?.trim() ?? "";
    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { companyRef: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    });

    const skip = (query.page - 1) * query.pageSize;

    const [contacts, total] = await prisma.$transaction([
      prisma.contact.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.pageSize,
        select: contactSelect,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      data: contacts.map(mapContact),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getContactById(id: string, auth: AuthContext) {
    const contact = await prisma.contact.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
      select: contactSelect,
    });

    if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    return mapContact(contact);
  },

  async createContact(input: CreateContactInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const tagIds = await resolveTagIds(auth, input.tagIds, input.tagNames);

    const contact = await prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          organizationId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: normalizeEmail(input.email),
          phone: input.phone?.trim() || undefined,
          company: input.company?.trim() || undefined,
          companyId: input.companyId,
          jobTitle: input.jobTitle?.trim() || undefined,
          status: input.status ?? "LEAD",
          ownerId: input.ownerId ?? auth.userId,
          notes: input.notes?.trim() || undefined,
        },
        select: contactSelect,
      });

      if (tagIds.length) {
        await tx.contactTag.createMany({
          data: tagIds.map((tagId) => ({ contactId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      return tx.contact.findUniqueOrThrow({ where: { id: created.id }, select: contactSelect });
    });

    return mapContact(contact);
  },

  async updateContact(id: string, input: UpdateContactInput, auth: AuthContext) {
    const existing = await prisma.contact.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });
    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    const tagIds =
      input.tagIds !== undefined || input.tagNames !== undefined
        ? await resolveTagIds(auth, input.tagIds, input.tagNames)
        : undefined;

    const contact = await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: {
          firstName: input.firstName?.trim(),
          lastName: input.lastName?.trim(),
          email: input.email !== undefined ? normalizeEmail(input.email) : undefined,
          phone: input.phone?.trim(),
          company: input.company?.trim(),
          companyId: input.companyId,
          jobTitle: input.jobTitle?.trim(),
          status: input.status,
          ownerId: input.ownerId,
          notes: input.notes?.trim(),
        },
      });

      if (tagIds !== undefined) {
        await syncContactTags(id, tagIds);
      }

      return tx.contact.findUniqueOrThrow({ where: { id }, select: contactSelect });
    });

    return mapContact(contact);
  },

  async convertLead(id: string, input: ConvertLeadInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.contact.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });
    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    if (existing.status !== "LEAD") {
      throw new AppError(400, "Only leads can be converted", "INVALID_STATUS");
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: { status: input.status },
      });

      let deal = null;
      if (input.deal) {
        const createdDeal = await tx.deal.create({
          data: {
            organizationId,
            title: input.deal.title.trim(),
            value: input.deal.value,
            currency: input.deal.currency ?? "USD",
            stage: input.deal.stage ?? "QUALIFIED",
            contactId: id,
            ownerId: existing.ownerId ?? auth.userId,
          },
          select: dealSelect,
        });
        deal = mapDeal(createdDeal);
      }

      const contact = await tx.contact.findUniqueOrThrow({ where: { id }, select: contactSelect });
      return { contact: mapContact(contact), deal };
    });

    return result;
  },

  async deleteContact(id: string, auth: AuthContext) {
    const existing = await prisma.contact.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });
    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);
    await prisma.contact.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
