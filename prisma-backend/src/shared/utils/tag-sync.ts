import { prisma } from "../../config/prisma";

export const tagRelationSelect = {
  tag: { select: { id: true, name: true, slug: true } },
};

export const mapTags = (
  entries: Array<{ tag: { id: string; name: string; slug: string } }>,
) => entries.map((entry) => ({ id: entry.tag.id, name: entry.tag.name, slug: entry.tag.slug }));

export const normalizeTagName = (name: string) => name.trim().toLowerCase();

export const slugifyTag = (name: string) =>
  normalizeTagName(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const ensureTags = async (storeId: string, tagNames: string[]) => {
  const unique = [...new Set(tagNames.map(normalizeTagName).filter(Boolean))];
  if (unique.length === 0) return [];

  const tags = await Promise.all(
    unique.map((name) => {
      const slug = slugifyTag(name);
      return prisma.tag.upsert({
        where: {
          storeId_slug: {
            storeId,
            slug,
          },
        },
        update: {},
        create: { storeId, name, slug },
        select: { id: true },
      });
    }),
  );

  return tags.map((tag) => tag.id);
};

export const syncProductTags = async (productId: string, tagIds: string[]) => {
  await prisma.$transaction([
    prisma.productTag.deleteMany({ where: { productId } }),
    ...(tagIds.length
      ? [
          prisma.productTag.createMany({
            data: tagIds.map((tagId) => ({ productId, tagId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
};
