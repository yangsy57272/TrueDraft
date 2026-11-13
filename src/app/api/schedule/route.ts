import { z } from "zod";
import { apiRoute,jsonResponse,parseJson,requireApiUser } from "@/server/http";
import { schedulePreferencesSchema } from "@/lib/application-schedule";
import { getApplicationSchedule,setScheduleTask,updateScheduleState } from "@/server/services/application-schedule";
export const GET=apiRoute("schedule.get",async request=>jsonResponse(await getApplicationSchedule((await requireApiUser(request)).id)));
export const PUT=apiRoute("schedule.preferences",async request=>{
 const user=await requireApiUser(request);const preferences=await parseJson(request,schedulePreferencesSchema);
 updateScheduleState(user.id,state=>({...state,preferences}));return jsonResponse(await getApplicationSchedule(user.id));
});
export const PATCH=apiRoute("schedule.task",async request=>{
 const user=await requireApiUser(request);const input=await parseJson(request,z.object({taskId:z.string().min(1).max(220),done:z.boolean()}).strict());
 return jsonResponse(await setScheduleTask(user.id,input.taskId,input.done));
});
