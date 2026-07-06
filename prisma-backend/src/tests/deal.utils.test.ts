import {
  computeWeightedValue,
  isOpenDealStage,
  OPEN_DEAL_STAGES,
  resolveDealProbability,
} from "../modules/deals/deal.utils";

describe("deal.utils", () => {
  it("computes weighted value from probability", () => {
    expect(computeWeightedValue(10000, 50)).toBe(5000);
    expect(computeWeightedValue(48000, 75)).toBe(36000);
  });

  it("prefers deal probability override", () => {
    expect(resolveDealProbability(60, 25)).toBe(60);
    expect(resolveDealProbability(null, 25)).toBe(25);
  });

  it("identifies open deal stages", () => {
    expect(isOpenDealStage("PROPOSAL")).toBe(true);
    expect(isOpenDealStage("WON")).toBe(false);
    expect(OPEN_DEAL_STAGES).not.toContain("LOST");
  });
});
