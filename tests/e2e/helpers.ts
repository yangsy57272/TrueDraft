import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
}

/** Sign in through the real UI; the sign-in link is read from the file mailbox. */
export async function signIn(page: Page, email = uniqueEmail()) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  const file = path.join(process.cwd(), ".dev-mailbox", `${email.toLowerCase()}.json`);
  await expect.poll(() => existsSync(file), { timeout: 10_000 }).toBe(true);
  const { url } = JSON.parse(readFileSync(file, "utf8"));
  await page.goto(url);
  await page.waitForURL("**/dashboard");
  return email;
}

export async function createEssay(page: Page, draft = "Every Saturday I help at my aunt's noodle stall. People walk in loops near the tea stall.") {
  await page.goto("/essays/new");
  await page.getByLabel(/Essay title/).fill("E2E essay");
  await page.getByLabel(/Exact essay prompt/).fill("Describe a topic that makes you lose track of time.");
  await page.getByLabel(/Word limit/).fill("650");
  await page.getByLabel(/Current draft/).fill(draft);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(/\/essays\/[0-9a-f-]{36}$/);
  return page.url();
}

export async function noHorizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
