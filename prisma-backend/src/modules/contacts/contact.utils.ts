import type { Contact, ContactEmail, ContactPhone } from "@prisma/client";

export const normalizeEmail = (email?: string | null): string | undefined => {
  const trimmed = email?.trim().toLowerCase();
  return trimmed || undefined;
};

export const normalizePhone = (phone?: string | null): string | undefined => {
  const digits = phone?.replace(/\D/g, "");
  return digits || undefined;
};

export const formatPhoneDisplay = (phone: string): string => phone.trim();

export type DuplicateMatchReason = "email" | "phone" | "name_company";

export interface DuplicateCandidate {
  contactId: string;
  score: number;
  reasons: DuplicateMatchReason[];
}

export interface DuplicateCheckInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  excludeContactId?: string;
}

export const scoreDuplicate = (
  candidate: Pick<Contact, "id" | "firstName" | "lastName" | "email" | "phone" | "company"> & {
    emails?: Pick<ContactEmail, "email">[];
    phones?: Pick<ContactPhone, "phone">[];
  },
  input: DuplicateCheckInput,
): DuplicateCandidate | null => {
  if (input.excludeContactId && candidate.id === input.excludeContactId) return null;

  const reasons: DuplicateMatchReason[] = [];
  let score = 0;

  const inputEmail = normalizeEmail(input.email);
  if (inputEmail) {
    const emailMatches =
      normalizeEmail(candidate.email) === inputEmail ||
      candidate.emails?.some((entry) => normalizeEmail(entry.email) === inputEmail);
    if (emailMatches) {
      reasons.push("email");
      score += 100;
    }
  }

  const inputPhone = normalizePhone(input.phone);
  if (inputPhone) {
    const phoneMatches =
      normalizePhone(candidate.phone) === inputPhone ||
      candidate.phones?.some((entry) => normalizePhone(entry.phone) === inputPhone);
    if (phoneMatches) {
      reasons.push("phone");
      score += 80;
    }
  }

  const firstName = input.firstName?.trim().toLowerCase();
  const lastName = input.lastName?.trim().toLowerCase();
  const company = input.company?.trim().toLowerCase();
  if (firstName && lastName && company) {
    const nameCompanyMatch =
      candidate.firstName.trim().toLowerCase() === firstName &&
      candidate.lastName.trim().toLowerCase() === lastName &&
      (candidate.company?.trim().toLowerCase() ?? "") === company;
    if (nameCompanyMatch) {
      reasons.push("name_company");
      score += 50;
    }
  }

  if (!reasons.length) return null;
  return { contactId: candidate.id, score, reasons };
};

export const pickPrimaryEmail = (
  emails: Array<{ email: string; isPrimary: boolean }>,
): string | undefined => {
  const primary = emails.find((entry) => entry.isPrimary);
  return normalizeEmail(primary?.email ?? emails[0]?.email);
};

export const pickPrimaryPhone = (
  phones: Array<{ phone: string; isPrimary: boolean }>,
): string | undefined => {
  const primary = phones.find((entry) => entry.isPrimary);
  const value = primary?.phone ?? phones[0]?.phone;
  return value ? formatPhoneDisplay(value) : undefined;
};

export interface CsvContactRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status?: string;
  notes?: string;
  leadSource?: string;
}

const CSV_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "company",
  "job_title",
  "status",
  "lead_source",
  "notes",
] as const;

export const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const contactsToCsv = (rows: CsvContactRow[]): string => {
  const header = CSV_HEADERS.join(",");
  const body = rows.map((row) =>
    [
      row.firstName,
      row.lastName,
      row.email ?? "",
      row.phone ?? "",
      row.company ?? "",
      row.jobTitle ?? "",
      row.status ?? "",
      row.leadSource ?? "",
      row.notes ?? "",
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(","),
  );
  return [header, ...body].join("\n");
};

export const parseCsvContacts = (csv: string): CsvContactRow[] => {
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
      status: get("status"),
      leadSource: get("lead_source"),
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
