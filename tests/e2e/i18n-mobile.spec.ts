import { expect, test } from "@playwright/test";
import { createEssay, noHorizontalOverflow, signIn } from "./helpers";

test("switches the whole interface to Simplified Chinese and back", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Language").first().selectOption("zh-CN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("你的故事，你的声音。更清晰的反馈。");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "隐私中心", level: 1 })).toBeVisible();
  await page.getByLabel("语言").first().selectOption("en");
  await expect(page.getByRole("heading", { name: "Privacy Center", level: 1 })).toBeVisible();
});

test("signed-in language preference persists across sessions", async ({ page, browser }) => {
  const email = await signIn(page);
  await page.goto("/settings");
  await page.getByLabel("Interface language").selectOption("zh-CN");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("heading", { name: "隐私与账户设置" })).toBeVisible();
  const other = await (await browser.newContext()).newPage();
  await signIn(other, email);
  await other.goto("/dashboard");
  await expect(other.getByRole("heading", { name: "我的文书" })).toBeVisible();
});

test("essay text is never translated by the interface switch", async ({ page }) => {
  await signIn(page);
  await createEssay(page, "This sentence stays in English.");
  await page.getByLabel("Language").first().selectOption("zh-CN");
  await expect(page.getByLabel("文书草稿")).toHaveValue("This sentence stays in English.");
});

test.describe("mobile @mobile", () => {
  test("public pages have no horizontal overflow @mobile", async ({ page }) => {
    for (const path of ["/", "/how-it-works", "/sample-feedback", "/privacy", "/responsible-ai", "/resources", "/sign-in"]) {
      await page.goto(path);
      expect(await noHorizontalOverflow(page), path).toBe(true);
    }
  });

  test("editor, feedback, and navigation are usable on a phone @mobile", async ({ page }) => {
    await signIn(page);
    await createEssay(page);
    expect(await noHorizontalOverflow(page)).toBe(true);
    await expect(page.getByLabel("Essay draft")).toBeVisible();
    await page.getByRole("link", { name: /Open feedback & tools/ }).click();
    await page.getByRole("tab", { name: "Tools" }).click();
    await expect(page.getByRole("button", { name: /Prompt Decoder/ })).toBeVisible();
    for (const path of ["/dashboard", "/settings", "/essays/new"]) {
      await page.goto(path);
      expect(await noHorizontalOverflow(page), path).toBe(true);
    }
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Dashboard" })).toBeVisible();
    await page.keyboard.press("Escape");
  });
});
