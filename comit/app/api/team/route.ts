import {NextResponse} from "next/server";
import {getSessionUser,requireAdminDb} from "@/lib/outreach";
const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const user=getSessionUser(req); if(!user)return NextResponse.json({error:"Authentication required"},{status:401});
 try{const db=await requireAdminDb();
  const [{data:members,error:memberError},{data:templates,error:templateError}]=await Promise.all([
   db.from("team_profiles").select("id,name,email,phone,role,focus,initials,logo_key,color_token,daily_target,automation_lane,active").eq("organization_id",ORG_ID).eq("active",true).order("name"),
   db.from("team_task_templates").select("id,team_profile_id,title,description,priority,due_hour,workflow_key,enabled").eq("organization_id",ORG_ID).eq("enabled",true).order("due_hour")
  ]);
  if(memberError)throw memberError;if(templateError)throw templateError;
  return NextResponse.json({members:members||[],templates:templates||[],synced_at:new Date().toISOString()});
 }catch(error:any){return NextResponse.json({error:error?.message||"Team data unavailable"},{status:500})}
}
