import {NextResponse} from "next/server";
import {getSessionUser,requireAdminDb} from "@/lib/outreach";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
const statuses=new Set(["available","focused","blocked","done"]);
export const dynamic="force-dynamic";

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const [members,pulses]=await Promise.all([
      db.from("team_profiles")
        .select("id,name,email,role,focus,initials,color_token,daily_target,automation_lane")
        .eq("organization_id",ORG_ID).eq("active",true).order("name"),
      db.from("team_daily_pulse")
        .select("id,user_email,status,focus,blocker,created_at")
        .eq("organization_id",ORG_ID)
        .gte("created_at",new Date(Date.now()-48*60*60*1000).toISOString())
        .order("created_at",{ascending:false}).limit(100)
    ]);
    if(members.error)throw members.error;
    if(pulses.error)throw pulses.error;
    const latest=new Map<string,any>();
    for(const row of pulses.data||[])if(!latest.has(String(row.user_email).toLowerCase()))latest.set(String(row.user_email).toLowerCase(),row);
    return NextResponse.json({
      ok:true,
      user:{email:user.email,name:user.name},
      members:(members.data||[]).map((m:any)=>({...m,pulse:latest.get(String(m.email).toLowerCase())||null})),
      note:"Work-status pulse only. Private wellness data is stored separately and is never included here."
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Team pulse unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const body=await req.json().catch(()=>({}));
  const status=String(body.status||"focused");
  const focus=typeof body.focus==="string"?body.focus.trim():"";
  const blocker=typeof body.blocker==="string"?body.blocker.trim():"";
  if(!statuses.has(status))return NextResponse.json({ok:false,error:"Invalid work status."},{status:400});
  if(focus.length<3||focus.length>280)return NextResponse.json({ok:false,error:"Focus must contain 3–280 characters."},{status:400});
  if(blocker.length>280)return NextResponse.json({ok:false,error:"Blocker must be 280 characters or less."},{status:400});
  try{
    const db=await requireAdminDb();
    const row=await db.from("team_daily_pulse").insert({
      organization_id:ORG_ID,user_email:user.email,status,focus,blocker:blocker||null
    }).select("id,user_email,status,focus,blocker,created_at").single();
    if(row.error)throw row.error;
    await db.from("events").insert({
      organization_id:ORG_ID,event_type:"team.pulse.updated",aggregate_type:"team_member",aggregate_id:null,
      payload:{user_email:user.email,status,has_blocker:Boolean(blocker),focus_summary:focus.slice(0,100)}
    });
    return NextResponse.json({ok:true,pulse:row.data});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Could not save team pulse"},{status:503});
  }
}
