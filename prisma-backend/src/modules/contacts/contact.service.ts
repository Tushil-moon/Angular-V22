import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { contactSelect, mapContact } from "../../shared/utils/crm-mapper";
import type { CreateContactInput, ListContactsQuery, UpdateContactInput } from "./contact.validation";

const normalizeEmail = (email?: string) => {
  const trimmed = email?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
};

export const contactService = {
  async listContacts(query: ListContactsQuery) {
    const search = query.search?.trim() ?? "";
    const where = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
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
    };

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

  async getContactById(id: string) {
    const contact = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
      select: contactSelect,
    });

    if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");

    return mapContact(contact);
  },

  async createContact(input: CreateContactInput, actorId: string) {
    const contact = await prisma.contact.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: normalizeEmail(input.email),
        phone: input.phone?.trim() || undefined,
        company: input.company?.trim() || undefined,
        jobTitle: input.jobTitle?.trim() || undefined,
        status: input.status ?? "LEAD",
        ownerId: input.ownerId ?? actorId,
        notes: input.notes?.trim() || undefined,
      },
      select: contactSelect,
    });

    return mapContact(contact);
  },

  async updateContact(id: string, input: UpdateContactInput) {
    const existing = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName: input.firstName?.trim(),
        lastName: input.lastName?.trim(),
        email: input.email !== undefined ? normalizeEmail(input.email) : undefined,
        phone: input.phone?.trim(),
        company: input.company?.trim(),
        jobTitle: input.jobTitle?.trim(),
        status: input.status,
        ownerId: input.ownerId,
        notes: input.notes?.trim(),
      },
      select: contactSelect,
    });

    return mapContact(contact);
  },

  async deleteContact(id: string) {
    const existing = await prisma.contact.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
