import {NextResponse} from "next/server";
import {timingSafeEqual} from "crypto";
import {requireAdminDb} from "@/lib/outreach";
import {AGENT_ORG_ID,processAgentJob} from "@/lib/agent-runner";

export const dynamic="force-dynamic";
function authorized(req:Request){
 const secret=process.env.AGENT_WORKER_SECRET;
 const supplied=req.headers.get("authorization")?.replace(/^Bearer /,"")||"";
 if(!secret||!supplied||supplied.length!==secret.length)return false;
 return timingSafeEqual(Buffer.from(secret),Buffer.from(supplied));
}
export async function POST(req:Request){
 if(!authorized(req))return NextResponse.json({ok:false,error:"unauthorized"},{status:401});
 try{
  const db=await requireAdminDb();
  const {data,error}=await db.from("workflow_executions").select("id,status,input").eq("organization_id",AGENT_ORG_ID).eq("status","queued").eq("input->>kind","agent_home").order("created_at",{ascending:true}).limit(3);
  if(error)throw error;
  const results=[];
  for(const job of data||[])results.push(await processAgentJob(db,job));
  return NextResponse.json({ok:true,examined:(data||[]).length,results});
 }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Worker unavailable"},{status:503})}
}
