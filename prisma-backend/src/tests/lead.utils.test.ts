import {
  calculateLeadScore,
  isOpenLeadStage,
  leadsToCsv,
  parseCsvLeads,
  scoreToRating,
} from "../modules/leads/lead.utils";

describe("lead.utils", () => {
  describe("calculateLeadScore", () => {
    it("sums matching rule points", () => {
      const score = calculateLeadScore(
        { leadSource: "WEBSITE", email: "lead@example.com" },
        [
          { field: "lead_source", operator: "eq", value: "WEBSITE", points: 20, active: true },
          { field: "email", operator: "eq", value: "present", points: 15, active: true },
          { field: "lead_source", operator: "eq", value: "REFERRAL", points: 50, active: true },
        ],
      );
      expect(score).toBe(35);
    });
  });

  describe("scoreToRating", () => {
    it("maps score bands to ratings", () => {
      expect(scoreToRating(80)).toBe("HOT");
      expect(scoreToRating(50)).toBe("WARM");
      expect(scoreToRating(10)).toBe("COLD");
    });
  });

  describe("isOpenLeadStage", () => {
    it("treats converted and lost as closed", () => {
      expect(isOpenLeadStage("NEW")).toBe(true);
      expect(isOpenLeadStage("CONVERTED")).toBe(false);
      expect(isOpenLeadStage("LOST")).toBe(false);
    });
  });

  describe("csv helpers", () => {
    it("round-trips csv rows", () => {
      const csv = leadsToCsv([
        {
          firstName: "Bob",
          lastName: "Smith",
          email: "bob@example.com",
          stage: "NEW",
        },
      ]);
      const rows = parseCsvLeads(csv);
      expect(rows[0]).toMatchObject({
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@example.com",
        stage: "NEW",
      });
    });
  });
});
