import {expect,test} from "@playwright/test";
// Explicit opt-in: creates a NEW fictional school in the configured test environment.
// Does not delete schools or modify existing records.
test("live superadmin can create and inspect a fictional school",async({page})=>{
 test.skip(process.env.RUN_ADMIN_LIVE_TESTS!=="true"||!process.env.E2E_ADMIN_EMAIL||!process.env.E2E_ADMIN_PASSWORD,"Requires a configured test Supabase project and explicit live-test credentials.");
 await page.goto("/deskonekt/admin/login");
 await page.getByLabel("Superadmin email").fill(process.env.E2E_ADMIN_EMAIL!);
 await page.getByLabel("Password",{exact:true}).fill(process.env.E2E_ADMIN_PASSWORD!);
 await page.getByRole("button",{name:"Sign in",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Schools & testing"})).toBeVisible();
 const name=`E2E Deskonekt ${Date.now()}`;
 const form=page.locator("section").filter({has:page.getByRole("heading",{name:"Create test school",exact:true})});
 await form.getByLabel("Test school name").fill(name);
 await form.getByRole("button",{name:"Create test school",exact:true}).click();
 await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
 await page.getByRole("link",{name:"people",exact:true}).click();
 await expect(page.getByRole("cell",{name:"Andrea Reyes",exact:true})).toBeVisible();
 await expect(page.getByRole("cell",{name:"Alonzo, Sofia",exact:true})).toBeVisible();
 await page.getByRole("link",{name:"subjects",exact:true}).click();
 await page.getByRole("link",{name:"Open roster",exact:true}).first().click();
 await expect(page.getByRole("heading",{name:/Grade 8/})).toBeVisible();
 await expect(page.getByText("6 students",{exact:true})).toBeVisible();
});
