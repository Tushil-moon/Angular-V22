import {
  assertCampaignTransition,
  calculateClickRate,
  calculateOpenRate,
} from "../modules/campaigns/campaign.utils";

describe("campaign.utils", () => {
  it("allows valid campaign transitions", () => {
    expect(() => assertCampaignTransition("DRAFT", "ACTIVE")).not.toThrow();
    expect(() => assertCampaignTransition("ACTIVE", "COMPLETED")).not.toThrow();
    expect(() => assertCampaignTransition("COMPLETED", "DRAFT")).not.toThrow();
  });

  it("blocks invalid campaign transitions", () => {
    expect(() => assertCampaignTransition("DRAFT", "COMPLETED")).not.toThrow();
    expect(() => assertCampaignTransition("COMPLETED", "ACTIVE")).toThrow();
  });

  it("calculates engagement rates", () => {
    expect(calculateOpenRate(100, 42)).toBe(42);
    expect(calculateClickRate(200, 15)).toBe(7.5);
    expect(calculateOpenRate(0, 0)).toBe(0);
  });
});
