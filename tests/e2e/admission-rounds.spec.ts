import {expect,test} from "@playwright/test";
import {signIn,noHorizontalOverflow} from "./helpers";
async function addCmu(page:import("@playwright/test").Page){await signIn(page);await page.goto("/schools/carnegie-mellon-university");await page.getByRole("button",{name:/Add (to my list|as Reach)/}).click();await page.goto("/my-list/plan");return page.locator("form").filter({has:page.getByRole("heading",{name:"Carnegie Mellon University",exact:true})});}
test("choosing a verified school round sets its exact date and replans; calendar links are available",async({page})=>{
 const form=await addCmu(page);await form.getByLabel("Programme route").selectOption("general");await form.getByLabel("Application round").selectOption("rd");await expect(form.getByText("2027-01-04",{exact:true})).toBeVisible();await form.getByRole("button",{name:"Use this round & replan"}).click();
 await expect.poll(async()=>{const r=await page.request.get("/api/schedule");return (await r.json()).plan.tasks.find((t:{kind:string})=>t.kind==="submit")?.deadline?.date;}).toBe("2027-01-04");
 await expect(form.getByLabel("Application round").locator('option[value="ea"]')).toHaveJSProperty('disabled',true);
 await expect(page.getByRole("link",{name:"Import to Apple Calendar (.ics)",exact:true})).toHaveAttribute("href","/api/schedule/calendar");
 await expect(page.getByRole("link",{name:/Preview this session in Google Calendar/}).first()).toHaveAttribute("href",/^https:\/\/calendar\.google\.com\/calendar\/render\?/);
 await form.getByLabel("Application round").selectOption("ed");await form.getByRole("button",{name:"Use this round & replan"}).click();
 await expect.poll(async()=>{const r=await page.request.get("/api/schedule");return (await r.json()).plan.tasks.find((t:{kind:string})=>t.kind==="submit")?.deadline?.date;}).toBe("2026-11-02");
});
test("verified programme choices fit a phone @mobile",async({page})=>{const form=await addCmu(page);await form.getByLabel("Programme route").selectOption("drama-music");await form.getByLabel("Application round").selectOption("rd");await expect(form.getByText("2026-12-01",{exact:true})).toBeVisible();expect(await noHorizontalOverflow(page)).toBe(true);});
