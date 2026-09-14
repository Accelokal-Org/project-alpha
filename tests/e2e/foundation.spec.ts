import { expect, test } from "@playwright/test";
test("sample workspace is removed", async ({ page }) => {
 const response = await page.goto("/preview");
 expect(response?.status()).toBe(404);
 await page.goto("/login");
 await expect(page.locator('a[href="/preview"]')).toHaveCount(0);
});
test("school workspaces require authentication", async ({ page }) => {
 for (const path of ["/teacher", "/student"]) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(path);
  await expect(page.locator('input[name="next"]')).toHaveValue(path);
 }
});
