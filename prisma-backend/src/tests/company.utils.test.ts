import {
  assertValidParentCompany,
  buildCompanyTree,
  collectCompanyDescendantIds,
  companiesToCsv,
  normalizeDomain,
  parseCsvCompanies,
  scoreCompanyDuplicate,
} from "../modules/companies/company.utils";

describe("company.utils", () => {
  describe("normalizeDomain", () => {
    it("strips protocol and path", () => {
      expect(normalizeDomain("https://Acme.IO/about")).toBe("acme.io");
    });
  });

  describe("scoreCompanyDuplicate", () => {
    const candidate = { id: "company-1", name: "Acme Corp", domain: "acme.io" };

    it("scores domain matches highest", () => {
      const result = scoreCompanyDuplicate(candidate, { domain: "acme.io" });
      expect(result?.reasons).toContain("domain");
      expect(result?.score).toBeGreaterThanOrEqual(100);
    });

    it("excludes the same company id", () => {
      const result = scoreCompanyDuplicate(candidate, {
        domain: "acme.io",
        excludeCompanyId: "company-1",
      });
      expect(result).toBeNull();
    });
  });

  describe("buildCompanyTree", () => {
    it("nests subsidiaries under parents", () => {
      const tree = buildCompanyTree([
        {
          id: "parent",
          parentCompanyId: null,
          name: "Acme Corp",
          domain: "acme.io",
          industry: "Tech",
          ownershipPercent: null,
          employeeCount: 500,
        },
        {
          id: "child",
          parentCompanyId: "parent",
          name: "Acme Labs",
          domain: "labs.acme.io",
          industry: "Tech",
          ownershipPercent: 100,
          employeeCount: 50,
        },
      ]);

      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe("Acme Labs");
    });
  });

  describe("parent validation", () => {
    it("rejects descendant parent assignment", () => {
      const relations = [
        { id: "parent", parentCompanyId: null },
        { id: "child", parentCompanyId: "parent" },
      ];
      const descendants = collectCompanyDescendantIds(relations, "parent");
      expect(() => assertValidParentCompany("parent", "child", descendants)).toThrow(
        "Cannot assign a descendant as parent company",
      );
    });
  });

  describe("csv helpers", () => {
    it("round-trips csv rows", () => {
      const csv = companiesToCsv([
        { name: "Acme Corp", domain: "acme.io", industry: "Technology" },
      ]);
      const rows = parseCsvCompanies(csv);
      expect(rows[0]).toMatchObject({
        name: "Acme Corp",
        domain: "acme.io",
        industry: "Technology",
      });
    });
  });
});
