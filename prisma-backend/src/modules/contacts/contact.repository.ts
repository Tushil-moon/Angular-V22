import type { ContactStatus, LeadSource, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { contactSelect } from "../../shared/utils/crm-mapper";

export type ContactRecord = Prisma.ContactGetPayload<{ select: typeof contactSelect }>;

const duplicateSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  emails: { select: { email: true } },
  phones: { select: { phone: true } },
} as const satisfies Prisma.ContactSelect;

export type DuplicateContactRecord = Prisma.ContactGetPayload<{ select: typeof duplicateSelect }>;

export const contactRepository = {
  findMany(where: Prisma.ContactWhereInput, skip: number, take: number) {
    return prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: contactSelect,
    });
  },

  count(where: Prisma.ContactWhereInput) {
    return prisma.contact.count({ where });
  },

  findById(where: Prisma.ContactWhereInput) {
    return prisma.contact.findFirst({
      where,
      select: contactSelect,
    });
  },

  findForDuplicateCheck(organizationId: string, excludeContactId?: string) {
    return prisma.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(excludeContactId ? { id: { not: excludeContactId } } : {}),
      },
      select: duplicateSelect,
    });
  },

  findByEmailOrPhone(organizationId: string, email?: string, phone?: string) {
    if (!email && !phone) return Promise.resolve([]);

    return prisma.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          ...(email ? [{ email }, { emails: { some: { email } } }] : []),
          ...(phone ? [{ phone }, { phones: { some: { phone } } }] : []),
        ],
      },
      select: duplicateSelect,
    });
  },

  create(data: Prisma.ContactCreateInput) {
    return prisma.contact.create({ data, select: contactSelect });
  },

  update(id: string, data: Prisma.ContactUpdateInput) {
    return prisma.contact.update({ where: { id }, data, select: contactSelect });
  },

  softDelete(id: string) {
    return prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  replaceEmails(contactId: string, emails: Array<{ email: string; type: string; isPrimary: boolean }>) {
    return prisma.$transaction([
      prisma.contactEmail.deleteMany({ where: { contactId } }),
      ...(emails.length
        ? [
            prisma.contactEmail.createMany({
              data: emails.map((entry) => ({
                contactId,
                email: entry.email,
                type: entry.type as Prisma.ContactEmailCreateManyInput["type"],
                isPrimary: entry.isPrimary,
              })),
            }),
          ]
        : []),
    ]);
  },

  replacePhones(contactId: string, phones: Array<{ phone: string; type: string; isPrimary: boolean }>) {
    return prisma.$transaction([
      prisma.contactPhone.deleteMany({ where: { contactId } }),
      ...(phones.length
        ? [
            prisma.contactPhone.createMany({
              data: phones.map((entry) => ({
                contactId,
                phone: entry.phone,
                type: entry.type as Prisma.ContactPhoneCreateManyInput["type"],
                isPrimary: entry.isPrimary,
              })),
            }),
          ]
        : []),
    ]);
  },

  replaceAddresses(
    contactId: string,
    addresses: Array<{
      label?: string | null;
      line1: string;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      type: string;
      isPrimary: boolean;
    }>,
  ) {
    return prisma.$transaction([
      prisma.contactAddress.deleteMany({ where: { contactId } }),
      ...(addresses.length
        ? [
            prisma.contactAddress.createMany({
              data: addresses.map((entry) => ({
                contactId,
                label: entry.label ?? undefined,
                line1: entry.line1,
                line2: entry.line2 ?? undefined,
                city: entry.city ?? undefined,
                state: entry.state ?? undefined,
                postalCode: entry.postalCode ?? undefined,
                country: entry.country ?? undefined,
                type: entry.type as Prisma.ContactAddressCreateManyInput["type"],
                isPrimary: entry.isPrimary,
              })),
            }),
          ]
        : []),
    ]);
  },

  replaceSocialLinks(
    contactId: string,
    links: Array<{ platform: string; url: string }>,
  ) {
    return prisma.$transaction([
      prisma.contactSocialLink.deleteMany({ where: { contactId } }),
      ...(links.length
        ? [
            prisma.contactSocialLink.createMany({
              data: links.map((entry) => ({
                contactId,
                platform: entry.platform as Prisma.ContactSocialLinkCreateManyInput["platform"],
                url: entry.url,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  },

  mergeContacts(primaryId: string, sourceIds: string[]) {
    return prisma.$transaction(async (tx) => {
      for (const sourceId of sourceIds) {
        await tx.deal.updateMany({ where: { contactId: sourceId }, data: { contactId: primaryId } });
        await tx.activity.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });
        await tx.calendarEvent.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });
        await tx.case.updateMany({ where: { contactId: sourceId }, data: { contactId: primaryId } });
        await tx.formSubmission.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });
        await tx.campaignMember.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });

        const sourceTags = await tx.contactTag.findMany({ where: { contactId: sourceId } });
        for (const tag of sourceTags) {
          await tx.contactTag.upsert({
            where: { contactId_tagId: { contactId: primaryId, tagId: tag.tagId } },
            create: { contactId: primaryId, tagId: tag.tagId },
            update: {},
          });
        }

        await tx.contactEmail.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });
        await tx.contactPhone.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });
        await tx.contactAddress.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });
        await tx.contactSocialLink.updateMany({
          where: { contactId: sourceId },
          data: { contactId: primaryId },
        });

        await tx.contact.update({
          where: { id: sourceId },
          data: { deletedAt: new Date() },
        });
      }

      return tx.contact.findUniqueOrThrow({ where: { id: primaryId }, select: contactSelect });
    });
  },

  listForExport(where: Prisma.ContactWhereInput) {
    return prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        jobTitle: true,
        status: true,
        leadSource: true,
        notes: true,
      },
    });
  },

  createImportBatch(
    organizationId: string,
    ownerId: string,
    rows: Array<{
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      company?: string;
      jobTitle?: string;
      status?: ContactStatus;
      notes?: string;
      leadSource?: LeadSource;
    }>,
  ) {
    return prisma.$transaction(async (tx) => {
      const created = [];
      for (const row of rows) {
        const contact = await tx.contact.create({
          data: {
            organizationId,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            company: row.company,
            jobTitle: row.jobTitle,
            status: row.status ?? "LEAD",
            notes: row.notes,
            leadSource: row.leadSource ?? "IMPORT",
            ownerId,
          },
          select: contactSelect,
        });

        if (row.email) {
          await tx.contactEmail.create({
            data: { contactId: contact.id, email: row.email, isPrimary: true },
          });
        }
        if (row.phone) {
          await tx.contactPhone.create({
            data: { contactId: contact.id, phone: row.phone, isPrimary: true },
          });
        }

        created.push(contact);
      }
      return created;
    });
  },
};
