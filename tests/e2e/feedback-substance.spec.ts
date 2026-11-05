import { expect, test } from "@playwright/test";
import { createEssay, signIn } from "./helpers";

async function agreeAndRun(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByLabel(/I understand that AI processing/).check();
  await page.getByRole("button", { name: "Agree and get feedback" }).click();
}

test("too little material produces an honest 'not enough yet' result, not padded feedback", async ({ page }) => {
  await signIn(page);
  await createEssay(page, "Two short sentences. [[mock:insufficient]]");
  await agreeAndRun(page);
  await expect(page.getByRole("heading", { name: "Not enough material for full feedback yet" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/What moment comes to mind first/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "B. Essay diagnostic" })).toHaveCount(0);
});

test("incomplete AI feedback is never shown", async ({ page }) => {
  await signIn(page);
  await createEssay(page, "A draft with enough words to review, about a night market stall. [[mock:incomplete]]");
  await agreeAndRun(page);
  await expect(page.getByText(/feedback was missing required parts/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "B. Essay diagnostic" })).toHaveCount(0);
});
