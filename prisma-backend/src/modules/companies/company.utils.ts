export const normalizeDomain = (domain?: string | null): string | undefined => {
  const trimmed = domain?.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
};

export type CompanyDuplicateReason = "domain" | "name";

export interface CompanyDuplicateCandidate {
  companyId: string;
  score: number;
  reasons: CompanyDuplicateReason[];
}

export interface CompanyDuplicateInput {
  name?: string;
  domain?: string;
  excludeCompanyId?: string;
}

export const scoreCompanyDuplicate = (
  candidate: { id: string; name: string; domain: string | null },
  input: CompanyDuplicateInput,
): CompanyDuplicateCandidate | null => {
  if (input.excludeCompanyId && candidate.id === input.excludeCompanyId) return null;

  const reasons: CompanyDuplicateReason[] = [];
  let score = 0;

  const inputDomain = normalizeDomain(input.domain);
  if (inputDomain && normalizeDomain(candidate.domain) === inputDomain) {
    reasons.push("domain");
    score += 100;
  }

  const inputName = input.name?.trim().toLowerCase();
  if (inputName && candidate.name.trim().toLowerCase() === inputName) {
    reasons.push("name");
    score += 80;
  }

  if (!reasons.length) return null;
  return { companyId: candidate.id, score, reasons };
};

export type CompanyTreeNode = {
  id: string;
  parentCompanyId: string | null;
  name: string;
  domain: string | null;
  industry: string | null;
  ownershipPercent: number | null;
  employeeCount: number | null;
  children: CompanyTreeNode[];
};

export const buildCompanyTree = <
  T extends {
    id: string;
    parentCompanyId: string | null;
    name: string;
    domain: string | null;
    industry: string | null;
    ownershipPercent: { toNumber?: () => number } | number | null;
    employeeCount: number | null;
  },
>(
  companies: T[],
): CompanyTreeNode[] => {
  const byParent = new Map<string | null, T[]>();

  for (const company of companies) {
    const key = company.parentCompanyId;
    const siblings = byParent.get(key) ?? [];
    siblings.push(company);
    byParent.set(key, siblings);
  }

  const toNumber = (value: T["ownershipPercent"]): number | null => {
    if (value === null || value === undefined) return null;
    return typeof value === "number" ? value : Number(value);
  };

  const toNode = (company: T): CompanyTreeNode => ({
    id: company.id,
    parentCompanyId: company.parentCompanyId,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    ownershipPercent: toNumber(company.ownershipPercent),
    employeeCount: company.employeeCount,
    children: (byParent.get(company.id) ?? [])
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(toNode),
  });

  return (byParent.get(null) ?? [])
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(toNode);
};

export const collectCompanyDescendantIds = (
  companies: { id: string; parentCompanyId: string | null }[],
  rootId: string,
): Set<string> => {
  const childrenByParent = new Map<string, string[]>();
  for (const company of companies) {
    if (!company.parentCompanyId) continue;
    const list = childrenByParent.get(company.parentCompanyId) ?? [];
    list.push(company.id);
    childrenByParent.set(company.parentCompanyId, list);
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

export const assertValidParentCompany = (
  companyId: string,
  parentCompanyId: string | null | undefined,
  descendants: Set<string>,
): void => {
  if (!parentCompanyId) return;
  if (parentCompanyId === companyId) {
    throw new Error("Company cannot be its own parent");
  }
  if (descendants.has(parentCompanyId)) {
    throw new Error("Cannot assign a descendant as parent company");
  }
};

export interface CsvCompanyRow {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  website?: string;
  employeeCount?: number;
  annualRevenue?: number;
  revenueCurrency?: string;
  parentDomain?: string;
  ownershipPercent?: number;
  notes?: string;
}

const CSV_HEADERS = [
  "name",
  "domain",
  "industry",
  "size",
  "website",
  "employee_count",
  "annual_revenue",
  "revenue_currency",
  "parent_domain",
  "ownership_percent",
  "notes",
] as const;

export const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const companiesToCsv = (rows: CsvCompanyRow[]): string => {
  const header = CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.name,
      row.domain ?? "",
      row.industry ?? "",
      row.size ?? "",
      row.website ?? "",
      row.employeeCount?.toString() ?? "",
      row.annualRevenue?.toString() ?? "",
      row.revenueCurrency ?? "",
      row.parentDomain ?? "",
      row.ownershipPercent?.toString() ?? "",
      row.notes ?? "",
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(","),
  );
  return [header, ...body].join("\n");
};

export const parseCsvCompanies = (csv: string): CsvCompanyRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const get = (name: string) => values[headers.indexOf(name)]?.trim() || undefined;
    const employeeCount = get("employee_count");
    const annualRevenue = get("annual_revenue");
    const ownershipPercent = get("ownership_percent");
    return {
      name: get("name") ?? "",
      domain: get("domain"),
      industry: get("industry"),
      size: get("size"),
      website: get("website"),
      employeeCount: employeeCount ? Number(employeeCount) : undefined,
      annualRevenue: annualRevenue ? Number(annualRevenue) : undefined,
      revenueCurrency: get("revenue_currency"),
      parentDomain: get("parent_domain"),
      ownershipPercent: ownershipPercent ? Number(ownershipPercent) : undefined,
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

export const pickPrimaryLocationLine = (
  locations: Array<{ line1: string; isPrimary: boolean }>,
): string | undefined => {
  const primary = locations.find((entry) => entry.isPrimary);
  return (primary?.line1 ?? locations[0]?.line1)?.trim() || undefined;
};
