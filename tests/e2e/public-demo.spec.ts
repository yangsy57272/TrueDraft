import { expect, test } from "@playwright/test";
import { noHorizontalOverflow } from "./helpers";

test("public fictional journey works without an account or AI", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", req => { if (/\/api\/(essays|planning|schedule|list|auth)/.test(req.url())) requests.push(req.url()); });
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: /A little less overwhelm/ })).toBeVisible();
  const demo = page.locator(".td-demo");
  const school = demo.getByRole("article").filter({ has: page.getByRole("heading", { name: "Harbor College", exact: true }) });
  await school.getByRole("button", { name: "+ Add to demo list", exact: true }).click();
  await expect(demo.locator(".td-fee")).toContainText("1 unknown");
  await demo.getByRole("button", { name: "See my next steps →" }).click();
  await expect(demo.getByRole("heading", { name: /Your focus, with room/ })).toBeVisible();
  await demo.getByRole("button", { name: "Mark task handled" }).first().click();
  await expect(demo.getByRole("status")).toContainText("recalculated");
  await demo.getByRole("button", { name: /Keep your voice/ }).click();
  await demo.getByRole("button", { name: "Locate this in the draft" }).click();
  await expect(demo.locator("mark")).toContainText("teamwork and perseverance");
  await demo.getByRole("button", { name: "Compare an illustrative revision" }).click();
  await expect(demo.locator(".td-revision")).toContainText("not an AI rewrite");
  await demo.getByRole("button", { name: /Check the evidence/ }).click();
  await expect(demo.getByText("Not yet measured", { exact: true })).toBeVisible();
  await demo.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(demo.locator(".td-large-number")).toContainText("2");
  expect(requests).toEqual([]);
});

test("public demo and evidence are bilingual and fit a phone @mobile", async ({ page }) => {
  await page.goto("/quality");
  const demo = page.locator(".td-demo");
  await expect(demo.getByRole("heading", { name: "Fixture checks passed" })).toBeVisible();
  await demo.getByRole("button", { name: "Switch to Chinese" }).click();
  await expect(demo.getByRole("heading", { name: "项样例检查通过" })).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
  await demo.getByRole("button", { name: /保留自己的声音/ }).click();
  await demo.getByRole("button", { name: "在原稿中定位这句话" }).click();
  await expect(demo.locator("mark")).toBeVisible();
  expect(await noHorizontalOverflow(page)).toBe(true);
});
