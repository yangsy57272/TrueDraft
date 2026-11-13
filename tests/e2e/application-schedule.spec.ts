import {expect,test} from "@playwright/test";
import {signIn,noHorizontalOverflow} from "./helpers";
test("chosen school produces a saved personalized timetable and a private calendar",async({page})=>{
 await signIn(page);await page.goto("/schools/stanford-university");await page.getByRole("button",{name:/Add (to my list|as Reach)/}).click();
 await page.goto("/my-list/plan");await expect(page.getByRole("heading",{name:"My application plan",exact:true})).toBeVisible();
 await expect(page.getByText(/no application deadline entered|No entered application deadline/).first()).toBeVisible();
 await page.getByLabel("Application hours per week").fill("8");await page.getByLabel("My time zone (IANA)").fill("Asia/Shanghai");await page.getByRole("button",{name:"Save & rebuild my plan"}).click();
 await expect(page.getByRole("status").filter({hasText:"Plan updated and saved."})).toBeVisible();
 await page.reload();await expect(page.getByLabel("Application hours per week")).toHaveValue("8");
 const progress=page.getByRole("heading",{name:/Task progress/}).locator("..");await progress.getByRole("checkbox").first().check();await expect(page.getByRole("status").filter({hasText:/Progress saved/})).toBeVisible();
 await page.reload();await expect(progress.getByRole("checkbox").first()).toBeChecked();
 const response=await page.request.get("/api/schedule/calendar");expect(response.status()).toBe(200);expect(await response.text()).toContain("BEGIN:VCALENDAR");
});
test("application plan works on a phone @mobile",async({page})=>{
 await signIn(page);await page.goto("/my-list/plan");await expect(page.getByRole("heading",{name:"My application plan",exact:true})).toBeVisible();expect(await noHorizontalOverflow(page)).toBe(true);
});
