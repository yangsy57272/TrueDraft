import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("CV review: uncertain and duplicate items start unticked, fields are editable, excerpts shown", async ({ page }) => {
  await signIn(page);
  await page.goto("/profile");
  // One course already in the profile, to trigger the duplicate warning.
  await page.getByRole("button", { name: /Add course/ }).click();
  await page.getByLabel("Course name", { exact: true }).first().fill("Physics HL");
  await page.getByRole("button", { name: "Save profile" }).first().click();
  await expect(page.getByText("Profile saved.").last()).toBeVisible();

  await page.getByLabel("CV text").fill(["Course: Physics HL", "Course: Economics SL", "Activity: Robotics captain", "Honor: Regional math olympiad bronze", "[[mock:cv-sample]]"].join("\n"));
  await page.getByRole("button", { name: "Extract for review" }).click();
  await page.getByLabel(/I understand that AI processing/).check().catch(() => {});
  const agree = page.getByRole("button", { name: /Agree/ });
  if (await agree.isVisible().catch(() => false)) await agree.click();

  const review = page.getByRole("heading", { name: "Review what was found" });
  await expect(review).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Courses: Economics SL")).toBeChecked();
  await expect(page.getByLabel("Courses: Physics HL")).not.toBeChecked(); // duplicate
  await expect(page.getByRole("listitem").filter({ has: page.getByLabel("Courses: Physics HL") }).getByText("Already in your profile")).toBeVisible();
  await expect(page.getByLabel("Honors and awards: Mock Award Not In CV")).not.toBeChecked(); // not in CV
  await expect(page.getByText("This item couldn’t be traced to a line in your CV.")).toBeVisible();
  await expect(page.getByText("Course: Economics SL", { exact: true })).toBeVisible(); // the supporting excerpt
  // Honor level "other" round-trips.
  await expect(page.locator("select").filter({ hasText: "Other / not stated" }).first()).toBeVisible();

  // Edit before adding.
  const econName = page.getByRole("listitem").filter({ has: page.getByLabel("Courses: Economics SL") }).getByLabel("Course name");
  await econName.fill("Economics SL (Year 1)");
  await page.getByRole("button", { name: /Add \d+ selected to my profile/ }).click();
  await expect(page.getByText(/Added \d+ item\(s\)/)).toBeVisible();
  await page.getByRole("button", { name: "Save profile" }).first().click();
  await expect(page.getByText("Profile saved.").last()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Course name", { exact: true }).nth(1)).toHaveValue("Economics SL (Year 1)");
  await expect(page.getByText("Mock Award Not In CV")).toHaveCount(0);
});
