import { toSnakeCaseDeep, toSnakeCaseKey } from "../shared/utils/snake-case";

describe("snake-case", () => {
  it("converts camelCase keys to snake_case", () => {
    expect(toSnakeCaseKey("emailVerified")).toBe("email_verified");
    expect(toSnakeCaseKey("pageSize")).toBe("page_size");
    expect(toSnakeCaseKey("id")).toBe("id");
  });

  it("deep-converts nested API payloads", () => {
    expect(
      toSnakeCaseDeep({
        accessToken: "token",
        user: {
          emailVerified: true,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        recentActivity: [{ fullName: "Jane Doe", dealCount: 2 }],
        pageSize: 20,
        hasMore: true,
      }),
    ).toEqual({
      access_token: "token",
      user: {
        email_verified: true,
        created_at: "2026-01-01T00:00:00.000Z",
      },
      recent_activity: [{ full_name: "Jane Doe", deal_count: 2 }],
      page_size: 20,
      has_more: true,
    });
  });
});
