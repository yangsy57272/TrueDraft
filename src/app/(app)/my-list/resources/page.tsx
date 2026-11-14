import Link from "next/link";
import {requirePageUser} from "@/server/session";
import {getT} from "@/i18n/server";
import {getStudentResources} from "@/server/services/student-resources";
import {CIP_CODES} from "@/lib/planning";
import {StudentResourcesPlanner} from "@/components/journey/StudentResourcesPlanner";
export const metadata={title:"Application budget & admission groups",robots:{index:false}};
export default async function ResourcesPage({searchParams}:{searchParams:Promise<{school?:string;field?:string}>}){
 const user=await requirePageUser();const [{locale},data,query]=await Promise.all([getT(),getStudentResources(user.id),searchParams]);const zh=locale==="zh-CN";
 const target=data.schoolOptions.some(s=>s.slug===query.school)?{slug:query.school!,field:query.field&&CIP_CODES.includes(query.field)?query.field:"11"}:undefined;
 return <div className="container-page py-10"><Link href="/my-list">← {zh?"选校清单":"My list"}</Link><h1 className="mt-3 text-3xl font-semibold">{zh?"申请预算、录取分组与时间投入":"Application budget, admission groups & time"}</h1><p className="mt-3 max-w-3xl text-ink-soft">{zh?"以你的实际选校清单为基础：先填写预算与学历，再逐校核实课程和费用，比较可负担的入学方案。保存后会更新推荐分组和时间表。":"Start with your actual school list: set your budget and qualification, confirm each course and its costs, then compare affordable enrolment alternatives. Saving updates recommendation groups and the work timetable."}</p><StudentResourcesPlanner initial={data} target={target}/></div>;
}
