import {apiRoute,requireApiUser,jsonResponse,parseJson} from "@/server/http";
import {resourcesSchema} from "@/lib/student-resources";
import {getStudentResources,saveStudentResources} from "@/server/services/student-resources";
export const GET=apiRoute("resources.get",async req=>jsonResponse(await getStudentResources((await requireApiUser(req)).id)));
export const PUT=apiRoute("resources.save",async req=>{const user=await requireApiUser(req);const input=await parseJson(req,resourcesSchema);return jsonResponse(await saveStudentResources(user.id,input));});
