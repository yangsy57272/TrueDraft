import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noHorizontalOverflow, signIn } from "./helpers";

test("journey: profile → majors → schools → list → linked supplemental essay", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Your application journey" })).toBeVisible();
  await expect(page.locator("ol > li")).toHaveCount(7);

  // Profile
  await page.goto("/profile");
  await page.getByRole("button", { name: "+ Add course" }).click();
  await page.getByLabel("Course name", { exact: true }).fill("Physics HL");
  await page.getByRole("button", { name: "+ Add activity" }).click();
  await page.getByLabel("Your role or position").fill("Build lead");
  await page.getByLabel("Organization or team").fill("School Robotics Club");
  await page.getByLabel("What you did").fill("Designed the drivetrain.");
  await page.getByLabel("What subjects, ideas, or problems do you enjoy?").fill("Why machines fail.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  // Majors (mock provider) with consent
  await page.goto("/majors");
  await page.getByRole("button", { name: "Explore majors from my profile" }).click();
  await page.getByLabel(/I understand that AI processing/).check();
  await page.getByRole("button", { name: "Agree and get feedback" }).click();
  await expect(page.getByRole("heading", { name: "Fields to explore" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Development mock/).first()).toBeVisible();
  await page.getByLabel("Major name").fill("Mechanical Engineering");
  await page.getByRole("button", { name: "Add a major" }).click();
  await expect(page.getByText("Added to your majors.")).toBeVisible();

  // Schools directory: official links, no invented numbers
  await page.goto("/schools");
  await expect(page.getByText("24 schools")).toBeVisible();
  await expect(page.getByText("CDS data not yet imported").first()).toBeVisible();
  const harvard = page.locator("li", { has: page.getByRole("link", { name: "Harvard University" }) });
  await expect(harvard.getByRole("link", { name: /Official CDS page/ })).toHaveAttribute("href", "https://oira.harvard.edu/common-data-set/");
  await harvard.getByRole("button", { name: "+ Add to my list" }).click();
  await expect(harvard.getByText("On my list")).toBeVisible();

  // School page
  await page.goto("/schools/harvard-university");
  await expect(page.getByRole("heading", { name: "No CDS data imported yet" })).toBeVisible();

  // My list: set category/round/deadline, toggle checklist, start a linked essay
  await page.goto("/my-list");
  await page.getByText("Edit", { exact: true }).click();
  await page.getByLabel("Your category").selectOption("reach");
  await page.getByLabel("Round").selectOption("rea");
  await page.getByLabel("Your deadline").fill("2026-11-01");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming deadlines" })).toBeVisible();
  await page.getByLabel("Recommendations requested").check();
  await expect(page.getByText(/1 of \d+ done/)).toBeVisible();
  await page.getByRole("link", { name: "+ Start a supplemental essay" }).click();
  await expect(page.getByLabel(/Essay title/)).toHaveValue("Harvard University supplement");
  await page.getByLabel(/Exact essay prompt/).fill("Briefly describe an intellectual experience.");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await page.waitForURL(/\/essays\/[0-9a-f-]{36}$/);
  await page.goto("/my-list");
  await expect(page.getByRole("link", { name: "Harvard University supplement" })).toBeVisible();

  // Journey reflects progress
  await page.goto("/journey");
  await expect(page.getByText("Done").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin enters verified CDS data and students see it with its source", async ({ browser }) => {
  const admin = await browser.newPage();
  await signIn(admin, "admin@example.test");
  await admin.goto("/admin/schools");
  await admin.getByRole("link", { name: "Rice University" }).click();
  await admin.getByRole("link", { name: "+ New dataset" }).click();
  await admin.getByLabel("Academic year (e.g. 2025-2026)").fill("2099-2100");
  await admin.getByLabel(/Source document URL/).fill("https://example.edu/fictional-test-cds.pdf");
  await admin.getByLabel(/First-year applicants/).fill("1000");
  await admin.getByLabel(/^Admitted\s*C1/).fill("100");
  await admin.getByLabel("Application essay").selectOption("very_important");
  await admin.getByLabel("Verified against the official document").check();
  await admin.getByLabel("Publish to students").check();
  await admin.getByRole("button", { name: "Save" }).last().click();
  await admin.waitForURL(/\/admin\/schools\/[0-9a-f-]{36}$/);

  const student = await (await browser.newContext()).newPage();
  await student.goto("/schools/rice-university?year=2099-2100");
  await expect(student.getByText("From the 2099-2100 Common Data Set published by the college.")).toBeVisible();
  await expect(student.getByText("10%").first()).toBeVisible();
  await expect(student.getByText("Very important").first()).toBeVisible();

  // Clean up the test dataset so it never lingers on a shared database.
  await admin.goto("/admin/schools");
  await admin.getByRole("link", { name: "Rice University" }).click();
  await admin.getByRole("button", { name: "Delete" }).last().click();
  await admin.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
});

test("CDS guide shows a clearly fictional worked example", async ({ page }) => {
  await page.goto("/cds");
  await expect(page.getByRole("heading", { name: "How to read the Common Data Set", level: 1 })).toBeVisible();
  await expect(page.getByText("Northfield College (fictional)")).toBeVisible();
  await expect(page.getByText(/every number below are fictional/)).toBeVisible();
});

for (const path of ["/cds", "/schools", "/schools/harvard-university", "/schools/compare?ids="]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}

test("no serious accessibility violations on signed-in journey pages", async ({ page }) => {
  await signIn(page);
  for (const path of ["/journey", "/profile", "/majors", "/my-list"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  }
});

test.describe("journey on mobile @mobile", () => {
  test("new pages have no horizontal overflow @mobile", async ({ page }) => {
    for (const path of ["/cds", "/schools", "/schools/harvard-university"]) {
      await page.goto(path);
      expect(await noHorizontalOverflow(page), path).toBe(true);
    }
    await signIn(page);
    for (const path of ["/journey", "/profile", "/majors", "/my-list"]) {
      await page.goto(path);
      expect(await noHorizontalOverflow(page), path).toBe(true);
    }
  });
});
