import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createEssay, signIn } from "./helpers";

test("student can sign in, write, save without AI, get feedback, version, compare, and delete", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Start your first essay workspace" })).toBeVisible();

  const essayUrl = await createEssay(page);
  const editor = page.getByLabel("Essay draft");
  await expect(editor).toHaveValue(/noodle stall/);

  // Autosave
  await editor.click();
  await editor.press("End");
  await editor.press("Control+End");
  await page.keyboard.type(" I now see patterns everywhere.");
  await expect(page.getByText(/^Saved \d/)).toBeVisible({ timeout: 10_000 });

  // Consent appears before the first AI request; "save without AI" works.
  await page.getByRole("button", { name: "Get feedback" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/will be sent to the configured AI provider/)).toBeVisible();
  await dialog.getByText("Learn what is sent").click();
  await expect(dialog.getByText("Never sent")).toBeVisible();
  await dialog.getByRole("button", { name: "Save without AI analysis" }).click();
  await expect(page.getByText(/Saved as version 2/)).toBeVisible();

  // Now agree and get (mock) feedback, clearly labelled as not real.
  await page.getByRole("button", { name: "Get feedback" }).click();
  await page.getByLabel(/I understand that AI processing/).check();
  await page.getByRole("button", { name: "Agree and get feedback" }).click();
  await expect(page.getByRole("heading", { name: "A. Overall response" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Development mock: this is placeholder text/).first()).toBeVisible();
  for (const section of ["B. Essay diagnostic", "C. Passage comments", "D. Revision plan", "E. Voice check"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }

  // Versions + comparison
  await editor.click();
  await editor.press("Control+End");
  await page.keyboard.type("\n\nA new closing paragraph.");
  await page.getByRole("button", { name: "Save version" }).click();
  await page.getByLabel(/Version note/).fill("Added ending");
  await page.getByRole("dialog").getByRole("button", { name: "Save version" }).click();
  await expect(page.getByText(/Saved as version 3/)).toBeVisible();
  await page.getByRole("tab", { name: "Versions" }).click();
  await expect(page.getByText("“Added ending”")).toBeVisible();
  await page.getByRole("link", { name: "Compare versions" }).click();
  await expect(page.getByRole("heading", { name: "Compare versions" })).toBeVisible();
  await expect(page.locator("ins.diff-ins").first()).toContainText("A new closing paragraph");

  // Full feedback page
  await page.goto(essayUrl);
  await page.getByRole("link", { name: "Open full feedback view" }).click();
  await expect(page.getByRole("heading", { name: "Full feedback" })).toBeVisible();

  // Delete the essay
  await page.goto(essayUrl);
  await page.getByRole("button", { name: /Export/ }).click();
  await page.getByRole("menuitem", { name: "Delete essay" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("E2E essay")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("another student cannot open someone else's essay by changing the URL", async ({ browser }) => {
  const a = await browser.newPage();
  await signIn(a);
  const url = await createEssay(a, "A private sentence only Alice wrote.");
  const b = await (await browser.newContext()).newPage();
  await signIn(b);
  const res = await b.goto(url);
  expect(res?.status()).toBe(404);
  await expect(b.getByText("A private sentence only Alice wrote.")).toHaveCount(0);
});

test("private pages redirect to sign-in when signed out", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/sign-in");
});

test("server secrets and essay text never appear in client bundles or URLs", async ({ page }) => {
  // Collect the actual secret values configured for this server (names may legitimately appear).
  const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
  const secrets = env
    .split("\n")
    .filter((l) => /^(ANTHROPIC_API_KEY|AI_API_KEY|ENCRYPTION_KEYS|BETTER_AUTH_SECRET|CRON_SECRET|SMTP_URL)=/.test(l))
    .map((l) => l.slice(l.indexOf("=") + 1).replace(/^k\d+:/, ""))
    .filter((v) => v.length >= 8);
  await signIn(page);
  const essayUrl = await createEssay(page, "Unique phrase zebra-lantern-42 in my essay.");
  expect(essayUrl).not.toContain("zebra");
  const scripts = await page.evaluate(() => Array.from(document.scripts).map((s) => s.src).filter(Boolean));
  for (const src of scripts) {
    const body = await (await page.request.get(src)).text();
    for (const secret of secrets) expect(body).not.toContain(secret);
    expect(body).not.toMatch(/sk-ant-[A-Za-z0-9]/);
  }
});

test("account deletion removes access", async ({ page }) => {
  await signIn(page);
  await createEssay(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.waitForURL("**/sign-in?deleted=1");
  await expect(page.getByText("Your account has been deleted.")).toBeVisible();
  await page.goto("/dashboard");
  await page.waitForURL("**/sign-in");
});
