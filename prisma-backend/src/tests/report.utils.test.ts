import {
  normalizeReportConfig,
  normalizeReportDefinition,
  rowsToCsv,
} from "../modules/reports/report.utils";

describe("report.utils", () => {
  it("normalizes report config with valid groupBy", () => {
    const config = normalizeReportConfig("deals", { groupBy: "stage", limit: 50 });
    expect(config.groupBy).toBe("stage");
    expect(config.limit).toBe(50);
  });

  it("rejects invalid groupBy fields", () => {
    expect(() => normalizeReportConfig("deals", { groupBy: "invalid" })).toThrow();
  });

  it("normalizes report definition", () => {
    expect(normalizeReportDefinition({ groupBy: "stage", limit: 25 })).toEqual({
      groupBy: "stage",
      limit: 25,
    });
  });

  it("converts rows to CSV", () => {
    const csv = rowsToCsv(
      [
        { key: "stage", label: "Stage" },
        { key: "count", label: "Count" },
      ],
      [{ stage: "LEAD", count: 3 }],
    );
    expect(csv).toContain("Stage,Count");
    expect(csv).toContain("LEAD,3");
  });
});
