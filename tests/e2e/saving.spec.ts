import { expect, test, type Page } from "@playwright/test";
import { createEssay, signIn } from "./helpers";

/** Hold every draft save for `ms`, so typing continues while earlier saves are still in flight. */
async function delayDraftSaves(page: Page, ms: number) {
  let maxConcurrent = 0;
  let current = 0;
  await page.route(/\/api\/essays\/[0-9a-f-]{36}\/draft$/, async (route) => {
    current += 1;
    maxConcurrent = Math.max(maxConcurrent, current);
    await new Promise((r) => setTimeout(r, ms));
    try {
      await route.continue();
    } finally {
      current -= 1;
    }
  });
  return () => maxConcurrent;
}

async function typeAtEnd(page: Page, text: string) {
  const editor = page.getByLabel("Essay draft");
  await editor.click();
  await editor.press("Control+End");
  await page.keyboard.type(text);
}

test("the latest text survives slow saves, version saves, feedback, and reloads", async ({ page }) => {
  await signIn(page);
  const url = await createEssay(page, "First line of my draft.");
  const maxConcurrent = await delayDraftSaves(page, 1500);

  // Slow saves while typing continues.
  await typeAtEnd(page, " Second line.");
  await page.waitForTimeout(1400); // the debounced save is now in flight
  await typeAtEnd(page, " Third line, typed during a save.");

  // Save a version while still typing.
  await page.getByRole("button", { name: "Save version" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save version" }).click();
  await typeAtEnd(page, " Fourth line, typed during the version save.");
  await expect(page.getByText(/Saved as version 2/)).toBeVisible();
  // Reload without typing anything else: text typed during the version save must have been saved.
  await expect(page.getByText(/^Saved \d/)).toBeVisible({ timeout: 20_000 });
  await page.goto(url);
  await expect(page.getByLabel("Essay draft")).toHaveValue(
    "First line of my draft. Second line. Third line, typed during a save. Fourth line, typed during the version save.",
  );

  // Get feedback (development mock) and keep typing while it runs.
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByLabel(/I understand that AI processing/).check();
  await page.getByRole("button", { name: "Agree and get feedback" }).click();
  await typeAtEnd(page, " Fifth line, typed during feedback.");
  await expect(page.getByRole("heading", { name: "A. Overall response" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^Saved \d/)).toBeVisible({ timeout: 20_000 });
  await page.goto(url);
  await expect(page.getByLabel("Essay draft")).toHaveValue(/Fifth line, typed during feedback\.$/);
  await typeAtEnd(page, " Sixth line.");

  await expect(page.getByText(/^Saved \d/)).toBeVisible({ timeout: 20_000 });
  expect(maxConcurrent()).toBe(1);
  await page.goto(url);
  await expect(page.getByLabel("Essay draft")).toHaveValue(
    "First line of my draft. Second line. Third line, typed during a save. Fourth line, typed during the version save. Fifth line, typed during feedback. Sixth line.",
  );
});

test("navigating away waits for the pending save", async ({ page }) => {
  await signIn(page);
  const url = await createEssay(page, "Start.");
  await delayDraftSaves(page, 1200);
  await typeAtEnd(page, " Typed just before leaving.");
  await page.getByRole("link", { name: "← Dashboard" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto(url);
  await expect(page.getByLabel("Essay draft")).toHaveValue("Start. Typed just before leaving.");
});

test("a second tab can't silently overwrite newer text", async ({ page, context }) => {
  await signIn(page);
  const url = await createEssay(page, "Shared start.");
  const other = await context.newPage();
  await other.goto(url);

  await typeAtEnd(page, " Written in tab one.");
  await expect(page.getByText(/^Saved \d/)).toBeVisible({ timeout: 10_000 });

  await typeAtEnd(other, " Written in tab two.");
  await expect(other.getByRole("alert").getByText("This essay was changed in another tab or device")).toBeVisible({ timeout: 10_000 });
  await expect(other.getByLabel("Essay draft")).toHaveValue("Shared start. Written in tab two.");

  // Nothing was overwritten.
  await page.reload();
  await expect(page.getByLabel("Essay draft")).toHaveValue("Shared start. Written in tab one.");

  // The student chooses to keep tab two's text.
  await other.getByRole("button", { name: "Keep this text (replace the other copy)" }).click();
  await expect(other.getByText(/^Saved \d/)).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByLabel("Essay draft")).toHaveValue("Shared start. Written in tab two.");
});

test("export waits for the save and refuses to export stale text", async ({ page }) => {
  await signIn(page);
  await createEssay(page, "Export me.");
  await page.route(/\/api\/essays\/[0-9a-f-]{36}\/draft$/, (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"internal_error"}}' }));
  await typeAtEnd(page, " Unsaved addition.");
  await page.getByRole("button", { name: /Export/ }).click();
  await page.getByRole("menuitem", { name: /Markdown/ }).click();
  await expect(page.getByText(/Export waits for your latest changes to save/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy my text" })).toBeVisible();
  await expect(page.getByLabel("Essay draft")).toHaveValue("Export me. Unsaved addition.");
});
