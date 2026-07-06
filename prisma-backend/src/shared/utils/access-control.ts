import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { Permissions } from "../../shared/constants/permissions";
import { Roles } from "../../shared/constants/roles";
import type { AuthContext } from "../../shared/types/auth-context";
import { hasPermission, ownerScopeFilter, shouldScopeToOwner } from "./permission";

export const orgScopeFilter = (organizationId: string) => ({ organizationId });

export const buildOrgScopedWhere = <T extends Record<string, unknown>>(auth: AuthContext, where: T) => {
  if (!auth.organizationId) {
    throw new AppError(400, "Organization context is required", "NO_ORGANIZATION");
  }

  return {
    ...where,
    ...orgScopeFilter(auth.organizationId),
  };
};

export const buildOwnerScopedWhere = <T extends Record<string, unknown>>(auth: AuthContext, where: T) => {
  const orgWhere = buildOrgScopedWhere(auth, where);

  if (!shouldScopeToOwner(auth.roles, auth.permissions)) {
    return orgWhere;
  }

  return {
    ...orgWhere,
    ...ownerScopeFilter(auth.userId),
  };
};

export const canManageActivityRecord = (
  auth: AuthContext,
  activityUserId: string,
  assigneeId?: string | null,
): boolean => {
  if (hasPermission(auth.permissions, Permissions.ManageAll)) return true;
  if (auth.roles.includes(Roles.Admin) || auth.roles.includes(Roles.Manager)) return true;
  if (activityUserId === auth.userId) return true;
  return assigneeId === auth.userId;
};

export const assertRecordOwnerAccess = (
  auth: AuthContext,
  ownerId: string | null | undefined,
  message = "You do not have access to this record",
) => {
  if (!shouldScopeToOwner(auth.roles, auth.permissions)) return;
  if (ownerId !== auth.userId) {
    throw new AppError(403, message, "FORBIDDEN");
  }
};

export const buildActivityScopeWhere = (auth: AuthContext) => {
  const orgFilter = auth.organizationId ? orgScopeFilter(auth.organizationId) : {};

  if (!shouldScopeToOwner(auth.roles, auth.permissions)) {
    return orgFilter;
  }

  return {
    ...orgFilter,
    OR: [
      { userId: auth.userId },
      { assigneeId: auth.userId },
      { contact: { ownerId: auth.userId, deletedAt: null, organizationId: auth.organizationId } },
      { deal: { ownerId: auth.userId, deletedAt: null, organizationId: auth.organizationId } },
      {
        company: { ownerId: auth.userId, deletedAt: null, organizationId: auth.organizationId },
      },
    ],
  };
};

export const assertActivityLinksAccess = async (
  auth: AuthContext,
  links: {
    contactId?: string;
    dealId?: string;
    companyId?: string;
    leadId?: string;
  },
) => {
  await assertLinkedRecordAccess(auth, links.contactId, links.dealId);

  if (links.companyId) {
    const company = await prisma.company.findFirst({
      where: buildOrgScopedWhere(auth, { id: links.companyId, deletedAt: null }),
      select: { ownerId: true },
    });
    if (!company) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    assertRecordOwnerAccess(auth, company.ownerId, "You do not have access to this company");
  }

  if (links.leadId) {
    const lead = await prisma.lead.findFirst({
      where: buildOrgScopedWhere(auth, { id: links.leadId }),
      select: { contact: { select: { ownerId: true } } },
    });
    if (!lead) throw new AppError(404, "Lead not found", "LEAD_NOT_FOUND");
    assertRecordOwnerAccess(auth, lead.contact.ownerId, "You do not have access to this lead");
  }
};

export const assertLinkedRecordAccess = async (
  auth: AuthContext,
  contactId?: string,
  dealId?: string,
) => {
  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: buildOrgScopedWhere(auth, { id: contactId, deletedAt: null }),
      select: { ownerId: true },
    });
    if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    assertRecordOwnerAccess(auth, contact.ownerId, "You do not have access to this contact");
  }

  if (dealId) {
    const deal = await prisma.deal.findFirst({
      where: buildOrgScopedWhere(auth, { id: dealId, deletedAt: null }),
      select: { ownerId: true },
    });
    if (!deal) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, deal.ownerId, "You do not have access to this deal");
  }
};
