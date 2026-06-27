import { prisma } from "../../config/prisma";

export const tagRelationSelect = {
  tag: { select: { id: true, name: true, color: true } },
};

export const mapTags = (
  entries: Array<{ tag: { id: string; name: string; color: string } }>,
) => entries.map((entry) => ({ id: entry.tag.id, name: entry.tag.name, color: entry.tag.color }));

export const normalizeTagName = (name: string) => name.trim().toLowerCase();

export const ensureTags = async (organizationId: string, tagNames: string[]) => {
  const unique = [...new Set(tagNames.map(normalizeTagName).filter(Boolean))];
  if (unique.length === 0) return [];

  const tags = await Promise.all(
    unique.map((name) =>
      prisma.tag.upsert({
        where: {
          organizationId_name: {
            organizationId,
            name,
          },
        },
        update: {},
        create: { organizationId, name },
        select: { id: true },
      }),
    ),
  );

  return tags.map((tag) => tag.id);
};

export const syncContactTags = async (contactId: string, tagIds: string[]) => {
  await prisma.$transaction([
    prisma.contactTag.deleteMany({ where: { contactId } }),
    ...(tagIds.length
      ? [
          prisma.contactTag.createMany({
            data: tagIds.map((tagId) => ({ contactId, tagId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
};

export const syncDealTags = async (dealId: string, tagIds: string[]) => {
  await prisma.$transaction([
    prisma.dealTag.deleteMany({ where: { dealId } }),
    ...(tagIds.length
      ? [
          prisma.dealTag.createMany({
            data: tagIds.map((tagId) => ({ dealId, tagId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
};
