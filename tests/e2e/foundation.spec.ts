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

test("account setup requires an invitation or authenticated session",async({page})=>{
 await page.goto("/auth/accept");
 await expect(page.getByText("Open the setup link from your invitation email.",{exact:false})).toBeVisible();
 await expect(page.getByRole("button",{name:"Accept invitation"})).toHaveCount(0);
 await page.goto("/auth/accept?token_hash=unverified-token");
 await expect(page.getByRole("button",{name:"Accept invitation"})).toBeVisible();
 await expect(page).toHaveURL(/\/auth\/accept/);
 await page.goto("/auth/setup");
 await expect(page.getByRole("heading",{name:"Open your invitation"})).toBeVisible();
 await expect(page.getByLabel("Choose a password")).toHaveCount(0);
});

test("assessment deep links preserve the requested view through sign-in",async({page})=>{
 const path="/teacher/classes/70000000-0000-4000-8000-000000000001?tab=assessments&assessment=90000000-0000-4000-8000-000000000001";
 await page.goto(path);
 await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Publish scores"})).toHaveCount(0);
});
