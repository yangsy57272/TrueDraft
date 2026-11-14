import {COST_KEYS,emptyCost,type CostKey,type CostLine,type CostRecord,type Currency,type StudentResources} from "./student-resources";
import type {ApplicationSchedule} from "./application-schedule";
export type BudgetSchool={id:string;name:string;slug:string|null;country:string;status:string;platform:string|null;entryYear?:number|null;category?:string;major?:string|null};
export type Range={low:number;high:number;complete:boolean;unknown:string[]};
const zero=():Range=>({low:0,high:0,complete:true,unknown:[]});
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
const sum=(a:Range,b:Range):Range=>({low:round(a.low+b.low),high:round(a.high+b.high),complete:a.complete&&b.complete,unknown:[...a.unknown,...b.unknown]});
export function convertMoney(amount:number,from:Currency,to:Currency,fx:StudentResources["fx"]){if(amount===0||from===to)return amount;if(!fx?.rates[from]||!fx.rates[to])return null;return amount/fx.rates[from]*fx.rates[to];}
export function lineCost(line:CostLine|undefined,currency:Currency,prefs:StudentResources,label:string):Range {
 if(!line)return {low:0,high:0,complete:false,unknown:[label]};
 if(["waived","not_needed"].includes(line.status)){const paid=convertMoney(line.paid??0,currency,prefs.currency,prefs.fx);return paid===null?{low:0,high:0,complete:false,unknown:[`${label}: net payment exchange rate`]}:{low:paid,high:paid,complete:true,unknown:[]};}
 if(line.status==="unknown"){const paid=convertMoney(line.paid??0,currency,prefs.currency,prefs.fx);return {low:paid??0,high:paid??0,complete:false,unknown:[label]};}
 const low=convertMoney(line.amount.low??0,currency,prefs.currency,prefs.fx), high=convertMoney(line.amount.high??line.amount.low??0,currency,prefs.currency,prefs.fx);
 if(low===null||high===null)return {low:0,high:0,complete:false,unknown:[`${label}: exchange rate missing (${currency})`]};
 const complete=line.amount.low!==null&&line.amount.high!==null;
 return {low:round(Math.max(low,convertMoney(line.paid??0,currency,prefs.currency,prefs.fx)??0)),high:round(Math.max(high,convertMoney(line.paid??0,currency,prefs.currency,prefs.fx)??0)),complete,unknown:complete?[]:[`${label}: incomplete amount range`]};
}
const annualKeys:CostKey[]=["tuition","fees","housing","food","transport","books","insurance","personal"];
const arrivalKeys:CostKey[]=["visa","healthSurcharge","travel","setup"];
export const UCAS_2027={amount:34.5,currency:"GBP" as Currency,source:"https://www.ucas.com/faqs/what-is-the-application-fee-for-the-2027-cycle",cycle:2027};
export const OUAC_2027={base:159,included:3,extra:51,currency:"CAD" as Currency,source:"https://www.ouac.on.ca/guide/undergrad-fees",cycle:2027};
function quoted(amount:number,source:string):CostLine{return {...emptyCost(),status:"estimate",amount:{low:amount,high:amount},source,cycle:"2027"};}
/** All applications are added; attendance scenarios are alternatives, never summed across schools. */
export function buildBudget(schools:BudgetSchool[],records:CostRecord[],prefs:StudentResources,plan?:ApplicationSchedule){
 const record=new Map(records.map(r=>[r.entryId,r]));const warnings:string[]=[];let application=zero(),applicationPaid=zero();
 const applicationLimit=prefs.applicationBudget===null?null:convertMoney(prefs.applicationBudget,prefs.budgetCurrency,prefs.currency,prefs.fx);
 const annualLimit=prefs.annualBudget===null?null:convertMoney(prefs.annualBudget,prefs.budgetCurrency,prefs.currency,prefs.fx);
 const cashLimit=prefs.arrivalCashBudget===null?null:convertMoney(prefs.arrivalCashBudget,prefs.budgetCurrency,prefs.currency,prefs.fx);
 for(const s of schools)if(s.entryYear&&s.entryYear!==prefs.entryYear)warnings.push(`${s.name}: saved entry year ${s.entryYear} differs from comparison year ${prefs.entryYear}; confirm each cycle separately.`);
 const active=schools.filter(s=>!["denied","withdrawn"].includes(s.status));
 const ucas=active.filter(s=>record.get(s.id)?.route==="ucas");const ouac=active.filter(s=>record.get(s.id)?.route==="ouac");
 const platformCharges:{label:string;cost:Range;source:string}[]=[];
 const paidCost=(line:CostLine|undefined,currency:Currency,label:string):Range=>{
  if(!line)return zero();const amount=line.paid??(line.status==="paid"?line.amount.low:null);if(amount===null)return line.status==="paid"?{low:0,high:0,complete:false,unknown:[`${label}: paid amount missing`]}:zero();
  const n=convertMoney(amount,currency,prefs.currency,prefs.fx);return n===null?{low:0,high:0,complete:false,unknown:[`${label}: paid exchange rate missing`]}:{low:n,high:n,complete:true,unknown:[]};
 };
 for(const s of schools){const r=record.get(s.id);if(!r)continue;for(const key of ["application","supplement"] as const){if(key==="application"&&["ucas","ouac","shared"].includes(r.route))continue;const cost=paidCost(r.lines[key],r.currency,`${s.name}: ${key}`);applicationPaid=sum(applicationPaid,cost);if(!active.some(a=>a.id===s.id))application=sum(application,cost);}}

 const everUcas=schools.some(s=>record.get(s.id)?.route==="ucas"),everOuac=schools.some(s=>record.get(s.id)?.route==="ouac");
 if(everUcas){const p=paidCost(prefs.ucasFee,"GBP","UCAS");applicationPaid=sum(applicationPaid,p);if(!ucas.some(s=>(s.entryYear??prefs.entryYear)===prefs.entryYear))application=sum(application,p);}
 if(everOuac){const n=prefs.ouacPaid===null?0:convertMoney(prefs.ouacPaid,"CAD",prefs.currency,prefs.fx);const p=sum(n===null?{low:0,high:0,complete:false,unknown:["OUAC paid exchange rate"]}:{low:n,high:n,complete:true,unknown:[]},paidCost(prefs.ouacServiceFee,"CAD","OUAC extra fees"));applicationPaid=sum(applicationPaid,p);if(!ouac.some(s=>(s.entryYear??prefs.entryYear)===prefs.entryYear))application=sum(application,p);}
 const groups=new Map<number,typeof ucas>();for(const s of ucas){const year=s.entryYear??prefs.entryYear;groups.set(year,[...(groups.get(year)??[]),s]);}
 for(const [year,list]of groups){const choices=list.reduce((n,s)=>n+(record.get(s.id)?.programmeChoices??1),0);let fee=year===prefs.entryYear?prefs.ucasFee:emptyCost();
  if(fee.status==="unknown"&&year===2027)fee=quoted(UCAS_2027.amount,UCAS_2027.source);
  const cost=lineCost(fee,"GBP",prefs,`UCAS ${year} application`);application=sum(application,cost);platformCharges.push({label:`UCAS ${year} · ${choices} choices (one shared charge)`,cost,source:fee.source});
  if(choices>5)warnings.push(`UCAS ${year}: ${choices} choices exceeds the usual five-choice undergraduate limit; verify route-specific restrictions.`);
  if(list.some(s=>s.slug==="oxford")&&list.some(s=>s.slug==="cambridge"))warnings.push(`UCAS ${year}: normally choose Oxford or Cambridge, not both; check exceptions before submitting.`);
 }
 if(ouac.some(s=>(record.get(s.id)?.programmeChoices??1)>3))warnings.push("OUAC: more than three programmes at one university may exceed its choice limit; check institutional restrictions.");
 if(ouac.length){const years=[...new Set(ouac.map(s=>s.entryYear??prefs.entryYear))];for(const year of years){const list=ouac.filter(s=>(s.entryYear??prefs.entryYear)===year);const n=list.reduce((t,s)=>t+(record.get(s.id)?.programmeChoices??1),0);
  const fee=year===2027?quoted(OUAC_2027.base+Math.max(0,n-3)*OUAC_2027.extra,OUAC_2027.source):emptyCost();let cost=lineCost(fee,"CAD",prefs,`OUAC ${year}`);
  cost=sum(cost,lineCost(prefs.ouacServiceFee,"CAD",prefs,"OUAC additional service/payment fees; mark not needed if inapplicable"));
  application=sum(application,cost);platformCharges.push({label:`OUAC ${year} · ${n} programme choices; university-specific fees extra`,cost,source:OUAC_2027.source});}}
 const sharedIds=[...new Set(schools.filter(s=>record.get(s.id)?.route==="shared").map(s=>record.get(s.id)?.sharedPlatformId??""))];
 for(const id of sharedIds){const related=schools.filter(s=>record.get(s.id)?.route==="shared"&&record.get(s.id)?.sharedPlatformId===id);const live=related.filter(s=>active.some(a=>a.id===s.id));const group=prefs.sharedPlatforms.find(g=>g.id===id);
  if(!group){if(live.length)application=sum(application,{low:0,high:0,complete:false,unknown:["Configure the shared application platform and fee"]});continue;}
  const p=paidCost(group.fee,group.currency,group.label);applicationPaid=sum(applicationPaid,p);let added=false;
  for(const year of [...new Set(live.map(s=>s.entryYear??prefs.entryYear))]){const cost=year===group.entryYear?lineCost(group.fee,group.currency,prefs,group.label):{low:0,high:0,complete:false,unknown:[`${group.label}: fee for ${year} unconfirmed`]};application=sum(application,cost);platformCharges.push({label:`${group.label} ${year} (shared charge)`,cost,source:group.fee.source});if(year===group.entryYear)added=true;const choices=live.filter(s=>(s.entryYear??prefs.entryYear)===year).reduce((n,s)=>n+(record.get(s.id)?.programmeChoices??1),0);if(group.maxChoices&&choices>group.maxChoices)warnings.push(`${group.label}: ${choices} choices exceeds the recorded limit ${group.maxChoices}.`);}
  if(!added)application=sum(application,p);
 }
 const applicationBySchool=active.map(s=>{const r=record.get(s.id);let total=zero();if(!r)return {id:s.id,name:s.name,total:{low:0,high:0,complete:false,unknown:[`${s.name}: no cost record`]}};
  if(r.route==="direct")total=sum(total,lineCost(r.lines.application,r.currency,prefs,`${s.name}: application fee`));
  else if(r.route==="unknown")total={low:0,high:0,complete:false,unknown:[`${s.name}: application route/fee unconfirmed`]};
  total=sum(total,lineCost(r.lines.supplement,r.currency,prefs,`${s.name}: supplementary/programme fee`));application=sum(application,total);
  if(r.lines.application?.waiverPending)warnings.push(`${s.name}: pending fee waiver is not deducted until approved.`);
  return {id:s.id,name:s.name,total};});
 for(const extra of prefs.extras.filter(e=>e.phase==="application")){const c=lineCost(extra.line,extra.currency,prefs,extra.label);application=sum(application,{...c,low:c.low*extra.quantity,high:c.high*extra.quantity});const p=paidCost(extra.line,extra.currency,extra.label);applicationPaid=sum(applicationPaid,{...p,low:p.low*extra.quantity,high:p.high*extra.quantity});}
 const missingRows=applicationBySchool.filter(s=>!record.has(s.id));for(const row of missingRows)application=sum(application,row.total);
 if(!prefs.reviewedApplicationExtras)application={...application,complete:false,unknown:[...application.unknown,"Review shared test / report / translation / courier / portfolio expenses and applicability"]};
 const paid=applicationPaid; // Paid is cash already spent, not a discount on total application cost.
 const scenarios=active.map(s=>{const r=record.get(s.id);if(!r)return {school:s,annual:{low:0,high:0,complete:false,unknown:["No attendance costs entered"]} as Range,firstYear:null,degree:null,upfront:null,proof:null,gap:null,firstYearGap:null,cashGap:null,annualAffordable:false,financialSafety:false,years:null,loan:0};
  let annual=annualKeys.reduce((a,k)=>sum(a,lineCost(r.lines[k],r.currency,prefs,`${s.name}: ${k}`)),zero());let arrival=arrivalKeys.reduce((a,k)=>sum(a,lineCost(r.lines[k],r.currency,prefs,`${s.name}: ${k}`)),zero());
  for(const e of prefs.extras.filter(e=>e.phase!=="application")){const c=lineCost(e.line,e.currency,prefs,e.label);const q={...c,low:c.low*e.quantity,high:c.high*e.quantity};if(e.phase==="annual")annual=sum(annual,q);else arrival=sum(arrival,q);}
  if(!prefs.reviewedAttendanceExtras)annual={...annual,complete:false,unknown:[...annual.unknown,"Review annual flights, vacation, payment, financing and other attendance extras"]};
  if(r.months!==12)annual={...annual,complete:false,unknown:[...annual.unknown,"Year-round living coverage unconfirmed; include vacations or explicitly budget the full year"]};
  const award=convertMoney(r.awardConfirmed?(r.awardAnnual??0):0,r.currency,prefs.currency,prefs.fx);if(award===null&&r.awardConfirmed)annual={...annual,complete:false,unknown:[...annual.unknown,"Award exchange rate"]};
  const net=(a:Range,aid:number):Range=>({...a,low:Math.max(0,a.low-aid),high:Math.max(0,a.high-aid)});
  const contingency=1+prefs.contingency/100;
  const yearNet=net(annual,award??0),annualWithBuffer={...yearNet,low:round(yearNet.low*contingency),high:round(yearNet.high*contingency)};
  const firstYear=sum(annualWithBuffer,arrival);
  const deposit=lineCost(r.lines.deposit,r.currency,prefs,`${s.name}: deposit`);
  if(!r.depositCredited&&!r.depositRefundable){firstYear.low+=deposit.low;firstYear.high+=deposit.high;firstYear.complete&&=deposit.complete;firstYear.unknown.push(...deposit.unknown);}
  const upfront=sum(deposit,arrival);const proof=lineCost(r.lines.proofFunds,r.currency,prefs,`${s.name}: proof of funds (cash evidence, not another expense)`);
  let degree:Range|null=r.years?zero():null;
  if(degree&&r.years)for(let y=0;y<r.years;y++){const factor=(1+r.annualIncrease/100)**y;const a=net({...annual,low:annual.low*factor,high:annual.high*factor},r.awardConfirmed&&y<r.awardYears?(award??0):0);degree=sum(degree,{...a,low:a.low*contingency,high:a.high*contingency});}
  if(degree){degree=sum(degree,arrival);if(!r.depositCredited&&!r.depositRefundable)degree=sum(degree,deposit);}
  const loan=convertMoney(r.loanAnnual??0,r.currency,prefs.currency,prefs.fx)??0;
  const gap=annualLimit===null?null:Math.max(0,round(annualWithBuffer.high-annualLimit));
  const annualAffordable=annualWithBuffer.complete&&annualLimit!==null&&gap===0;
  const financialSafety=firstYear.complete&&deposit.complete&&proof.complete&&r.feeStatus!=="unknown"&&annualLimit!==null&&firstYear.high<=annualLimit&&cashLimit!==null&&Math.max(upfront.high,proof.high)<=cashLimit&&([...annualKeys,...arrivalKeys,"deposit","proofFunds"] as CostKey[]).every(k=>["confirmed","paid","not_needed","waived"].includes(r.lines[k]?.status??"unknown"))&&[...annualKeys,...arrivalKeys].every(k=>["not_needed","waived"].includes(r.lines[k]?.status??"")||[String(s.entryYear??prefs.entryYear),`${s.entryYear??prefs.entryYear}-${(s.entryYear??prefs.entryYear)+1}`].includes(r.lines[k]?.cycle??""));
  if(r.awardAnnual&&!r.awardConfirmed)warnings.push(`${s.name}: hoped-for scholarship excluded from net costs.`);
  if(r.feeStatus==="unknown")warnings.push(`${s.name}: tuition residency/fee status is unconfirmed.`);
  if(r.months!==12)warnings.push(`${s.name}: living estimate covers ${r.months} months; summer/vacation accommodation may be extra.`);
  if(!r.years)warnings.push(`${s.name}: degree duration missing; full-degree total unavailable.`);
  return {school:s,annual:annualWithBuffer,firstYear,degree,upfront,proof,gap,firstYearGap:annualLimit===null?null:Math.max(0,round(firstYear.high-annualLimit)),cashGap:cashLimit===null?null:Math.max(0,round(Math.max(upfront.high,proof.high)-cashLimit)),annualAffordable,financialSafety,years:r.years,loan};});
 const applicationWithBuffer={...application,low:round(application.low*(1+prefs.contingency/100)),high:round(application.high*(1+prefs.contingency/100))};
 const remaining=application.complete&&paid.complete?Math.max(0,application.high-paid.low):null;
 const work=plan?{remainingMinutes:plan.tasks.filter(t=>!t.done).reduce((n,t)=>n+t.minutes,0),scheduledMinutes:plan.sessions.reduce((n,s)=>n+s.minutes,0),unplacedMinutes:plan.remaining.reduce((n,t)=>n+t.minutes,0),bySchool:schools.map(s=>({id:s.id,name:s.name,minutes:plan.tasks.filter(t=>t.entryId===s.id&&!t.done).reduce((n,t)=>n+t.minutes,0)})),warnings:plan.warnings}:null;
 if(prefs.fx&&Date.now()-Date.parse(prefs.fx.date+"T12:00:00Z")>7*86400000)warnings.push(`Exchange-rate snapshot ${prefs.fx.date} is older than seven days; refresh before paying.`);
 return {currency:prefs.currency,limits:{application:applicationLimit,annual:annualLimit,cash:cashLimit},application:applicationWithBuffer,applicationBeforeBuffer:application,paid,remaining,applicationGap:applicationLimit===null?null:Math.max(0,round(applicationWithBuffer.high-applicationLimit)),applicationBySchool,platformCharges,scenarios,work,warnings};
}
export type ApplicationBudget=ReturnType<typeof buildBudget>;
export {COST_KEYS};
