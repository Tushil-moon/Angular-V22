import {
  calculateNextDueDate,
  isActivityOverdue,
  resolveInitialStatus,
} from "../modules/activities/activity.utils";

describe("activity.utils", () => {
  it("marks logged activities as completed by default", () => {
    expect(resolveInitialStatus("CALL")).toBe("COMPLETED");
    expect(resolveInitialStatus("NOTE")).toBe("COMPLETED");
  });

  it("keeps tasks with due dates pending", () => {
    expect(resolveInitialStatus("TASK", null, new Date("2026-07-10"))).toBe("PENDING");
  });

  it("detects overdue pending tasks", () => {
    expect(
      isActivityOverdue("PENDING", new Date("2020-01-01"), new Date("2026-07-01")),
    ).toBe(true);
    expect(isActivityOverdue("COMPLETED", new Date("2020-01-01"))).toBe(false);
  });

  it("calculates next recurrence dates", () => {
    const current = new Date("2026-07-01T10:00:00.000Z");
    const weekly = calculateNextDueDate(current, "WEEKLY", 1);
    expect(weekly.toISOString()).toBe("2026-07-08T10:00:00.000Z");

    const monthly = calculateNextDueDate(current, "MONTHLY", 2);
    expect(monthly.getMonth()).toBe(8);
  });
});
