"use client";
import {useState} from "react";
import Link from "next/link";
import {useI18n} from "@/i18n/client";
import {apiFetch} from "@/lib/api-client";
import {VERIFIED_ENTRY_YEAR} from "@/lib/admission-deadlines";
import {APPLICATION_ROUNDS} from "@/lib/planning";
import type {ScheduleSchool} from "@/lib/application-schedule";
export function SchoolRoundSelector({school,onSaved,disabled=false}:{school:ScheduleSchool;onSaved:()=>Promise<void>;disabled?:boolean}){
 const {locale,t}=useI18n();const zh=locale==="zh-CN";
 const [year,setYear]=useState(school.entryYear??VERIFIED_ENTRY_YEAR);const [round,setRound]=useState(school.round);
 const [trackId,setTrackId]=useState(school.deadlineTrack??(school.admissionDeadlines?.tracks.length===1?school.admissionDeadlines.tracks[0].id:""));const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const catalog=school.admissionDeadlines?.entryYear===year?school.admissionDeadlines:null;
 const track=catalog?.tracks.find(x=>x.id===trackId);const choice=track?.options.find(x=>x.round===round);
 const sources=catalog?.sources.filter(s=>choice?.sourceIds.includes(s.id))??[];
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const res=await apiFetch(`/api/list/${school.id}`,{method:"PATCH",body:{round,entryYear:year,deadlineTrack:trackId||null}});if(res.ok)await onSaved();else setError(res.details?.reason==="round_not_offered"?(zh?"该项目不提供此轮次，请选择官网列出的选项。":"This programme does not offer that round. Choose a listed option."):t(`errors.${res.code}` as never));setBusy(false);}
 return <form onSubmit={save} className="mt-4 rounded-xl border border-line p-4"><h3 className="font-semibold">{school.name}{school.major?` · ${school.major}`:""}</h3><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
  <label className="field-label text-sm">{zh?"入学年份":"Entry year"}<input className="input mt-1 w-full min-w-0 max-w-full" type="number" min="2025" max="2040" value={year} onChange={e=>setYear(Number(e.target.value))}/></label>
  {catalog&&catalog.tracks.length>1?<label className="field-label text-sm">{zh?"实际申请项目":"Programme route"}<select className="input mt-1 w-full min-w-0 max-w-full" value={trackId} onChange={e=>{setTrackId(e.target.value);setRound("undecided");}}><option value="">{zh?"请选择项目":"Choose programme"}</option>{catalog.tracks.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>:null}
  <label className="field-label text-sm">{zh?"申请轮次":"Application round"}<select className="input mt-1 w-full min-w-0 max-w-full" value={round} disabled={Boolean(catalog&&catalog.tracks.length>1&&!track)} onChange={e=>setRound(e.target.value)}>{APPLICATION_ROUNDS.map(r=>{const option=track?.options.find(x=>x.round===r);const unavailable=Boolean(track&&catalog?.completeRoundList&&r!=="undecided"&&!option);return <option key={r} value={r} disabled={unavailable}>{option?.label??t(`list.rounds.${r}` as never)}{option?` · ${option.date}`:unavailable?(zh?" · 不提供":" · not offered"):r!=="undecided"?(zh?" · 待核实":" · unverified"):""}</option>})}</select></label>
 </div>{choice?<><p className="mt-3 text-sm"><strong>{choice.date}</strong> · {choice.time??(zh?"关闭时间待核实":"closing time unconfirmed")} · {choice.timeBasis==="applicant_local"?(zh?"申请者本地时间":"applicant’s local time"):choice.timeBasis==="unknown"?(zh?"时区待核实":"time zone unconfirmed"):choice.timeZone}</p><p className="mt-1 text-sm">{choice.note}</p><p className="mt-2 text-xs">{zh?"日期与两个不同的官方出版页面逐项核对，每页分别读取两次。请在最终提交前查看原始要求。":"Date matched against two distinct official publications, each retrieved twice. Recheck the original requirements before final submission."}</p><ul className="mt-2 space-y-1 text-xs">{sources.map(s=><li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{zh?"官方依据":"Official evidence"} ↗</a> · {s.checkedAt.slice(0,10)}</li>)}</ul></>:<p className="mt-3 text-sm text-ink-soft">{catalog&&catalog.tracks.length>1&&!track?(zh?"先选择项目，避免把专业例外的截止日期混用。":"Choose the programme to account for deadline exceptions."):(zh?"该学校／年份／轮次还没有两份官方依据支持的自动日期。可保存选择，随后在选校清单核实并填写日期；不会猜测统一日期。":"No twice-corroborated automatic date for this school/year/round yet. Save the choice and verify/enter the date in My list; a generic date will not be guessed.")}</p>}
 {catalog?<p className="mt-2 text-xs text-ink-soft">{catalog.notes}{track?.note?` ${track.note}`:""}</p>:null}
 <div className="mt-3 flex flex-wrap gap-3"><button className="btn btn-primary btn-sm" disabled={busy||disabled||Boolean(catalog&&catalog.tracks.length>1&&!track&&round!=="undecided")}>{busy?(zh?"正在更新…":"Updating…"):(zh?"采用此轮次并重新安排":"Use this round & replan")}</button><Link className="text-sm" href="/my-list">{zh?"查看／编辑完整截止记录":"Review / edit deadline records"}</Link></div>{error?<p className="mt-2 text-sm" role="alert">{error}</p>:null}
 </form>;
}
