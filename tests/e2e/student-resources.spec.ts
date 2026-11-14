import {test,expect} from "@playwright/test";
import {signIn} from "./helpers";
test("saved schools produce an editable USD budget and persisted private planning inputs",async({page})=>{
 await signIn(page);await page.goto('/schools/carnegie-mellon-university');await page.getByRole('button',{name:/Add (to my list|as Reach)/}).click();await page.goto('/my-list/resources');
 await expect(page.getByLabel('Display currency',{exact:true})).toHaveValue('USD');await page.getByLabel('Application-season budget (USD)',{exact:true}).fill('1500');await page.getByLabel('Family annual contribution (USD)',{exact:true}).fill('65000');await page.getByRole('button',{name:'Save budget & assessment',exact:true}).click();await expect(page.getByText('Budget and assessment saved; work plan updated.',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByLabel('Family annual contribution (USD)',{exact:true})).toHaveValue('65000');await expect(page.getByText('Application costs are incomplete; this is a known subtotal')).toBeVisible();await expect(page.getByRole('heading',{name:'2. Budget from your saved schools'})).toBeVisible();
});
test("all systems expose Reach / Target / Safety; course conditions remain explicit",async({page})=>{
 await signIn(page);await page.goto('/schools/recommended?field=11');
 for(const code of ['UK','HK','CA','AU','SG']){const s=page.locator(`#system-${code}`);for(const group of ['Reach / 冲刺','Target / 匹配','Safety / 保底'])await expect(s.getByRole('heading',{name:new RegExp(group)})).toBeVisible();}
 await page.goto('/my-list/resources');await page.getByLabel('Load researched entry reference').selectOption('0');await expect(page.getByLabel('Exact programme',{exact:true})).toHaveValue('Computer Science, BA (Hons) and MEng');await expect(page.getByLabel('Highly competitive / selective?',{exact:true})).toHaveValue('yes');
 await page.getByLabel('Overall / predicted result',{exact:true}).fill('45');await page.getByRole('button',{name:'Save budget & assessment',exact:true}).click();await expect(page.getByText('Budget and assessment saved; work plan updated.',{exact:true})).toBeVisible();await page.goto('/schools/recommended?field=11&system=UK');
 const reach=page.locator('#system-UK section').filter({has:page.getByRole('heading',{name:/Reach \/ 冲刺/})}).first();await expect(reach.getByRole('heading',{name:'University of Cambridge',exact:true})).toBeVisible();
});
test("budget and qualification controls fit mobile @mobile",async({page})=>{await signIn(page);await page.goto('/my-list/resources');await expect(page.getByRole('heading',{name:'Application budget, admission groups & time',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);});
