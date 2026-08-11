import { expect, test } from "@playwright/test";

test.describe("admin smoke", () => {
  test("signin page loads", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();
  });
});
