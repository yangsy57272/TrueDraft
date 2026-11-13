import "server-only";
import {randomUUID} from "node:crypto";
import reference from "../../../data/admission-deadlines/2026-2027.json";
import {admissionSchoolSchema,deadlineTypeForRound,verifiedOption,VERIFIED_ENTRY_YEAR,type OfficialDeadlineProvenance} from "@/lib/admission-deadlines";
import type {Deadline} from "@/lib/deadlines";
import {MAX_DEADLINES} from "@/lib/deadlines";
import {ApiError} from "../errors";
const catalog=new Map(reference.schools.map(s=>{const checked=admissionSchoolSchema.parse(s);return [checked.slug,checked];}));
export function admissionDeadlinesFor(slug:string|null|undefined){return slug?catalog.get(slug)??null:null;}
export function syncOfficialDeadline(input:{slug:string|null;round:string;entryYear:number|null;track:string|null;deadlines:Deadline[]}) {
 const school=admissionDeadlinesFor(input.slug);const year=input.entryYear??VERIFIED_ENTRY_YEAR;
 const remaining=input.deadlines.filter(d=>d.provenance?.kind!=="official_catalog");
 if(input.round==="undecided")return {deadlines:remaining,entryYear:year,deadlineTrack:input.track};
 if(!school||school.entryYear!==year)return {deadlines:remaining,entryYear:year,deadlineTrack:input.track};
 const resolved=verifiedOption(school,input.round,year,input.track);
 if(!resolved){
  if(school.tracks.length>1&&!school.tracks.some(t=>t.id===input.track))throw new ApiError(400,"validation_failed",{field:"deadlineTrack",reason:"choose_programme_route"});
  if(school.completeRoundList)throw new ApiError(400,"validation_failed",{field:"round",reason:"round_not_offered"});
  return {deadlines:remaining,entryYear:year,deadlineTrack:input.track};
 }
 if(remaining.length>=MAX_DEADLINES)throw new ApiError(409,"deadlines_full");
 const {option,track}=resolved;const sources=school.sources.filter(s=>option.sourceIds.includes(s.id));
 const previous=input.deadlines.find(d=>d.provenance?.kind==="official_catalog"&&d.provenance.round===input.round&&d.provenance.entryYear===year&&d.provenance.track===track.id);
 const provenance:OfficialDeadlineProvenance={kind:"official_catalog",schoolSlug:school.slug,entryYear:year,round:input.round,track:track.id,date:option.date,checkedAt:sources.map(s=>s.checkedAt).sort()[0],sources:sources.map(s=>s.url),timeBasis:option.timeBasis};
 const deadline:Deadline={id:previous?.id??randomUUID(),type:deadlineTypeForRound[input.round] as Deadline["type"],date:option.date,time:option.time,timeZone:option.timeZone,source:sources[0].url,label:`${input.round.toUpperCase()} · ${year} entry`,done:previous?.done??false,provenance};
 return {deadlines:[...remaining,deadline],entryYear:year,deadlineTrack:track.id};
}
