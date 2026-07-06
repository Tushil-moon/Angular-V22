import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { orgUnitRepository } from "./org-unit.repository";
import {
  assertValidParentType,
  buildOrgUnitTree,
  collectDescendantIds,
} from "./org-unit.utils";
import type {
  AddOrgUnitMemberInput,
  CreateOrgUnitInput,
  UpdateMemberProfileInput,
  UpdateOrgUnitInput,
} from "./org-unit.validation";

const mapUnit = (unit: Awaited<ReturnType<typeof orgUnitRepository.findById>>) => {
  if (!unit) return null;
  return unit;
};

const mapEmployee = (
  member: Awaited<ReturnType<typeof orgUnitRepository.listEmployees>>[number],
  unitMemberships: Awaited<ReturnType<typeof orgUnitRepository.listUnitMembershipsForUsers>>,
) => ({
  userId: member.userId,
  role: member.role,
  jobTitle: member.jobTitle,
  employeeCode: member.employeeCode,
  managerUserId: member.managerUserId,
  joinedAt: member.joinedAt,
  user: member.user,
  manager: member.manager,
  units: unitMemberships
    .filter((entry) => entry.userId === member.userId)
    .map((entry) => ({
      id: entry.orgUnit.id,
      name: entry.orgUnit.name,
      type: entry.orgUnit.type,
      code: entry.orgUnit.code,
      isPrimary: entry.isPrimary,
      title: entry.title,
    })),
});

