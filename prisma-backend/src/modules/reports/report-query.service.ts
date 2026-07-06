import { prisma } from "../../config/prisma";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  buildActivityScopeWhere,
  buildOwnerScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import type { NormalizedReportConfig, ReportResult } from "./report.utils";

const toNumber = (value: unknown) => (value == null ? 0 : Number(value));

export const executeReportQuery = async (
  config: NormalizedReportConfig,
  auth: AuthContext,
): Promise<ReportResult> => {
  const organizationId = requireOrganizationContext(auth);

  if (config.groupBy) {
    return runGroupedReport(config, auth, organizationId);
  }

  return runTableReport(config, auth, organizationId);
};

const runGroupedReport = async (
  config: NormalizedReportConfig,
  auth: AuthContext,
  organizationId: string,
): Promise<ReportResult> => {
  const groupField = config.groupBy!;

  switch (config.entityType) {
    case "deals": {
      const where = buildOwnerScopedWhere(auth, { organizationId, deletedAt: null });
      const groups = await prisma.deal.groupBy({
        by: ["stage"],
        where,
        _count: { _all: true },
        _sum: { value: true },
      });
      return {
        columns: [
          { key: groupField, label: groupField },
          { key: "count", label: "Count" },
          { key: "value", label: "Total value" },
        ],
        rows: groups.map((group) => ({
          [groupField]: String(group[groupField as keyof typeof group]),
          count: group._count._all,
          value: toNumber(group._sum.value),
        })),
        summary: { total: groups.reduce((sum, group) => sum + group._count._all, 0) },
      };
    }
    case "contacts": {
      const where = buildOwnerScopedWhere(auth, { organizationId, deletedAt: null });
      const groups = await prisma.contact.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      });
      return {
        columns: [
          { key: "status", label: "Status" },
          { key: "count", label: "Count" },
        ],
        rows: groups.map((group) => ({ status: group.status, count: group._count._all })),
      };
    }
    case "leads": {
      const where = { organizationId };
      const groups = await prisma.lead.groupBy({
        by: ["stage"],
        where,
        _count: { _all: true },
      });
      return {
        columns: [
          { key: "stage", label: "Stage" },
          { key: "count", label: "Count" },
        ],
        rows: groups.map((group) => ({ stage: group.stage, count: group._count._all })),
      };
    }
    case "cases": {
      const where = { organizationId };
      const groups = await prisma.case.groupBy({
        by: [groupField as "status" | "priority"],
        where,
        _count: { _all: true },
      });
      return {
        columns: [
          { key: groupField, label: groupField },
          { key: "count", label: "Count" },
        ],
        rows: groups.map((group) => ({
          [groupField]: String(group[groupField as keyof typeof group]),
          count: group._count._all,
        })),
      };
    }
    case "activities": {
      const where = buildActivityScopeWhere(auth);
      const groups = await prisma.activity.groupBy({
        by: [groupField as "type" | "status"],
        where,
        _count: { _all: true },
      });
      return {
        columns: [
          { key: groupField, label: groupField },
          { key: "count", label: "Count" },
        ],
        rows: groups.map((group) => ({
          [groupField]: String(group[groupField as keyof typeof group]),
          count: group._count._all,
        })),
      };
    }
    case "campaigns": {
      const where = { organizationId };
      const groups = await prisma.campaign.groupBy({
        by: [groupField as "status" | "type"],
        where,
        _count: { _all: true },
        _sum: { budget: true, sentCount: true },
      });
      return {
        columns: [
          { key: groupField, label: groupField },
          { key: "count", label: "Count" },
          { key: "sentCount", label: "Sent" },
        ],
        rows: groups.map((group) => ({
          [groupField]: String(group[groupField as keyof typeof group]),
          count: group._count._all,
          sentCount: toNumber(group._sum.sentCount),
        })),
      };
    }
    default:
      throw new Error(`Unsupported entity type: ${config.entityType}`);
  }
};

const runTableReport = async (
  config: NormalizedReportConfig,
  auth: AuthContext,
  organizationId: string,
): Promise<ReportResult> => {
  switch (config.entityType) {
    case "deals": {
      const rows = await prisma.deal.findMany({
        where: buildOwnerScopedWhere(auth, { organizationId, deletedAt: null }),
        orderBy: { updatedAt: "desc" },
        take: config.limit,
        select: { id: true, title: true, stage: true, value: true },
      });
      return {
        columns: [
          { key: "title", label: "Title" },
          { key: "stage", label: "Stage" },
          { key: "value", label: "Value" },
        ],
        rows: rows.map((row) => ({
          title: row.title,
          stage: row.stage,
          value: toNumber(row.value),
        })),
      };
    }
    case "contacts": {
      const rows = await prisma.contact.findMany({
        where: buildOwnerScopedWhere(auth, { organizationId, deletedAt: null }),
        orderBy: { updatedAt: "desc" },
        take: config.limit,
        select: { id: true, firstName: true, lastName: true, email: true, status: true },
      });
      return {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
        ],
        rows: rows.map((row) => ({
          name: `${row.firstName} ${row.lastName}`.trim(),
          email: row.email,
          status: row.status,
        })),
      };
    }
    case "leads": {
      const rows = await prisma.lead.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: config.limit,
        select: {
          id: true,
          stage: true,
          contact: { select: { firstName: true, lastName: true, email: true } },
        },
      });
      return {
        columns: [
          { key: "contact", label: "Contact" },
          { key: "email", label: "Email" },
          { key: "stage", label: "Stage" },
        ],
        rows: rows.map((row) => ({
          contact: `${row.contact.firstName} ${row.contact.lastName}`.trim(),
          email: row.contact.email,
          stage: row.stage,
        })),
      };
    }
    case "cases": {
      const rows = await prisma.case.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: config.limit,
        select: { id: true, caseNumber: true, subject: true, status: true, priority: true },
      });
      return {
        columns: [
          { key: "caseNumber", label: "Case #" },
          { key: "subject", label: "Subject" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
        ],
        rows: rows.map((row) => ({
          caseNumber: row.caseNumber,
          subject: row.subject,
          status: row.status,
          priority: row.priority,
        })),
      };
    }
    case "activities": {
      const rows = await prisma.activity.findMany({
        where: buildActivityScopeWhere(auth),
        orderBy: { createdAt: "desc" },
        take: config.limit,
        select: { id: true, type: true, subject: true, status: true, priority: true },
      });
      return {
        columns: [
          { key: "type", label: "Type" },
          { key: "subject", label: "Subject" },
          { key: "status", label: "Status" },
        ],
        rows: rows.map((row) => ({
          type: row.type,
          subject: row.subject,
          status: row.status,
        })),
      };
    }
    case "campaigns": {
      const rows = await prisma.campaign.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: config.limit,
        select: { id: true, name: true, type: true, status: true, sentCount: true, budget: true },
      });
      return {
        columns: [
          { key: "name", label: "Name" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
          { key: "sentCount", label: "Sent" },
        ],
        rows: rows.map((row) => ({
          name: row.name,
          type: row.type,
          status: row.status,
          sentCount: row.sentCount,
        })),
      };
    }
    default:
      throw new Error(`Unsupported entity type: ${config.entityType}`);
  }
};
