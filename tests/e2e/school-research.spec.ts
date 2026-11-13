import {expect,test} from "@playwright/test";
import {signIn,noHorizontalOverflow} from "./helpers";
test("global schools filter and research workflow use the correct system",async({page})=>{
 await signIn(page);await page.goto("/schools?country=HK");
 await expect(page.getByRole("link",{name:"University of Hong Kong",exact:true})).toBeVisible();
 await expect(page.getByRole("link",{name:"Harvard University",exact:true})).toHaveCount(0);
 await page.goto("/schools/hku");await expect(page.getByText(/JUPAS \/ non-JUPAS/)).toBeVisible();
 await page.getByRole("link",{name:/Research courses, faculty/}).click();
 await expect(page.getByRole("heading",{name:"School research & Why School"})).toBeVisible();
 await page.getByLabel(/Programme \/ subject/).fill("Psychology");
 await page.route("**/api/schools/hku/research",route=>route.fulfill({json:{schoolSlug:"hku",schoolName:"University of Hong Kong",country:"HK",program:"Psychology",sources:[],attempted:1,unavailable:1,scope:"Test"}}));
 await page.getByRole("button",{name:/Find official sources/}).click();
 await expect(page.getByText(/No pages could be read/)).toBeVisible();
 await expect(page.getByRole("heading",{name:"Final revision check"})).toBeVisible();
 await page.goto("/schools/cambridge/research");await expect(page.getByText(/UCAS statements are shared across choices/)).toBeVisible();
});
test("research page stays usable on a phone @mobile",async({page})=>{
 await signIn(page);await page.goto("/schools/hku/research");await expect(page.getByRole("heading",{name:"School research & Why School"})).toBeVisible();expect(await noHorizontalOverflow(page)).toBe(true);
});
