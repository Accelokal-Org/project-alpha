import {expect,test} from "@playwright/test";
test("account confirmation shows pending feedback and prevents duplicate submission",async({page})=>{
 await page.goto("/auth/accept?token_hash=unverified-token");
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/auth/accept**",async route=>{
  if(route.request().method()==="POST"){await gate;await route.abort("failed");}else await route.continue();
 });
 try {
  await page.getByRole("button",{name:"Accept invitation"}).click();
  await expect(page.getByRole("button",{name:"Confirming…"})).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Please wait");
  await expect(page.locator('form[aria-busy="true"]')).toBeVisible();
 } finally {release();}
 await expect(page.getByRole("button",{name:"Try again"})).toBeVisible();
});
test("navigation shows feedback during a slow page request",async({page})=>{
 await page.goto("/auth/accept");
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/login**",async route=>{await gate;await route.continue();});
 try {
  await page.getByRole("link",{name:"School sign-in"}).click();
  await expect(page.getByRole("status").filter({hasText:/Loading/}).first()).toBeVisible();
 } finally {release();}
 await expect(page.getByRole("heading",{name:"Sign in to your school"})).toBeVisible();
});
