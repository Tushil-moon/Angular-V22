import {
  assertCaseTransition,
  evaluateSlaBreaches,
  generateCaseNumber,
  resolveSlaDueDates,
} from "../modules/cases/case.utils";

describe("case.utils", () => {
  it("generates sequential case numbers", () => {
    const year = new Date().getFullYear();
    expect(generateCaseNumber(7)).toBe(`CS-${year}-0007`);
  });

  it("calculates SLA due dates from policy hours", () => {
    const createdAt = new Date("2026-07-06T10:00:00.000Z");
    const due = resolveSlaDueDates({ firstResponseHours: 4, resolutionHours: 24 }, createdAt);
    expect(due.firstResponseDueAt.toISOString()).toBe("2026-07-06T14:00:00.000Z");
    expect(due.resolutionDueAt.toISOString()).toBe("2026-07-07T10:00:00.000Z");
  });

  it("allows valid case transitions", () => {
    expect(() => assertCaseTransition("OPEN", "IN_PROGRESS")).not.toThrow();
    expect(() => assertCaseTransition("RESOLVED", "CLOSED")).not.toThrow();
    expect(() => assertCaseTransition("CLOSED", "OPEN")).not.toThrow();
  });

  it("detects SLA breaches for overdue response and resolution", () => {
    const now = new Date("2026-07-06T12:00:00.000Z");
    expect(
      evaluateSlaBreaches({
        slaBreached: false,
        status: "OPEN",
        firstResponseDueAt: new Date("2026-07-06T11:00:00.000Z"),
        resolutionDueAt: new Date("2026-07-07T12:00:00.000Z"),
        firstRespondedAt: null,
        resolvedAt: null,
        now,
      }),
    ).toBe(true);

    expect(
      evaluateSlaBreaches({
        slaBreached: false,
        status: "IN_PROGRESS",
        firstResponseDueAt: null,
        resolutionDueAt: new Date("2026-07-06T11:00:00.000Z"),
        firstRespondedAt: new Date("2026-07-06T10:00:00.000Z"),
        resolvedAt: null,
        now,
      }),
    ).toBe(true);
  });
});
