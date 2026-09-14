import { expect, test } from "@playwright/test";
test("preview roster is searchable and isolated from protected routes", async ({ page }) => {
 await page.goto("/preview");
 await expect(page.getByRole("heading", { name: "My workspace" })).toBeVisible();
 await page.getByRole("link", { name: "Open Mathematics, Grade 8 · Acacia roster" }).click();
 await expect(page.getByRole("heading", { name: "Grade 8 · Acacia" })).toBeVisible();
 await page.getByRole("textbox", { name: "Search students" }).fill("Sofia");
 await expect(page.getByRole("cell", { name: "Alonzo, Sofia" })).toBeVisible();
 await expect(page.getByRole("cell", { name: "Bautista, Miguel" })).toHaveCount(0);
 await page.goto("/teacher/classes/70000000-0000-4000-8000-000000000001");
 await expect(page).toHaveURL(/\/login/);
 await expect(page.getByRole("cell", { name: "Alonzo, Sofia" })).toHaveCount(0);
});
test("a student route requires authentication", async ({ page }) => {
 await page.goto("/student");
 await expect(page).toHaveURL(/\/login/);
});
