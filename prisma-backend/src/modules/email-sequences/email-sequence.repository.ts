import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { emailSequenceSelect } from "../../shared/utils/marketing-mapper";

export const emailSequenceRepository = {
  findMany(where: Prisma.EmailSequenceWhereInput, skip: number, take: number) {
    return prisma.emailSequence.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: emailSequenceSelect,
    });
  },

  count(where: Prisma.EmailSequenceWhereInput) {
    return prisma.emailSequence.count({ where });
  },

  findById(where: Prisma.EmailSequenceWhereInput) {
    return prisma.emailSequence.findFirst({ where, select: emailSequenceSelect });
  },

  create(data: Prisma.EmailSequenceCreateInput) {
    return prisma.emailSequence.create({ data, select: emailSequenceSelect });
  },

  update(id: string, data: Prisma.EmailSequenceUpdateInput) {
    return prisma.emailSequence.update({ where: { id }, data, select: emailSequenceSelect });
  },

  delete(id: string) {
    return prisma.emailSequence.delete({ where: { id } });
  },

  replaceSteps(sequenceId: string, steps: Prisma.SequenceStepCreateManyInput[]) {
    return prisma.$transaction([
      prisma.sequenceStep.deleteMany({ where: { sequenceId } }),
      ...(steps.length ? [prisma.sequenceStep.createMany({ data: steps })] : []),
    ]);
  },
};
