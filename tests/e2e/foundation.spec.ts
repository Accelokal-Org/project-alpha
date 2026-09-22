import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {TemplateDownloadLink} from "../../components/account-imports/template-download";
import {readFile} from "node:fs/promises";
import {parseImport} from "../../features/account-imports/schema";
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

test("completion dashboard preserves school, year and status during sign-in",async({page})=>{
 const path="/teacher?view=completion&school=10000000-0000-4000-8000-000000000001&year=20000000-0000-4000-8000-000000000001&status=locked&page=1";
 await page.goto(path);await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Unlock grades"})).toHaveCount(0);
});

test("report-card preview preserves the selected student through sign-in",async({page})=>{
 const path="/teacher/classes/advisory-50000000-0000-4000-8000-000000000001?tab=report-cards&student=80000000-0000-4000-8000-000000000001";
 await page.goto(path);await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByLabel("Student",{exact:true})).toHaveCount(0);
});

 test("saved report version preserves its destination through sign-in",async({page})=>{
 const path="/teacher/classes/advisory-50000000-0000-4000-8000-000000000001?tab=report-cards&student=80000000-0000-4000-8000-000000000001&report_version=2";
 await page.goto(path);await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.locator('input[name="next"]')).toHaveValue(path);
 await expect(page.getByRole("button",{name:"Approve report-card version"})).toHaveCount(0);
});

test("school account import protects batch destinations and serves a blank template",async({page,request})=>{
 const path="/teacher?view=accounts&school=10000000-0000-4000-8000-000000000001&batch=97000000-0000-4000-8000-000000000001";
 await page.goto(path);await expect(page).toHaveURL(/\/login/);
 expect(new URL(page.url()).searchParams.get("next")).toBe(path);
 await expect(page.getByRole("button",{name:"Create users and prepare invitations"})).toHaveCount(0);
 const response=await request.get("/templates/user-import.csv");expect(response.ok()).toBeTruthy();expect((await response.text()).trim()).toBe("Username,Last Name,First Name,Email,Role");
});

test("user template downloads as an Excel-compatible CSV and matches the importer",async({page,request})=>{
 const response=await request.get("/templates/user-import.csv");
 expect(response.headers()["content-disposition"]).toBe('attachment; filename="deskonekt-user-import.csv"');
 expect(response.headers()["content-type"]).toContain("text/csv");
 await page.goto("/login");
 const downloading=page.waitForEvent("download");
 await page.evaluate(()=>{const link=document.createElement("a");link.href="/templates/user-import.csv";document.body.append(link);link.click();link.remove();});
 const download=await downloading;
 expect(download.suggestedFilename()).toBe("deskonekt-user-import.csv");
 expect(await download.failure()).toBeNull();
 const path=await download.path();expect(path).not.toBeNull();
 const bytes=await readFile(path!);
 expect([...bytes.subarray(0,3)]).toEqual([0xef,0xbb,0xbf]);
 expect(bytes.toString("utf8")).toBe("\uFEFFUsername,Last Name,First Name,Email,Role\r\n");
 // Exercise the downloaded headers with one isolated row, never submitted to the application.
 expect(parseImport(bytes.toString("utf8")+"teacher.one,Cruz,Ana,ana@example.test,TEACHER\r\n")).toEqual([{username:"teacher.one",last_name:"Cruz",first_name:"Ana",email:"ana@example.test",role:"TEACHER"}]);
});

test("actual template link downloads offline without hydration or an HTTP request",async({page,context})=>{
 await page.setContent(renderToStaticMarkup(createElement(TemplateDownloadLink)));
 await context.setOffline(true);
 try {
  const downloading=page.waitForEvent("download");
  await page.getByRole("link",{name:"Download CSV template",exact:true}).click();
  const download=await downloading;
  expect(download.suggestedFilename()).toBe("deskonekt-user-import.csv");
  expect(await download.failure()).toBeNull();
  const path=await download.path();expect(path).not.toBeNull();
  expect((await readFile(path!)).toString("utf8")).toBe("\uFEFFUsername,Last Name,First Name,Email,Role\r\n");
 } finally {await context.setOffline(false);}
});

test("invitation callback reports expired links instead of generic setup instructions",async({page})=>{
 await page.goto("/auth/accept#error=access_denied&error_code=otp_expired&error_description=untrusted-description");
 await expect(page.getByRole("alert").filter({hasText:"This invitation link"})).toContainText("invalid or expired");
 await expect(page.getByText("untrusted-description")).toHaveCount(0);
 await expect(page.getByRole("button",{name:/Accept invitation/i})).toHaveCount(0);
 await page.goto("/auth/accept?error_code=otp_expired");
 await expect(page.getByRole("alert").filter({hasText:"This invitation link"})).toContainText("invalid or expired");
});
