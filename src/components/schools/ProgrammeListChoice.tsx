"use client";
import {useState} from "react";
import Link from "next/link";
import {AddToListButton} from "@/components/cds/SchoolClientBits";
export function ProgrammeListChoice({schoolId,onList,major,category,zh}:{schoolId:string;onList:boolean;major:string;category:"reach"|"target"|"likely"|null;zh:boolean}){
 const [choice,setChoice]=useState(category??"");
 if(onList)return <Link href="/my-list" className="badge badge-strong">✓ {zh?"已加入清单／修改分组":"On my list / edit group"}</Link>;
 return <div className="space-y-2"><label className="field-label text-xs">{zh?"保存到哪个分组？":"Save to which group?"}<select className="input mt-1 w-full" value={choice} onChange={e=>setChoice(e.target.value)}><option value="">{zh?"待评估":"Unassessed"}</option><option value="reach">Reach / 冲刺</option><option value="target">Target / 匹配</option><option value="likely">Safety / 保底</option></select></label><AddToListButton schoolId={schoolId} onList={false} signedIn intendedMajor={major} category={choice?choice as "reach"|"target"|"likely":undefined} label={choice?`${zh?"加入":"Add as"} ${choice==="likely"?"Safety":choice==="reach"?"Reach":"Target"}`:zh?"加入清单（分组待定）":"Add to list (group undecided)"}/></div>;
}
