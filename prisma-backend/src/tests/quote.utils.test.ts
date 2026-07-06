import {
  assertQuoteTransition,
  calculateLineTotal,
  calculateQuoteTotals,
  generateQuoteNumber,
} from "../modules/quotes/quote.utils";

describe("quote.utils", () => {
  it("calculates line totals with discounts", () => {
    expect(calculateLineTotal(2, 100, 10)).toBe(180);
    expect(calculateLineTotal(1, 49.99, 0)).toBe(49.99);
  });

  it("calculates quote totals with discount and tax", () => {
    const totals = calculateQuoteTotals(
      [{ lineTotal: 100 }, { lineTotal: 50 }],
      10,
      8,
    );

    expect(totals.subtotal).toBe(150);
    expect(totals.discountAmount).toBe(15);
    expect(totals.taxAmount).toBe(10.8);
    expect(totals.total).toBe(145.8);
  });

  it("generates sequential quote numbers", () => {
    const year = new Date().getFullYear();
    expect(generateQuoteNumber(1)).toBe(`Q-${year}-0001`);
    expect(generateQuoteNumber(42)).toBe(`Q-${year}-0042`);
  });

  it("allows valid lifecycle transitions", () => {
    expect(() => assertQuoteTransition("DRAFT", "SENT")).not.toThrow();
    expect(() => assertQuoteTransition("SENT", "ACCEPTED")).not.toThrow();
    expect(() => assertQuoteTransition("SENT", "REJECTED")).not.toThrow();
  });

  it("blocks invalid lifecycle transitions", () => {
    expect(() => assertQuoteTransition("DRAFT", "ACCEPTED")).toThrow();
    expect(() => assertQuoteTransition("ACCEPTED", "SENT")).toThrow();
  });
});
