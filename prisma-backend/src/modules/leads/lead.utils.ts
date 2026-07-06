import type { LeadRating, LeadScoreRule } from "@prisma/client";

export type LeadScoreInput = {
  status?: string | null;
  leadSource?: string | null;
  jobTitle?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  industry?: string | null;
};

const compare = (left: string, operator: string, right: string): boolean => {
  switch (operator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "starts_with":
      return left.startsWith(right);
    case "ends_with":
      return left.endsWith(right);
    default:
      return false;
  }
};

const readFieldValue = (input: LeadScoreInput, field: string): string => {
  switch (field) {
    case "status":
      return input.status ?? "";
    case "lead_source":
      return input.leadSource ?? "";
    case "job_title":
      return input.jobTitle ?? "";
    case "email":
      return input.email ? "present" : "missing";
    case "phone":
      return input.phone ? "present" : "missing";
    case "company":
      return input.company ?? "";
    case "industry":
      return input.industry ?? "";
    default:
      return "";
  }
};

export const calculateLeadScore = (
  input: LeadScoreInput,
  rules: Pick<LeadScoreRule, "field" | "operator" | "value" | "points" | "active">[],
): number =>
  rules
    .filter((rule) => rule.active)
    .reduce((total, rule) => {
      const actual = readFieldValue(input, rule.field).toLowerCase();
      const expected = rule.value.toLowerCase();
      return compare(actual, rule.operator, expected) ? total + rule.points : total;
    }, 0);

export const scoreToRating = (score: number): LeadRating => {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
};

export const isOpenLeadStage = (stage: string): boolean =>
  !["CONVERTED", "LOST"].includes(stage);

export interface CsvLeadRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  leadSource?: string;
  stage?: string;
  notes?: string;
}

const CSV_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "company",
  "job_title",
  "lead_source",
  "stage",
  "notes",
] as const;

export const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const leadsToCsv = (rows: CsvLeadRow[]): string => {
  const header = CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.firstName,
      row.lastName,
      row.email ?? "",
      row.phone ?? "",
      row.company ?? "",
      row.jobTitle ?? "",
      row.leadSource ?? "",
      row.stage ?? "",
      row.notes ?? "",
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(","),
  );
  return [header, ...body].join("\n");
};

export const parseCsvLeads = (csv: string): CsvLeadRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const get = (name: string) => values[headers.indexOf(name)]?.trim() || undefined;
    return {
      firstName: get("first_name") ?? "",
      lastName: get("last_name") ?? "",
      email: get("email"),
      phone: get("phone"),
      company: get("company"),
      jobTitle: get("job_title"),
      leadSource: get("lead_source"),
      stage: get("stage"),
      notes: get("notes"),
    };
  });
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
};