export const orgUnitService = {
  async getTree(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const units = await orgUnitRepository.listByOrganization(organizationId);
    return buildOrgUnitTree(units);
  },

  async list(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    return orgUnitRepository.listByOrganization(organizationId);
  },

  async getById(unitId: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const unit = await orgUnitRepository.findById(organizationId, unitId);
    if (!unit) throw new AppError(404, "Org unit not found", "ORG_UNIT_NOT_FOUND");
    return unit;
  },

  async create(input: CreateOrgUnitInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const parent = input.parentId
      ? await orgUnitRepository.findById(organizationId, input.parentId)
      : null;

    if (input.parentId && !parent) {
      throw new AppError(404, "Parent org unit not found", "PARENT_NOT_FOUND");
    }

    try {
      assertValidParentType(input.type, parent?.type ?? null);
    } catch (error) {
      throw new AppError(400, (error as Error).message, "INVALID_PARENT");
    }

    if (input.managerUserId) {
      const managerMember = await orgUnitRepository.isOrganizationMember(
        organizationId,
        input.managerUserId,
      );
      if (!managerMember) {
        throw new AppError(400, "Manager must be an organization member", "INVALID_MANAGER");
      }
    }

    return orgUnitRepository.create({
      organization: { connect: { id: organizationId } },
      parent: parent ? { connect: { id: parent.id } } : undefined,
      type: input.type,
      name: input.name.trim(),
      code: input.code?.trim().toUpperCase(),
      description: input.description?.trim(),
      manager: input.managerUserId ? { connect: { id: input.managerUserId } } : undefined,
      sortOrder: input.sortOrder ?? 0,
    });
  },

  async update(unitId: string, input: UpdateOrgUnitInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await orgUnitRepository.findById(organizationId, unitId);
    if (!existing) throw new AppError(404, "Org unit not found", "ORG_UNIT_NOT_FOUND");

    const nextParentId =
      input.parentId === undefined ? existing.parentId : input.parentId ?? null;

    if (nextParentId === unitId) {
      throw new AppError(400, "Org unit cannot be its own parent", "INVALID_PARENT");
    }

    if (nextParentId) {
      const units = await orgUnitRepository.listByOrganization(organizationId);
      const descendants = collectDescendantIds(units, unitId);
      if (descendants.has(nextParentId)) {
        throw new AppError(400, "Cannot move unit under its descendant", "INVALID_PARENT");
      }
    }

    const parent = nextParentId
      ? await orgUnitRepository.findById(organizationId, nextParentId)
      : null;

    if (nextParentId && !parent) {
      throw new AppError(404, "Parent org unit not found", "PARENT_NOT_FOUND");
    }

    const nextType = existing.type;
    try {
      assertValidParentType(nextType, parent?.type ?? null);
    } catch (error) {
      throw new AppError(400, (error as Error).message, "INVALID_PARENT");
    }

    if (input.managerUserId) {
      const managerMember = await orgUnitRepository.isOrganizationMember(
        organizationId,
        input.managerUserId,
      );
      if (!managerMember) {
        throw new AppError(400, "Manager must be an organization member", "INVALID_MANAGER");
      }
    }

    return orgUnitRepository.update(unitId, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.parentId !== undefined
        ? { parent: nextParentId ? { connect: { id: nextParentId } } : { disconnect: true } }
        : {}),
      ...(input.managerUserId !== undefined
        ? {
            manager: input.managerUserId
              ? { connect: { id: input.managerUserId } }
              : { disconnect: true },
          }
        : {}),
    });
  },

  async remove(unitId: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await orgUnitRepository.findById(organizationId, unitId);
    if (!existing) throw new AppError(404, "Org unit not found", "ORG_UNIT_NOT_FOUND");

    const units = await orgUnitRepository.listByOrganization(organizationId);
    const descendants = collectDescendantIds(units, unitId);
    if (descendants.size > 1) {
      throw new AppError(
        400,
        "Remove or reassign child units before deleting this unit",
        "HAS_CHILDREN",
      );
    }

    return orgUnitRepository.softDelete(unitId);
  },

  async listUnitMembers(unitId: string, auth: AuthContext) {
    await this.getById(unitId, auth);
    const members = await orgUnitRepository.listMembers(unitId);
    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      isPrimary: member.isPrimary,
      title: member.title,
      joinedAt: member.joinedAt,
      user: member.user,
    }));
  },

  async addUnitMember(unitId: string, input: AddOrgUnitMemberInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    await this.getById(unitId, auth);

    const orgMember = await orgUnitRepository.isOrganizationMember(organizationId, input.userId);
    if (!orgMember) {
      throw new AppError(400, "User must be an organization member", "NOT_ORG_MEMBER");
    }

    const existing = await orgUnitRepository.findMember(unitId, input.userId);
    if (existing) {
      throw new AppError(409, "User is already assigned to this unit", "MEMBER_EXISTS");
    }

    if (input.isPrimary) {
      await orgUnitRepository.clearPrimaryForUser(organizationId, input.userId);
    }

    const member = await orgUnitRepository.addMember({
      organizationId,
      orgUnitId: unitId,
      userId: input.userId,
      isPrimary: input.isPrimary ?? false,
      title: input.title?.trim(),
    });

    return {
      id: member.id,
      userId: member.userId,
      isPrimary: member.isPrimary,
      title: member.title,
      joinedAt: member.joinedAt,
      user: member.user,
    };
  },

  async removeUnitMember(unitId: string, userId: string, auth: AuthContext) {
    await this.getById(unitId, auth);
    const existing = await orgUnitRepository.findMember(unitId, userId);
    if (!existing) throw new AppError(404, "Unit member not found", "UNIT_MEMBER_NOT_FOUND");
    await orgUnitRepository.removeMember(unitId, userId);
  },

  async listEmployees(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const employees = await orgUnitRepository.listEmployees(organizationId);
    const unitMemberships = await orgUnitRepository.listUnitMembershipsForUsers(
      organizationId,
      employees.map((employee) => employee.userId),
    );
    return employees.map((employee) => mapEmployee(employee, unitMemberships));
  },

  async getHierarchy(auth: AuthContext) {
    const employees = await this.listEmployees(auth);
    const byManager = new Map<string | null, typeof employees>();

    for (const employee of employees) {
      const key = employee.managerUserId ?? null;
      const group = byManager.get(key) ?? [];
      group.push(employee);
      byManager.set(key, group);
    }

    type EmployeeNode = (typeof employees)[number] & { reports: EmployeeNode[] };

    const buildNode = (employee: (typeof employees)[number]): EmployeeNode => ({
      ...employee,
      reports: (byManager.get(employee.userId) ?? []).map(buildNode),
    });

    return (byManager.get(null) ?? []).map(buildNode);
  },

  async updateMemberProfile(userId: string, input: UpdateMemberProfileInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const member = await orgUnitRepository.isOrganizationMember(organizationId, userId);
    if (!member) throw new AppError(404, "Member not found", "MEMBER_NOT_FOUND");

    if (input.managerUserId) {
      if (input.managerUserId === userId) {
        throw new AppError(400, "Employee cannot report to themselves", "INVALID_MANAGER");
      }
      const manager = await orgUnitRepository.isOrganizationMember(
        organizationId,
        input.managerUserId,
      );
      if (!manager) {
        throw new AppError(400, "Manager must be an organization member", "INVALID_MANAGER");
      }
    }

    if (input.employeeCode) {
      const conflict = await orgUnitRepository.findEmployeeCodeConflict(
        organizationId,
        input.employeeCode,
        userId,
      );
      if (conflict) {
        throw new AppError(409, "Employee code already in use", "EMPLOYEE_CODE_EXISTS");
      }
    }

    const updated = await orgUnitRepository.updateMemberProfile(organizationId, userId, {
      ...(input.managerUserId !== undefined ? { managerUserId: input.managerUserId } : {}),
      ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
      ...(input.employeeCode !== undefined ? { employeeCode: input.employeeCode } : {}),
    });

    const unitMemberships = await orgUnitRepository.listUnitMembershipsForUsers(organizationId, [
      userId,
    ]);

    return mapEmployee(updated, unitMemberships);
  },
};

export { mapUnit };
