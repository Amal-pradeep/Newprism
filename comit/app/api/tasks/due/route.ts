import {NextResponse} from "next/server";
import {getSessionUser,isApprover,requireAdminDb} from "@/lib/outreach";
export const dynamic="force-dynamic";
export async function GET(req:Request){
  const user=await getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Sign in to check shared tasks."},{status:401});
  try{
    const db=await requireAdminDb();
    let query=db.from("tasks").select("id,title,due_at,assignee_email,status",{count:"exact"}).eq("organization_id","acda1757-1698-405a-8451-5674316ceeaf")
      .not("status","in","(done,cancelled)").lt("due_at",new Date().toISOString()).order("due_at").limit(25);
    if(!isApprover(user))query=query.eq("assignee_email",user.email);
    const result=await query;if(result.error)throw result.error;
    return NextResponse.json({ok:true,tasks:result.data||[],count:result.count||0},{headers:{"cache-control":"no-store"}});
  }catch(error:any){return NextResponse.json({ok:false,error:error?.message||"Task source unavailable."},{status:503});}
}
