import type { ListDashboardLayoutsQuery, ListReportsQuery } from "./report.validation";

export const REPORT_ENTITY_TYPES = [
  "deals",
  "contacts",
  "leads",
  "cases",
  "activities",
  "campaigns",
] as const;

export type ReportEntityType = (typeof REPORT_ENTITY_TYPES)[number];

export const REPORT_CHART_TYPES = ["TABLE", "BAR", "LINE", "PIE", "KPI"] as const;

export type ReportChartType = (typeof REPORT_CHART_TYPES)[number];

export type ReportColumn = { key: string; label: string };

export type ReportResult = {
  columns: ReportColumn[];
  rows: Array<Record<string, string | number | null>>;
  summary?: Record<string, number>;
};

const ENTITY_GROUP_FIELDS: Record<ReportEntityType, string[]> = {
  deals: ["stage"],
  contacts: ["status"],
  leads: ["stage"],
  cases: ["status", "priority"],
  activities: ["type", "status"],
  campaigns: ["status", "type"],
};

const ENTITY_NUMERIC_FIELDS: Record<ReportEntityType, string[]> = {
  deals: ["value"],
  contacts: [],
  leads: [],
  cases: [],
  activities: [],
  campaigns: ["budget", "sentCount", "openedCount", "clickedCount"],
};

export type NormalizedReportConfig = {
  entityType: ReportEntityType;
  groupBy?: string;
  limit: number;
};

export const isReportEntityType = (value: string): value is ReportEntityType =>
  REPORT_ENTITY_TYPES.includes(value as ReportEntityType);

export const normalizeReportConfig = (
  entityType: string,
  config: unknown,
): NormalizedReportConfig => {
  if (!isReportEntityType(entityType)) {
    throw new Error(`Unsupported entity type: ${entityType}`);
  }

  const raw = config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  const groupBy = raw.groupBy != null ? String(raw.groupBy) : undefined;

  if (groupBy && !ENTITY_GROUP_FIELDS[entityType].includes(groupBy)) {
    throw new Error(`Invalid groupBy "${groupBy}" for ${entityType}`);
  }

  const limitRaw = Number(raw.limit ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

  return { entityType, groupBy, limit };
};

export const getAllowedGroupFields = (entityType: ReportEntityType) => ENTITY_GROUP_FIELDS[entityType];

export const getNumericFields = (entityType: ReportEntityType) => ENTITY_NUMERIC_FIELDS[entityType];

export const buildReportListWhere = (query: ListReportsQuery, organizationId: string) => ({
  organizationId,
  ...(query.entityType ? { entityType: query.entityType } : {}),
  ...(query.search?.trim()
    ? {
        OR: [
          { name: { contains: query.search.trim(), mode: "insensitive" as const } },
          { description: { contains: query.search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {}),
});

export const buildLayoutListWhere = (_query: ListDashboardLayoutsQuery, organizationId: string) => ({
  organizationId,
});

export const rowsToCsv = (columns: ReportColumn[], rows: ReportResult["rows"]) => {
  const header = columns.map((column) => column.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value = row[column.key];
          const text = value == null ? "" : String(value);
          return text.includes(",") || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
};

export const normalizeReportDefinition = (config: unknown) => {
  if (!config || typeof config !== "object") return {};
  const raw = config as Record<string, unknown>;
  return {
    groupBy: raw.groupBy != null ? String(raw.groupBy) : undefined,
    limit: raw.limit != null ? Number(raw.limit) : undefined,
  };
};

export const normalizeLayoutWidgets = (widgets: unknown) => {
  if (!Array.isArray(widgets)) return [];
  return widgets
    .map((widget, index) => {
      if (!widget || typeof widget !== "object") return null;
      const row = widget as Record<string, unknown>;
      return {
        id: row.id != null ? String(row.id) : `widget-${index}`,
        type: row.type != null ? String(row.type) : "kpi",
        title: row.title != null ? String(row.title) : "Widget",
        reportId: row.reportId != null ? String(row.reportId) : undefined,
        grid: row.grid ?? { x: 0, y: index, w: 1, h: 1 },
      };
    })
    .filter(Boolean);
};
