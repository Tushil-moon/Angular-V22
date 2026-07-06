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
import { contactRepository } from "./contact.repository";
import {
  contactsToCsv,
  normalizeEmail,
  normalizePhone,
  parseCsvContacts,
  pickPrimaryEmail,
  pickPrimaryPhone,
  scoreDuplicate,
} from "./contact.utils";
import type {
  CheckDuplicatesInput,
  ConvertLeadInput,
  CreateContactInput,
  ImportContactsCsvInput,
  ImportContactsInput,
  ListContactsQuery,
  MergeContactsInput,
  UpdateContactInput,
} from "./contact.validation";

const resolveTagIds = async (auth: AuthContext, tagIds?: string[], tagNames?: string[]) => {
  const organizationId = requireOrganizationContext(auth);
  const ids = [...(tagIds ?? [])];
  if (tagNames?.length) {
    ids.push(...(await ensureTags(organizationId, tagNames)));
  }
  return [...new Set(ids)];
};

const buildListWhere = (query: ListContactsQuery, auth: AuthContext) => {
  const search = query.search?.trim() ?? "";
  return buildOwnerScopedWhere(auth, {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.companyId ? { companyId: query.companyId } : {}),
    ...(query.leadSource ? { leadSource: query.leadSource } : {}),
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
            { emails: { some: { email: { contains: search, mode: "insensitive" as const } } } },
            { phones: { some: { phone: { contains: search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  });
};

const normalizeChannelInputs = (input: CreateContactInput | UpdateContactInput) => {
  const emails =
    input.emails?.map((entry, index) => ({
      email: normalizeEmail(entry.email) ?? entry.email,
      type: entry.type ?? "WORK",
      isPrimary: entry.isPrimary ?? index === 0,
    })) ?? [];

  if (!emails.length && input.email) {
    const email = normalizeEmail(input.email);
    if (email) emails.push({ email, type: "WORK", isPrimary: true });
  }

  const phones =
    input.phones?.map((entry, index) => ({
      phone: entry.phone.trim(),
      type: entry.type ?? "MOBILE",
      isPrimary: entry.isPrimary ?? index === 0,
    })) ?? [];

  if (!phones.length && input.phone?.trim()) {
    phones.push({ phone: input.phone.trim(), type: "MOBILE", isPrimary: true });
  }

  return {
    emails,
    phones,
    addresses:
      input.addresses?.map((entry, index) => ({
        ...entry,
        type: entry.type ?? "WORK",
        isPrimary: entry.isPrimary ?? index === 0,
      })) ?? [],
    socialLinks: input.socialLinks ?? [],
  };
};

const persistContactChannels = async (
  contactId: string,
  channels: ReturnType<typeof normalizeChannelInputs>,
) => {
  await contactRepository.replaceEmails(contactId, channels.emails);
  await contactRepository.replacePhones(contactId, channels.phones);
  await contactRepository.replaceAddresses(contactId, channels.addresses);
  await contactRepository.replaceSocialLinks(contactId, channels.socialLinks);

  await contactRepository.update(contactId, {
    email: pickPrimaryEmail(channels.emails),
    phone: pickPrimaryPhone(channels.phones),
  });
};

export const contactService = {
  async listContacts(query: ListContactsQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const skip = (query.page - 1) * query.pageSize;

    const [contacts, total] = await Promise.all([
      contactRepository.findMany(where, skip, query.pageSize),
      contactRepository.count(where),
    ]);

    return {
      data: contacts.map(mapContact),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getContactById(id: string, auth: AuthContext) {
    const contact = await contactRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    return mapContact(contact);
  },

  async createContact(input: CreateContactInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const tagIds = await resolveTagIds(auth, input.tagIds, input.tagNames);
    const channels = normalizeChannelInputs(input);

    const contact = await prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          organizationId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: pickPrimaryEmail(channels.emails),
          phone: pickPrimaryPhone(channels.phones),
          company: input.company?.trim() || undefined,
          companyId: input.companyId,
          jobTitle: input.jobTitle?.trim() || undefined,
          status: input.status ?? "LEAD",
          leadSource: input.leadSource,
          sourceDetail: input.sourceDetail?.trim() || undefined,
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

      return created;
    });

    await persistContactChannels(contact.id, channels);
    const refreshed = await contactRepository.findById({ id: contact.id });
    return mapContact(refreshed!);
  },

  async updateContact(id: string, input: UpdateContactInput, auth: AuthContext) {
    const existing = await contactRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    const tagIds =
      input.tagIds !== undefined || input.tagNames !== undefined
        ? await resolveTagIds(auth, input.tagIds, input.tagNames)
        : undefined;

    const channels =
      input.emails !== undefined ||
      input.phones !== undefined ||
      input.addresses !== undefined ||
      input.socialLinks !== undefined ||
      input.email !== undefined ||
      input.phone !== undefined
        ? normalizeChannelInputs(input)
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: {
          firstName: input.firstName?.trim(),
          lastName: input.lastName?.trim(),
          email:
            channels !== null ? pickPrimaryEmail(channels.emails) : normalizeEmail(input.email),
          phone: channels !== null ? pickPrimaryPhone(channels.phones) : input.phone?.trim(),
          company: input.company?.trim(),
          companyId: input.companyId,
          jobTitle: input.jobTitle?.trim(),
          status: input.status,
          leadSource: input.leadSource,
          sourceDetail: input.sourceDetail?.trim(),
          ownerId: input.ownerId,
          notes: input.notes?.trim(),
        },
      });

      if (tagIds !== undefined) {
        await syncContactTags(id, tagIds);
      }
    });

    if (channels) {
      await persistContactChannels(id, channels);
    }

    const refreshed = await contactRepository.findById({ id });
    return mapContact(refreshed!);
  },

  async convertLead(id: string, input: ConvertLeadInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await contactRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
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
    const existing = await contactRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!existing) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);
    await contactRepository.softDelete(id);
  },

  async checkDuplicates(input: CheckDuplicatesInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const candidates = await contactRepository.findForDuplicateCheck(
      organizationId,
      input.excludeContactId,
    );

    const matches = candidates
      .map((candidate) => scoreDuplicate(candidate, input))
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .sort((left, right) => right.score - left.score);

    const contactIds = matches.map((match) => match.contactId);
    const contacts = contactIds.length
      ? await contactRepository.findMany({ id: { in: contactIds } }, 0, contactIds.length)
      : [];

    const contactMap = new Map(contacts.map((contact) => [contact.id, mapContact(contact)]));

    return matches.map((match) => ({
      ...match,
      contact: contactMap.get(match.contactId) ?? null,
    }));
  },

  async findDuplicatesForContact(id: string, auth: AuthContext) {
    const contact = await this.getContactById(id, auth);
    return this.checkDuplicates(
      {
        email: contact.email ?? undefined,
        phone: contact.phone ?? undefined,
        firstName: contact.firstName,
        lastName: contact.lastName,
        company: contact.company ?? undefined,
        excludeContactId: contact.id,
      },
      auth,
    );
  },

  async mergeContacts(id: string, input: MergeContactsInput, auth: AuthContext) {
    const primary = await contactRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!primary) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, primary.ownerId);

    const sourceIds = [...new Set(input.sourceContactIds.filter((sourceId) => sourceId !== id))];
    if (!sourceIds.length) {
      throw new AppError(400, "At least one source contact is required", "INVALID_MERGE");
    }

    for (const sourceId of sourceIds) {
      const source = await contactRepository.findById(
        buildOwnerScopedWhere(auth, { id: sourceId, deletedAt: null }),
      );
      if (!source) {
        throw new AppError(404, "Source contact not found", "CONTACT_NOT_FOUND");
      }
      assertRecordOwnerAccess(auth, source.ownerId);
    }

    const merged = await contactRepository.mergeContacts(id, sourceIds);
    return mapContact(merged);
  },

  async importContacts(input: ImportContactsInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const ownerId = auth.userId;
    const created: ReturnType<typeof mapContact>[] = [];
    const skipped: Array<{ row: number; reason: string }> = [];
    const failed: Array<{ row: number; reason: string }> = [];

    for (let index = 0; index < input.rows.length; index += 1) {
      const row = input.rows[index];
      const email = normalizeEmail(row.email);
      const phone = normalizePhone(row.phone);

      if (input.skipDuplicates && (email || phone)) {
        const duplicates = await this.checkDuplicates(
          {
            email,
            phone,
            firstName: row.firstName,
            lastName: row.lastName,
            company: row.company,
          },
          auth,
        );
        if (duplicates.length) {
          skipped.push({ row: index + 1, reason: "Duplicate contact detected" });
          continue;
        }
      }

      try {
        const [contact] = await contactRepository.createImportBatch(organizationId, ownerId, [
          {
            firstName: row.firstName,
            lastName: row.lastName,
            email,
            phone: row.phone?.trim(),
            company: row.company?.trim(),
            jobTitle: row.jobTitle?.trim(),
            status: row.status,
            notes: row.notes?.trim(),
            leadSource: row.leadSource ?? "IMPORT",
          },
        ]);
        created.push(mapContact(contact));
      } catch {
        failed.push({ row: index + 1, reason: "Could not create contact" });
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

  async importContactsCsv(input: ImportContactsCsvInput, auth: AuthContext) {
    const rows = parseCsvContacts(input.csv).filter((row) => row.firstName && row.lastName);
    if (!rows.length) {
      throw new AppError(400, "No valid contact rows found in CSV", "INVALID_CSV");
    }

    return this.importContacts(
      {
        rows: rows.map((row) => ({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          company: row.company,
          jobTitle: row.jobTitle,
          status: row.status as ImportContactsInput["rows"][number]["status"],
          notes: row.notes,
          leadSource: row.leadSource as ImportContactsInput["rows"][number]["leadSource"],
        })),
        skipDuplicates: input.skipDuplicates,
      },
      auth,
    );
  },

  async exportContacts(query: ListContactsQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const contacts = await contactRepository.listForExport(where);
    const csv = contactsToCsv(
      contacts.map((contact) => ({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? undefined,
        phone: contact.phone ?? undefined,
        company: contact.company ?? undefined,
        jobTitle: contact.jobTitle ?? undefined,
        status: contact.status,
        leadSource: contact.leadSource ?? undefined,
        notes: contact.notes ?? undefined,
      })),
    );

    return { csv, count: contacts.length };
  },
};
