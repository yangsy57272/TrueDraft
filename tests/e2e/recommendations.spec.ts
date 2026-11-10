import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("choosing a major leads to Reach / Target / Safety suggestions and a one-click add", async ({ page }) => {
  await signIn(page);
  await page.goto("/schools/recommended");
  await expect(page.getByRole("heading", { name: "Choose a major first" })).toBeVisible();

  await page.goto("/majors");
  await page.getByPlaceholder("Major name").fill("Computer Science");
  await page.getByLabel("Field of study (for recommendations)").selectOption("11");
  await page.getByRole("button", { name: "Add a major", exact: true }).click();
  await page.getByRole("link", { name: /See colleges for these majors/ }).click();

  await expect(page.getByRole("heading", { name: "Colleges for your majors" })).toBeVisible();
  for (const bucket of ["Reach", "Target", "Safety"]) await expect(page.getByRole("heading", { name: new RegExp(bucket) }).first()).toBeVisible();
  await expect(page.getByText(/not predictions/)).toBeVisible();
  const safety = page.locator("section", { has: page.getByRole("heading", { name: /Safety/ }) });
  const firstCard = safety.getByRole("listitem").first();
  await expect(firstCard.getByText(/Admits \d/)).toBeVisible();
  await firstCard.getByRole("button", { name: "+ Add as Safety" }).click();
  await expect(firstCard.getByText("On my list")).toBeVisible();

  await page.goto("/my-list");
  await expect(page.getByText("Safety").first()).toBeVisible();
});

test("a school's supplemental prompt starts a pre-filled essay", async ({ page }) => {
  await signIn(page);
  await page.goto("/schools/stanford-university#supplements");
  const section = page.locator("#supplements");
  await expect(section.getByRole("heading", { name: /Supplemental essays · 2026–2027/ })).toBeVisible();
  await expect(section.getByText("What is the most significant challenge that society faces today?")).toBeVisible();
  await section.getByRole("link", { name: /Start this essay/ }).first().click();
  await expect(page.getByLabel(/Exact essay prompt/)).toHaveValue("What is the most significant challenge that society faces today?");
  await expect(page.getByLabel(/Word limit/)).toHaveValue("50");
});

test("the personal statement guide lists the Common App prompts and links to starting an essay", async ({ page }) => {
  await page.goto("/guides/personal-statement");
  await expect(page.getByRole("heading", { name: "Personal statement guide", level: 1 })).toBeVisible();
  await expect(page.getByText(/Share an essay on any topic of your choice/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Step by step" })).toBeVisible();
});
