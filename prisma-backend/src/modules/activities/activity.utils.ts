import type { ActivityStatus, ActivityType, RecurrenceFrequency } from "@prisma/client";

import type { AuthContext } from "../../shared/types/auth-context";
import { buildActivityScopeWhere } from "../../shared/utils/access-control";
import type { ListActivitiesQuery } from "./activity.validation";

export const LOGGED_ACTIVITY_TYPES: ActivityType[] = ["NOTE", "CALL", "EMAIL", "MEETING"];

export const resolveInitialStatus = (
  type: ActivityType,
  completedAt?: Date | null,
  dueAt?: Date | null,
): ActivityStatus => {
  if (completedAt) return "COMPLETED";
  if (type === "TASK" && dueAt) return "PENDING";
  if (LOGGED_ACTIVITY_TYPES.includes(type)) return "COMPLETED";
  if (type === "TASK") return "PENDING";
  return "PENDING";
};

export const isActivityOverdue = (status: ActivityStatus, dueAt?: Date | null, now = new Date()) =>
  status === "PENDING" && !!dueAt && dueAt.getTime() < now.getTime();

export const calculateNextDueDate = (
  currentDueAt: Date,
  frequency: RecurrenceFrequency,
  interval = 1,
): Date => {
  const next = new Date(currentDueAt);
  const step = Math.max(interval, 1);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + step);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + step * 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + step);
      break;
    default:
      break;
  }

  return next;
};

export interface CsvActivityRow {
  type: string;
  status: string;
  priority: string;
  subject: string;
  body?: string;
  dueAt?: string;
  reminderAt?: string;
  location?: string;
  contactEmail?: string;
  dealTitle?: string;
  companyName?: string;
}

const CSV_HEADERS = [
  "type",
  "status",
  "priority",
  "subject",
  "body",
  "due_at",
  "reminder_at",
  "location",
  "contact_email",
  "deal_title",
  "company_name",
] as const;

export const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const activitiesToCsv = (rows: CsvActivityRow[]): string => {
  const header = CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.type,
      row.status,
      row.priority,
      row.subject,
      row.body ?? "",
      row.dueAt ?? "",
      row.reminderAt ?? "",
      row.location ?? "",
      row.contactEmail ?? "",
      row.dealTitle ?? "",
      row.companyName ?? "",
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(","),
  );
  return [header, ...body].join("\n");
};

export const parseCsvActivities = (csv: string): CsvActivityRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const indexOf = (name: string) => headers.indexOf(name);

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return {
      type: cells[indexOf("type")] ?? "TASK",
      status: cells[indexOf("status")] ?? "PENDING",
      priority: cells[indexOf("priority")] ?? "NORMAL",
      subject: cells[indexOf("subject")] ?? "",
      body: cells[indexOf("body")] || undefined,
      dueAt: cells[indexOf("due_at")] || undefined,
      reminderAt: cells[indexOf("reminder_at")] || undefined,
      location: cells[indexOf("location")] || undefined,
      contactEmail: cells[indexOf("contact_email")] || undefined,
      dealTitle: cells[indexOf("deal_title")] || undefined,
      companyName: cells[indexOf("company_name")] || undefined,
    };
  });
};

export const buildActivityListWhere = (query: ListActivitiesQuery, auth: AuthContext) => {
  const scopeWhere = buildActivityScopeWhere(auth);
  const now = new Date();
  const filters: Record<string, unknown> = {};

  if (query.contactId) filters.contactId = query.contactId;
  if (query.dealId) filters.dealId = query.dealId;
  if (query.companyId) filters.companyId = query.companyId;
  if (query.leadId) filters.leadId = query.leadId;
  if (query.type) filters.type = query.type;
  if (query.status) filters.status = query.status;
  if (query.priority) filters.priority = query.priority;
  if (query.assigneeId) filters.assigneeId = query.assigneeId;
  if (query.tasksOnly) filters.type = "TASK";

  if (query.overdue) {
    filters.status = "PENDING";
    filters.dueAt = { lt: now };
  }

  if (query.dueBefore) {
    filters.dueAt = { ...(filters.dueAt as object), lte: query.dueBefore };
  }

  if (query.dueAfter) {
    filters.dueAt = { ...(filters.dueAt as object), gte: query.dueAfter };
  }

  if (query.dueSoonDays) {
    const horizon = new Date(now.getTime() + query.dueSoonDays * 24 * 60 * 60 * 1000);
    filters.status = "PENDING";
    filters.dueAt = { gte: now, lte: horizon };
  }

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  if (Object.keys(scopeWhere).length === 0) return filters;
  if (Object.keys(filters).length === 0) return scopeWhere;

  return { AND: [scopeWhere, filters] };
};
