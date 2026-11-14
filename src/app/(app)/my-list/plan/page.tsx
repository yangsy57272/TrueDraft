import Link from "next/link";
import {requirePageUser} from "@/server/session";
import {getT} from "@/i18n/server";
import {getApplicationSchedule} from "@/server/services/application-schedule";
import {ApplicationPlanner} from "@/components/journey/ApplicationPlanner";
export const metadata={title:"My application plan",robots:{index:false}};
export default async function ApplicationPlanPage(){
 const user=await requirePageUser();const [{locale},data]=await Promise.all([getT(),getApplicationSchedule(user.id)]);const zh=locale==="zh-CN";
 return <div className="container-page py-10"><Link href="/my-list">← {zh?"我的选校清单":"My college list"}</Link><h1 className="mt-3 text-3xl font-semibold">{zh?"我的申请时间表":"My application plan"}</h1><p className="mt-3 max-w-3xl text-ink-soft">{zh?"根据你的学校、专业、补充文书、已填写的截止日期和文书进度自动安排。设置每周可用时间，逐项完成研究、写作与申请准备；回来时会按最新进度重新计算。":"Automatically planned around your schools, programmes, supplements, entered deadlines and essay progress. Set your weekly availability, then work through research, writing and application preparation. Returning to this page recalculates the plan using your latest progress."}</p><p className="mt-4"><Link href="/my-list/resources">{locale==="zh-CN"?"预算、录取分组与时间投入 →":"Budget, admission groups & time →"}</Link></p><ApplicationPlanner initial={data}/></div>;
}
