import {afterEach,describe,expect,it,vi} from "vitest";
import {POST as plan} from "@/app/api/planning/[kind]/route";
import {POST as consent} from "@/app/api/consent/route";
import {POST as lookup} from "@/app/api/schools/[slug]/research/route";
import {ctx,json,readStream,req,signIn} from "../helpers/http";
import * as collector from "@/server/research/collect";
import {getResearchRun} from "@/server/services/profile";
import type {ResearchEvidence} from "@/lib/school-research";
const evidence:ResearchEvidence={schoolSlug:"hku",schoolName:"University of Hong Kong",country:"HK",program:"Psychology",sources:[],attempted:1,unavailable:1,scope:"Synthetic test"};
afterEach(()=>vi.restoreAllMocks());
describe("research request boundaries",()=>{
 it("requires sign-in for source lookup and consent before AI collection",async()=>{
  const spy=vi.spyOn(collector,"collectResearch").mockResolvedValue(evidence);
  expect((await lookup(req("POST","/x",{body:{program:"Psychology"}}),ctx({slug:"hku"}))).status).toBe(401);
  const me=await signIn("research@example.test");const response=await plan(req("POST","/x",{cookie:me.cookie,body:{schoolSlug:"hku",program:"Psychology"}}),ctx({kind:"school_research"}));
  expect(response.status).toBe(403);expect((await json(response)).error.code).toBe("consent_required");expect(spy).not.toHaveBeenCalled();
 });
 it("allows research with an empty profile, streams the result and saves it only for its owner",async()=>{
  vi.spyOn(collector,"collectResearch").mockResolvedValue(evidence);
  const me=await signIn("research2@example.test");await consent(req("POST","/x",{cookie:me.cookie,body:{consentType:"ai_processing",action:"grant"}}),undefined as never);
  const response=await plan(req("POST","/x",{cookie:me.cookie,body:{schoolSlug:"hku",program:"Psychology"}}),ctx({kind:"school_research"}));
  const events=await readStream(response);const done=events.find(e=>e.type==="done");expect(done).toBeTruthy();
  const stored=await getResearchRun(me.userId,String(done!.runId));expect(stored?.result).toMatchObject({evidence:{schoolSlug:"hku"},auditTotal:0});
  expect(await getResearchRun("other-user",String(done!.runId))).toBeNull();
 });
});
