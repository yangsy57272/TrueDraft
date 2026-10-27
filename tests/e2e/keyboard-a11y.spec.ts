import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createEssay, signIn } from "./helpers";

test("skip link and keyboard-only sign-in", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);

  await page.goto("/sign-in");
  await page.getByLabel("Email address").focus();
  await page.keyboard.type("not-an-email");
  await page.keyboard.press("Enter");
  await expect(page.locator("#email-error")).toHaveText("Enter a valid email address.");
  await expect(page.locator("#email-error")).toHaveAttribute("role", "alert");
  await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
});

test("workspace tabs, dialogs, and menus work with the keyboard", async ({ page }) => {
  await signIn(page);
  await createEssay(page);

  // Tabs: arrow keys move between panels.
  const feedbackTab = page.getByRole("tab", { name: "Feedback" });
  await feedbackTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Tools" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Tools" })).toHaveAttribute("aria-selected", "true");

  // Dialog: opens from keyboard, traps focus, closes with Escape and restores focus.
  const saveVersion = page.getByRole("button", { name: "Save version" });
  await saveVersion.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel(/Version note/)).toBeFocused();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(saveVersion).toBeFocused();

  // Menu: opens with Enter, navigates with arrows, closes with Escape.
  const exportBtn = page.getByRole("button", { name: /Export/ });
  await exportBtn.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem").nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  // Consent checkbox is operable with Space and errors are announced.
  await page.getByRole("button", { name: "Get feedback" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Agree and get feedback" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByLabel(/I understand that AI processing/).focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel(/I understand that AI processing/)).toBeChecked();
});

for (const path of ["/", "/how-it-works", "/sample-feedback", "/privacy", "/responsible-ai", "/resources", "/sign-in"]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

test("no serious accessibility violations in the signed-in workspace", async ({ page }) => {
  await signIn(page);
  await createEssay(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
});
