import {NextResponse} from "next/server";
import {getSessionUser,requireAdminDb} from "@/lib/outreach";

const nudges=[
  "Take a deep breath and reset for 60 seconds.",
  "Quick hydration check — have some water.",
  "Review your top 3 revenue tasks before starting new work.",
  "If a task is blocked, flag it instead of carrying it silently."
];

export const dynamic="force-dynamic";

export async function GET(req:Request){
  const user=await getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const hour=new Date().getHours();
  try{
    const db=await requireAdminDb();
    const notifications=await db.from("notifications")
      .select("id,type,title,body,metadata,read_at,created_at")
      .eq("organization_id","acda1757-1698-405a-8451-5674316ceeaf")
      .contains("metadata",{target_email:user.email})
      .order("created_at",{ascending:false})
      .limit(30);
    if(notifications.error)throw notifications.error;
    const items=notifications.data||[];
    return NextResponse.json({
      ok:true,
      user,
      nudge:nudges[hour%nudges.length],
      channels:["in-app","browser"],
      notifications:items,
      unread:items.filter((item:any)=>!item.read_at).length
    });
  }catch(error:any){
    return NextResponse.json({
      ok:true,
      user,
      nudge:nudges[hour%nudges.length],
      channels:["in-app","browser"],
      notifications:[],
      unread:0,
      warning:error?.message||"Personal notifications are temporarily unavailable."
    });
  }
}

export async function POST(req:Request){
  const user=await getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const body=await req.json().catch(()=>({}));
  const id=String(body.id||"");
  if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({ok:false,error:"Valid notification id required"},{status:400});
  try{
    const db=await requireAdminDb();
    const existing=await db.from("notifications")
      .select("id,metadata")
      .eq("organization_id","acda1757-1698-405a-8451-5674316ceeaf")
      .eq("id",id).single();
    if(existing.error||!existing.data)return NextResponse.json({ok:false,error:"Notification not found"},{status:404});
    if(String(existing.data.metadata?.target_email||"").toLowerCase()!==user.email.toLowerCase()){
      return NextResponse.json({ok:false,error:"Notification does not belong to this teammate"},{status:403});
    }
    const updated=await db.from("notifications").update({read_at:new Date().toISOString()}).eq("id",id).select("id,read_at").single();
    if(updated.error)throw updated.error;
    return NextResponse.json({ok:true,notification:updated.data});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Could not update notification"},{status:503});
  }
}
