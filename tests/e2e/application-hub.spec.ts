import { expect, test } from "@playwright/test";
import { noHorizontalOverflow, signIn } from "./helpers";

test("action centre persists checklists and exports follow-up dates after submission", async ({ page }) => {
  await page.goto("/my-list/hub"); await expect(page).toHaveURL(/\/sign-in/);
  await signIn(page);
  const created = await page.request.post("/api/list", { data: { customSchoolName: "FICTIONAL Hub College", intendedMajor: "Physics", platform: "other", status: "submitted" } });
  expect(created.ok()).toBe(true); const { entry } = await created.json();
  for (const type of ["application", "financial_aid"]) {
    const res = await page.request.post(`/api/list/${entry.id}/deadlines`, { data: { type, date: "2027-01-15", timeZone: "America/New_York", source: "FICTIONAL TEST" } });
    expect(res.ok()).toBe(true);
  }
  await page.goto("/my-list/hub");
  await expect(page.getByRole("heading", { name: "Application action centre", exact: true })).toBeVisible();
  const watch = page.getByRole("heading", { name: "Deadline watch", exact: true }).locator("..");
  await expect(watch.getByText("FICTIONAL Hub College · Financial aid forms")).toBeVisible();
  await expect(watch.getByText("FICTIONAL Hub College · Application", { exact: true })).toHaveCount(0);
  const card = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "FICTIONAL Hub College" }) });
  await card.getByRole("checkbox").first().check();
  await expect(page.locator(".application-hub").getByRole("status")).toContainText("Progress saved");
  await page.reload(); await expect(card.getByRole("checkbox").first()).toBeChecked();
  await page.screenshot({ path: test.info().outputPath("hub-desktop.png"), fullPage: true });
  await page.route("**/api/list/*/checklist/*", route => route.fulfill({ status: 503, json: { error: { code: "internal_error" } } }));
  await card.getByRole("checkbox").first().click();
  await expect(page.locator(".application-hub").getByRole("alert")).toBeVisible();
  await expect(card.getByRole("checkbox").first()).toBeChecked();
  await page.unroute("**/api/list/*/checklist/*");
  await card.getByRole("link", { name: "Edit checklist, application status & dates →" }).click();
  await expect(page.locator(`[id="${entry.id}"]`)).toBeVisible();
  await page.goto("/my-list/hub");
  await page.getByRole("combobox", { name: "Application stage", exact: true }).selectOption("preparing");
  await expect(page.getByText("No schools match this filter.")).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download checklist", exact: true }).click();
  const file = await download; const { readFile } = await import("node:fs/promises");
  const snapshot = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(snapshot.schools).toHaveLength(1); expect(snapshot.schools[0].status).toBe("submitted"); expect(snapshot.schools[0].checklist[0].done).toBe(true);
  await page.emulateMedia({ media: "print" }); await expect(page.getByRole("button", { name: "Download checklist" })).toBeHidden();
});

test("action centre empty state is bilingual and fits a phone @mobile", async ({ page }) => {
  await signIn(page); await page.goto("/my-list/hub");
  await expect(page.getByRole("heading", { name: "Start with your college list" })).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
  const added = await page.request.post("/api/list", { data: { customSchoolName: "FICTIONAL International School with a deliberately long name", intendedMajor: "Mathematics and interdisciplinary computational science", platform: "other" } });
  expect(added.ok()).toBe(true); await page.reload();
  expect(await noHorizontalOverflow(page)).toBe(true);
  const language = await page.request.post("/api/locale", { data: { locale: "zh-CN" } }); expect(language.ok()).toBe(true);
  await page.reload(); await expect(page.getByRole("heading", { name: "申请行动中心", exact: true })).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
  await expect(page.getByRole("region", { name: "下一步做什么" })).toContainText("准备申请材料 · 已请求推荐信");
  await page.screenshot({ path: test.info().outputPath("hub-chinese-mobile.png"), fullPage: true });
});
