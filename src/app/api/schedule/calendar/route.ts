import { apiRoute,requireApiUser } from "@/server/http";
import { getApplicationSchedule } from "@/server/services/application-schedule";
import { scheduleCalendar } from "@/lib/schedule-calendar";
export const GET=apiRoute("schedule.calendar",async request=>{
 const {plan}=await getApplicationSchedule((await requireApiUser(request)).id);
 return new Response(scheduleCalendar(plan),{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":"attachment; filename=truedraft-study-plan.ics","Cache-Control":"no-store"}});
});
