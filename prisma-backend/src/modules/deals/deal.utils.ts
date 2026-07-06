import type { DealStage } from "@prisma/client";

export const OPEN_DEAL_STAGES: DealStage[] = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"];

export const isOpenDealStage = (stage: DealStage): boolean => OPEN_DEAL_STAGES.includes(stage);

export const computeWeightedValue = (value: number, probability: number): number =>
  Math.round((value * probability) / 100 * 100) / 100;

export const resolveDealProbability = (
  dealProbability: number | null | undefined,
  stageProbability: number,
): number => dealProbability ?? stageProbability;

export interface CsvDealRow {
  title: string;
  value: number;
  currency?: string;
  stage?: string;
  contactEmail?: string;
  company?: string;
  expectedCloseDate?: string;
  description?: string;
  competitor?: string;
}

const CSV_HEADERS = [
  "title",
  "value",
  "currency",
  "stage",
  "contact_email",
  "company",
  "expected_close_date",
  "description",
  "competitor",
] as const;

export const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const dealsToCsv = (rows: CsvDealRow[]): string => {
  const header = CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.title,
      String(row.value),
      row.currency ?? "USD",
      row.stage ?? "LEAD",
      row.contactEmail ?? "",
      row.company ?? "",
      row.expectedCloseDate ?? "",
      row.description ?? "",
      row.competitor ?? "",
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(","),
  );
  return [header, ...body].join("\n");
};

export const parseCsvDeals = (csv: string): CsvDealRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const get = (name: string) => values[headers.indexOf(name)]?.trim() || undefined;
    const valueRaw = get("value");
    return {
      title: get("title") ?? "",
      value: valueRaw ? Number(valueRaw) : 0,
      currency: get("currency"),
      stage: get("stage"),
      contactEmail: get("contact_email"),
      company: get("company"),
      expectedCloseDate: get("expected_close_date"),
      description: get("description"),
      competitor: get("competitor"),
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
