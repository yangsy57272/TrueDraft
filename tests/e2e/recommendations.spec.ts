import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("choosing a major leads to Reach / Target / Safety suggestions and a one-click add", async ({ page }) => {
  await signIn(page);
  await page.goto("/schools/recommended");
  await expect(page.getByRole("heading", { name: "Choose a major first" })).toBeVisible();

  await page.goto("/majors");
  await page.getByPlaceholder("Major name").fill("Computer Science");
  await page.getByLabel("Field of study (for recommendations)").selectOption("11");
  await page.getByRole("button", { name: "Add a major", exact: true }).click();
  await page.getByRole("link", { name: /See colleges for these majors/ }).click();

  await expect(page.getByRole("heading", { name: "Colleges for your majors" })).toBeVisible();
  for (const bucket of ["Reach", "Target", "Safety"]) await expect(page.getByRole("heading", { name: new RegExp(bucket) }).first()).toBeVisible();
  await expect(page.getByText(/not predictions/)).toBeVisible();
  const safety = page.locator("#bucket-likely").locator("..");
  const firstCard = safety.getByRole("listitem").first();
  await expect(firstCard.getByText(/Admits \d/)).toBeVisible();
  await firstCard.getByRole("button", { name: "+ Add as Safety" }).click();
  await expect(firstCard.getByText("On my list")).toBeVisible();

  await page.goto("/my-list");
  await expect(page.getByText("Safety").first()).toBeVisible();
});

test("a school's supplemental prompt starts a pre-filled essay", async ({ page }) => {
  await signIn(page);
  await page.goto("/schools/stanford-university#supplements");
  const section = page.locator("#supplements");
  await expect(section.getByRole("heading", { name: /Supplemental essays · 2026–2027/ })).toBeVisible();
  await expect(section.getByText("What is the most significant challenge that society faces today?")).toBeVisible();
  await section.getByRole("link", { name: /Start this essay/ }).first().click();
  await expect(page.getByLabel(/Exact essay prompt/)).toHaveValue("What is the most significant challenge that society faces today?");
  await expect(page.getByLabel(/Word limit/)).toHaveValue("50");
});

test("the personal statement guide lists the Common App prompts and links to starting an essay", async ({ page }) => {
  await page.goto("/guides/personal-statement");
  await expect(page.getByRole("heading", { name: "Personal statement guide", level: 1 })).toBeVisible();
  await expect(page.getByText(/Share an essay on any topic of your choice/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Step by step" })).toBeVisible();
});


test("direct field selection works without saved majors and AI matches stay on the shortlist", async ({ page }) => {
  await signIn(page);
  await page.goto("/majors");
  await expect(page.getByRole("link", { name: /See colleges for these majors/ })).toBeVisible();
  await page.goto("/profile");
  await page.getByLabel("What subjects, ideas, or problems do you enjoy?").fill("Programming and building robots.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.goto("/schools/recommended");
  await page.getByLabel("Choose your academic field").selectOption("11");
  await page.getByRole("button", { name: "Recommend colleges →" }).click();
  await expect(page.getByRole("heading", { name: "AI school + major matching" })).toBeVisible();
  await page.getByLabel("Recommendation priority").selectOption("program");
  await page.getByRole("button", { name: "Update" }).click();
  await page.getByRole("button", { name: "Find my school matches →" }).click();
  await page.getByLabel(/I understand that AI processing/).check();
  await page.getByRole("button", { name: "Agree and get feedback" }).click();
  await expect(page.getByText("Development mock: no real AI analysis.")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#school-ai-title").locator("..").getByRole("article").first()).toBeVisible();
  await page.goto("/schools/massachusetts-institute-of-technology");
  await expect(page.getByRole("link", { name: /U.S. News 2027 · National Universities #1/ })).toHaveAttribute("href", /prnewswire/);
});

test("all six systems participate; applicants can filter and save a non-U.S. subject match",async({page})=>{
  await signIn(page);await page.goto('/schools/recommended?field=11');
  await expect(page.getByLabel('Application system')).toHaveValue('');
  for(const country of ['United Kingdom','Hong Kong','Canada','Australia','Singapore'])await expect(page.getByRole('heading',{name:new RegExp(country+' · Subject matches')})).toBeVisible();
  await expect(page.getByRole('heading',{name:'United States · Reach / Target / Safety suggestions'})).toBeVisible();
  await page.getByLabel('Application system').selectOption('UK');await page.getByRole('button',{name:'Update',exact:true}).click();
  await expect(page.getByRole('heading',{name:/United Kingdom · Subject matches/})).toBeVisible();await expect(page.locator('#system-HK')).toHaveCount(0);await expect(page.locator('#bucket-reach')).toHaveCount(0);
  const card=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'University of Cambridge',exact:true})});await expect(card.getByRole('link',{name:/Computer Science/})).toHaveAttribute('href',/cam.ac.uk/);
  await card.getByRole('button',{name:'+ Add to list (group undecided)',exact:true}).click();await expect(card.getByText('On my list')).toBeVisible();
  await page.goto('/my-list');await expect(page.getByText('University of Cambridge',{exact:true}).first()).toBeVisible();
});

test("cross-system recommendations remain usable on mobile @mobile",async({page})=>{
 await signIn(page);await page.goto('/schools/recommended?field=11&system=SG');await expect(page.getByRole('heading',{name:/Singapore · Subject matches/})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
