import { expect, test } from "@playwright/test";
import { createEssay, signIn } from "./helpers";

test("feedback works as a revision checklist: tasks, show passage, stale notice", async ({ page }) => {
  await signIn(page);
  const url = await createEssay(page, "Every Saturday I help at my aunt's noodle stall. People walk in loops near the tea stall.");
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByLabel(/I understand that AI processing/).check();
  await page.getByRole("button", { name: "Agree and get feedback" }).click();

  const tasks = page.getByRole("region", { name: "Your revision tasks" });
  await expect(tasks).toBeVisible({ timeout: 20_000 });
  await expect(tasks.getByText("0 of 3 done")).toBeVisible();
  await tasks.getByLabel("Progress on task 1").selectOption("done");
  await expect(tasks.getByText("1 of 3 done")).toBeVisible();
  // Detail sections are collapsed in the panel but their headings stay visible.
  await expect(page.getByRole("heading", { name: "C. Passage comments" })).toBeVisible();

  // "Show in my draft" selects the quoted passage in the editor.
  await page.getByRole("heading", { name: "C. Passage comments" }).click();
  await page.getByRole("button", { name: "Show in my draft" }).first().click();
  const selected = await page.getByLabel("Essay draft").evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd));
  expect(selected.length).toBeGreaterThan(0);
  expect("Every Saturday I help at my aunt's noodle stall. People walk in loops near the tea stall.").toContain(selected);

  // Editing the draft marks the feedback as possibly out of date.
  const editor = page.getByLabel("Essay draft");
  await editor.click();
  await editor.press("Control+End");
  await page.keyboard.type(" A new sentence.");
  await expect(page.getByText(/Your draft has changed since then/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Get feedback on the current draft" })).toBeVisible();

  // Task progress persists.
  await expect(page.getByText(/^Saved \d/)).toBeVisible({ timeout: 10_000 });
  await page.goto(url);
  await expect(page.getByRole("region", { name: "Your revision tasks" }).getByText("1 of 3 done")).toBeVisible();
  await expect(page.getByText(/Your draft has changed since then/)).toBeVisible();
});
