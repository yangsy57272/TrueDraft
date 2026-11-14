import {apiRoute,requireApiUser,jsonResponse} from "@/server/http";
import {refreshResourceRates} from "@/server/services/student-resources";
export const POST=apiRoute("resources.fx",async req=>jsonResponse(await refreshResourceRates((await requireApiUser(req)).id)));
