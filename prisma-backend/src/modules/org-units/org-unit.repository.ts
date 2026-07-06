import type { OrgUnitType, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";

export const orgUnitSelect = {
  id: true,
  organizationId: true,
  parentId: true,
  type: true,
  name: true,
  code: true,
  description: true,
  managerUserId: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.OrgUnitSelect;

export type OrgUnitRecord = Prisma.OrgUnitGetPayload<{ select: typeof orgUnitSelect }>;

export const orgUnitRepository = {
  findById(organizationId: string, id: string) {
    return prisma.orgUnit.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: orgUnitSelect,
    });
  },

  listByOrganization(organizationId: string) {
    return prisma.orgUnit.findMany({
      where: { organizationId, deletedAt: null },
      select: orgUnitSelect,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  },

  create(data: Prisma.OrgUnitCreateInput) {
    return prisma.orgUnit.create({ data, select: orgUnitSelect });
  },

  update(id: string, data: Prisma.OrgUnitUpdateInput) {
    return prisma.orgUnit.update({ where: { id }, data, select: orgUnitSelect });
  },

  softDelete(id: string) {
    return prisma.orgUnit.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: orgUnitSelect,
    });
  },

  listMembers(orgUnitId: string) {
    return prisma.orgUnitMember.findMany({
      where: { orgUnitId },
      include: {
        user: { select: { id: true, email: true, status: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  },

  findMember(orgUnitId: string, userId: string) {
    return prisma.orgUnitMember.findUnique({
      where: { orgUnitId_userId: { orgUnitId, userId } },
    });
  },

  addMember(data: {
    organizationId: string;
    orgUnitId: string;
    userId: string;
    isPrimary?: boolean;
    title?: string;
  }) {
    return prisma.orgUnitMember.create({
      data,
      include: {
        user: { select: { id: true, email: true, status: true } },
      },
    });
  },

  removeMember(orgUnitId: string, userId: string) {
    return prisma.orgUnitMember.delete({
      where: { orgUnitId_userId: { orgUnitId, userId } },
    });
  },

  clearPrimaryForUser(organizationId: string, userId: string) {
    return prisma.orgUnitMember.updateMany({
      where: { organizationId, userId, isPrimary: true },
      data: { isPrimary: false },
    });
  },

  isOrganizationMember(organizationId: string, userId: string) {
    return prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  },

  findEmployeeCodeConflict(organizationId: string, employeeCode: string, excludeUserId?: string) {
    return prisma.organizationMember.findFirst({
      where: {
        organizationId,
        employeeCode,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
    });
  },

  updateMemberProfile(
    organizationId: string,
    userId: string,
    data: {
      managerUserId?: string | null;
      jobTitle?: string | null;
      employeeCode?: string | null;
    },
  ) {
    return prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId } },
      data,
      include: {
        user: { select: { id: true, email: true, status: true } },
        manager: { select: { id: true, email: true } },
      },
    });
  },

  listEmployees(organizationId: string) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, status: true } },
        manager: { select: { id: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  },

  listUnitMembershipsForUsers(organizationId: string, userIds: string[]) {
    return prisma.orgUnitMember.findMany({
      where: { organizationId, userId: { in: userIds } },
      include: {
        orgUnit: { select: { id: true, name: true, type: true, code: true } },
      },
    });
  },
};

export type { OrgUnitType };
