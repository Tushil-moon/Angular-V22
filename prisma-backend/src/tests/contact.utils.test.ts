import {
  contactsToCsv,
  normalizeEmail,
  normalizePhone,
  parseCsvContacts,
  scoreDuplicate,
} from "../modules/contacts/contact.utils";

describe("contact.utils", () => {
  describe("normalizeEmail", () => {
    it("lowercases and trims email", () => {
      expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
    });
  });

  describe("normalizePhone", () => {
    it("keeps digits only", () => {
      expect(normalizePhone("+1 (555) 010-2020")).toBe("15550102020");
    });
  });

  describe("scoreDuplicate", () => {
    const candidate = {
      id: "contact-1",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice@acme.io",
      phone: "+1 555-0101",
      company: "Acme Corp",
      emails: [{ email: "alice@acme.io" }],
      phones: [{ phone: "+1 555-0101" }],
    };

    it("scores exact email match highest", () => {
      const result = scoreDuplicate(candidate, { email: "alice@acme.io" });
      expect(result?.reasons).toContain("email");
      expect(result?.score).toBeGreaterThanOrEqual(100);
    });

    it("detects phone and name/company matches", () => {
      const result = scoreDuplicate(candidate, {
        phone: "+1 555-0101",
        firstName: "Alice",
        lastName: "Johnson",
        company: "Acme Corp",
      });
      expect(result?.reasons).toEqual(expect.arrayContaining(["phone", "name_company"]));
    });

    it("excludes the same contact id", () => {
      const result = scoreDuplicate(candidate, {
        email: "alice@acme.io",
        excludeContactId: "contact-1",
      });
      expect(result).toBeNull();
    });
  });

  describe("csv helpers", () => {
    it("round-trips csv rows", () => {
      const csv = contactsToCsv([
        {
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice@example.com",
          company: "Acme, Inc",
        },
      ]);
      const rows = parseCsvContacts(csv);
      expect(rows[0]).toMatchObject({
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        company: "Acme, Inc",
      });
    });
  });
});
