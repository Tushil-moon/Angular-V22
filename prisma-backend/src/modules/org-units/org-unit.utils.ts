import type { OrgUnitType } from "@prisma/client";

const PARENT_RULES: Record<OrgUnitType, OrgUnitType[] | null> = {
  BRANCH: null,
  DEPARTMENT: ["BRANCH"],
  TEAM: ["DEPARTMENT"],
};

export const assertValidParentType = (
  type: OrgUnitType,
  parentType: OrgUnitType | null,
): void => {
  const allowedParents = PARENT_RULES[type];

  if (allowedParents === null) {
    if (parentType !== null) {
      throw new Error("Branches must be root-level units");
    }
    return;
  }

  if (!parentType || !allowedParents.includes(parentType)) {
    throw new Error(`Invalid parent type for ${type}`);
  }
};

export type OrgUnitNode = {
  id: string;
  parentId: string | null;
  type: OrgUnitType;
  name: string;
  code: string | null;
  description: string | null;
  managerUserId: string | null;
  isActive: boolean;
  sortOrder: number;
  children: OrgUnitNode[];
};

export const buildOrgUnitTree = <T extends {
  id: string;
  parentId: string | null;
  type: OrgUnitType;
  name: string;
  code: string | null;
  description: string | null;
  managerUserId: string | null;
  isActive: boolean;
  sortOrder: number;
}>(units: T[]): OrgUnitNode[] => {
  const byParent = new Map<string | null, T[]>();

  for (const unit of units) {
    const key = unit.parentId;
    const siblings = byParent.get(key) ?? [];
    siblings.push(unit);
    byParent.set(key, siblings);
  }

  const toNode = (unit: T): OrgUnitNode => ({
    id: unit.id,
    parentId: unit.parentId,
    type: unit.type,
    name: unit.name,
    code: unit.code,
    description: unit.description,
    managerUserId: unit.managerUserId,
    isActive: unit.isActive,
    sortOrder: unit.sortOrder,
    children: (byParent.get(unit.id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(toNode),
  });

  return (byParent.get(null) ?? [])
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map(toNode);
};

export const collectDescendantIds = (
  units: { id: string; parentId: string | null }[],
  rootId: string,
): Set<string> => {
  const childrenByParent = new Map<string, string[]>();
  for (const unit of units) {
    if (!unit.parentId) continue;
    const list = childrenByParent.get(unit.parentId) ?? [];
    list.push(unit.id);
    childrenByParent.set(unit.parentId, list);
  }

  const result = new Set<string>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    result.add(current);
    for (const childId of childrenByParent.get(current) ?? []) {
      stack.push(childId);
    }
  }

  return result;
};
