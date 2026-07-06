import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { emailTemplateSelect } from "../../shared/utils/marketing-mapper";

export const emailTemplateRepository = {
  findMany(where: Prisma.EmailTemplateWhereInput, skip: number, take: number) {
    return prisma.emailTemplate.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: emailTemplateSelect,
    });
  },

  count(where: Prisma.EmailTemplateWhereInput) {
    return prisma.emailTemplate.count({ where });
  },

  findById(where: Prisma.EmailTemplateWhereInput) {
    return prisma.emailTemplate.findFirst({ where, select: emailTemplateSelect });
  },

  create(data: Prisma.EmailTemplateCreateInput) {
    return prisma.emailTemplate.create({ data, select: emailTemplateSelect });
  },

  update(id: string, data: Prisma.EmailTemplateUpdateInput) {
    return prisma.emailTemplate.update({ where: { id }, data, select: emailTemplateSelect });
  },

  delete(id: string) {
    return prisma.emailTemplate.delete({ where: { id } });
  },
};
