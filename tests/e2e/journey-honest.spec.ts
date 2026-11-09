import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("majors can be saved for later, and the next-step suggestion moves on", async ({ page }) => {
  await signIn(page);
  await page.goto("/journey");
  // A new student starts with their profile.
  await expect(page.getByText(/Next up · Step 1/).locator("..")).toContainText("Build your profile");
  await expect(page.getByText("0 of 6 planning steps started")).toBeVisible();
  const cdsStep = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /Learn to read the Common Data Set/ }) });
  await expect(cdsStep.getByText("Read anytime")).toBeVisible();
  const majorsStep = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /Explore majors/ }) });
  await majorsStep.getByRole("button", { name: "I’ll explore majors later" }).click();
  await expect(majorsStep.getByText("Saved for later")).toBeVisible();
  await expect(majorsStep.getByText(/Many students decide in college/)).toBeVisible();
  await page.goto("/majors");
  await page.getByRole("button", { name: "Explore majors now" }).click();
  // Wait for the change to be saved before leaving the page.
  await expect(page.getByRole("button", { name: "I’ll explore majors later" })).toBeVisible();
  await page.goto("/journey");
  await expect(page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /Explore majors/ }) }).getByText("Not started")).toBeVisible();
});

test("the homepage offers separate application and essay paths", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the application journey" }).click();
  await expect(page).toHaveURL(/#application-journey$/);
  await expect(page.getByRole("link", { name: "Start my application plan" })).toHaveAttribute("href", "/sign-in");
  const essaySignIn = "/sign-in?intent=essay";
  await expect(page.getByRole("link", { name: "Start with your draft" }).first()).toHaveAttribute("href", essaySignIn);
  await signIn(page, undefined, { from: essaySignIn, to: "/essays/new" });
  await expect(page.getByLabel(/Essay title/)).toBeVisible();
});

test("sample feedback is available in English, bilingual, and Chinese", async ({ page }) => {
  await page.goto("/sample-feedback");
  await expect(page.getByRole("link", { name: "English", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("中文说明")).toHaveCount(0);
  await page.getByRole("link", { name: "English + Chinese notes" }).click();
  await expect(page.getByText(/第四段从具体观察跳到了空泛的总结/)).toBeVisible();
  await page.getByRole("link", { name: "中文" }).click();
  await expect(page.getByText("把总结段换成你自己的思考")).toBeVisible();
  // Quotes stay in the essay's language.
  await expect(page.getByText("“Nobody went down the third row because the light there was broken.”").first()).toBeVisible();
});
