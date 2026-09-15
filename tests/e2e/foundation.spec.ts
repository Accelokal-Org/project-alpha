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

test("attendance date links preserve the chosen date through sign-in",async({page})=>{
 const path="/teacher/classes/70000000-0000-4000-8000-000000000001?tab=attendance&date=2000-01-01";
 await page.goto(path);
 await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Save attendance"})).toHaveCount(0);
});


test("lesson links preserve the selected plan through sign-in",async({page})=>{
 const path="/teacher/classes/70000000-0000-4000-8000-000000000001?tab=lessons&plan=90000000-0000-4000-8000-000000000001";
 await page.goto(path);
 await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Save lesson plan"})).toHaveCount(0);
});

test("school grading keeps its school selection through sign-in",async({page})=>{
 const path="/teacher?view=grading&school=10000000-0000-4000-8000-000000000001";
 await page.goto(path);
 await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Approve scheme"})).toHaveCount(0);
});

test("grade review keeps its period selection through sign-in",async({page})=>{
 const path="/teacher/classes/70000000-0000-4000-8000-000000000001?tab=grades&period=90000000-0000-4000-8000-000000000001";
 await page.goto(path);
 await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Submit period grades"})).toHaveCount(0);
});

test("adviser review and historical grades preserve their destination through sign-in",async({page})=>{
 for(const path of ["/teacher/classes/advisory-50000000-0000-4000-8000-000000000001?tab=grades","/teacher/classes/70000000-0000-4000-8000-000000000001?tab=grades&period=90000000-0000-4000-8000-000000000001&revision=1"]){
  await page.goto(path);await expect(page).toHaveURL(/\/login/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(path);
  await expect(page.locator('input[name="next"]')).toHaveValue(path);
  await expect(page.getByRole("button",{name:"Save review decision"})).toHaveCount(0);
 }
});
