import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("custom school, deadline edit, and rapid checklist clicks all persist", async ({ page }) => {
  await signIn(page);
  await page.goto("/my-list");
  await page.getByLabel("Add a school not in the directory").fill("Fictional Lakeside College");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const card = page.locator("li.card", { has: page.getByRole("heading", { name: "Fictional Lakeside College" }) });
  await expect(card).toBeVisible(); // appears without a reload

  await card.getByText("Edit", { exact: true }).click();
  await card.getByLabel("Your deadline").fill("2026-12-15");
  await card.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const upcoming = page.getByRole("complementary").filter({ hasText: "Upcoming deadlines" });
  await expect(upcoming.getByText("Fictional Lakeside College")).toBeVisible(); // sidebar updates at once

  // Slow the server down, then click two items quickly.
  await page.route(/\/api\/list\/[^/]+\/checklist\//, async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.continue();
  });
  await card.getByLabel("Recommendations requested").check();
  await card.getByLabel(/Transcript/).check();
  await expect(card.getByText(/2 of \d+ done/)).toBeVisible();
  await page.waitForTimeout(1600);

  await page.reload();
  const again = page.locator("li.card", { has: page.getByRole("heading", { name: "Fictional Lakeside College" }) });
  await expect(again.getByLabel("Recommendations requested")).toBeChecked();
  await expect(again.getByLabel(/Transcript/)).toBeChecked();
  await expect(again.getByText(/2 of \d+ done/)).toBeVisible();
  await expect(page.getByRole("complementary").filter({ hasText: "Upcoming deadlines" }).getByText("Fictional Lakeside College")).toBeVisible();
});

test("a failed checklist update is rolled back and reported", async ({ page }) => {
  await signIn(page);
  await page.goto("/my-list");
  await page.getByLabel("Add a school not in the directory").fill("Fictional Rollback University");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const card = page.locator("li.card", { has: page.getByRole("heading", { name: "Fictional Rollback University" }) });
  await expect(card).toBeVisible();
  await page.route(/\/api\/list\/[^/]+\/checklist\//, (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"internal_error"}}' }),
  );
  await card.getByLabel("Recommendations requested").click();
  await expect(page.getByText("Something went wrong on our side.", { exact: false }).first()).toBeVisible();
  await expect(card.getByLabel("Recommendations requested")).not.toBeChecked();
  await expect(card.getByText(/0 of \d+ done/)).toBeVisible();
});
