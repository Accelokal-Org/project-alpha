import {expect,test} from "@playwright/test";
test("hidden admin route requires authentication and has a dedicated login",async({page})=>{
 await page.goto("/deskonekt/admin");
 await expect(page).toHaveURL(/\/deskonekt\/admin\/login$/);
 await expect(page.getByRole("heading",{name:"Superadmin sign-in"})).toBeVisible();
 await expect(page.getByLabel("Superadmin email")).toBeVisible();
 await expect(page.getByRole("heading",{name:"Schools"})).toHaveCount(0);
 await page.goto("/login");
 await expect(page.locator('a[href*="/deskonekt/admin"]')).toHaveCount(0);
});
