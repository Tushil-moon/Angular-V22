import {
  evaluatePasswordPolicy,
  getPasswordPolicyIssues,
  isPasswordPolicyCompliant,
  PASSWORD_MIN_LENGTH,
} from "../shared/validation/password-policy";

describe("password policy", () => {
  it("rejects weak passwords", () => {
    expect(isPasswordPolicyCompliant("short")).toBe(false);
    expect(getPasswordPolicyIssues("short")).toContain(
      `At least ${PASSWORD_MIN_LENGTH} characters`,
    );
  });

  it("accepts compliant passwords", () => {
    const password = "Str0ng!Pass";
    expect(isPasswordPolicyCompliant(password)).toBe(true);
    expect(evaluatePasswordPolicy(password)).toEqual({
      min_length: true,
      lowercase: true,
      uppercase: true,
      number: true,
      symbol: true,
    });
  });
});
