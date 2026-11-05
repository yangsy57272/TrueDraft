import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("custom school, deadline edit, and rapid checklist clicks all persist", async ({ page }) => {
  await signIn(page);
  await page.goto("/my-list");
  await page.getByLabel("Add a school not in the directory").fill("Fictional Lakeside College");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const card = page.locator("li.card", { has: page.getByRole("heading", { name: "Fictional Lakeside College" }) });
  await expect(card).toBeVisible(); // appears without a reload

  await card.getByRole("button", { name: "+ Add a deadline" }).click();
  await card.getByLabel("Type").selectOption("early_decision");
  await card.getByLabel("Date").fill("2027-11-01");
  await card.getByLabel("Time zone").selectOption("America/New_York");
  await card.getByLabel("Source").fill("https://example.edu/admissions/dates");
  await card.getByRole("button", { name: "Save deadline" }).click();
  await expect(card.getByText(/Nov(ember)? 1, 2027, 23:59 \(America\/New York\)/)).toBeVisible();
  await expect(card.getByRole("link", { name: /Official page/ })).toHaveAttribute("href", "https://example.edu/admissions/dates");
  const upcoming = page.getByRole("complementary").filter({ hasText: "Your deadlines" });
  await expect(upcoming.getByText("Fictional Lakeside College")).toBeVisible(); // sidebar updates at once
  // An overdue deadline is flagged; marking it done moves it to completed.
  await card.getByRole("button", { name: "+ Add a deadline" }).click();
  await card.getByLabel("Type").selectOption("financial_aid");
  await card.getByLabel("Date").fill("2026-01-15");
  await card.getByRole("button", { name: "Save deadline" }).click();
  await expect(upcoming.getByRole("region", { name: "Overdue" })).toContainText("Fictional Lakeside College");
  await card.getByRole("checkbox", { name: "Financial aid forms Mark as done" }).check();
  await expect(upcoming.getByText("1 completed")).toBeVisible();

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
  await expect(page.getByRole("complementary").filter({ hasText: "Your deadlines" }).getByText("Fictional Lakeside College")).toBeVisible();
  await expect(page.getByRole("complementary").filter({ hasText: "Your deadlines" }).getByText("1 completed")).toBeVisible();
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
