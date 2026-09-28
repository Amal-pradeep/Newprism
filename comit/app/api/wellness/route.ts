import {NextResponse} from "next/server";
import {getSessionUser,requireAdminDb} from "@/lib/outreach";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
const allowedKinds=new Set(["water","screen_break","movement","meal","energy","day_checkin"]);
export const dynamic="force-dynamic";

function validDayStart(value:string|null){
  if(!value)return new Date(Date.now()-24*60*60*1000).toISOString();
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return new Date(Date.now()-24*60*60*1000).toISOString();
  const diff=Math.abs(Date.now()-d.getTime());
  return diff<=72*60*60*1000?d.toISOString():new Date(Date.now()-24*60*60*1000).toISOString();
}

export async function GET(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const start=validDayStart(new URL(req.url).searchParams.get("dayStart"));
    const [preferences,checkins]=await Promise.all([
      db.from("team_wellness_preferences")
        .select("water_target_ml,water_reminders,break_reminders,movement_reminders,reminder_interval_minutes,updated_at")
        .eq("organization_id",ORG_ID).eq("user_email",user.email).maybeSingle(),
      db.from("team_wellness_checkins")
        .select("id,kind,amount_ml,energy_level,note,created_at")
        .eq("organization_id",ORG_ID).eq("user_email",user.email)
        .gte("created_at",start).order("created_at",{ascending:true}).limit(200)
    ]);
    if(preferences.error)throw preferences.error;
    if(checkins.error)throw checkins.error;
    const rows=checkins.data||[];
    const water=rows.filter((x:any)=>x.kind==="water").reduce((sum:number,x:any)=>sum+Number(x.amount_ml||0),0);
    const breaks=rows.filter((x:any)=>x.kind==="screen_break").length;
    const movement=rows.filter((x:any)=>x.kind==="movement").length;
    const meals=rows.filter((x:any)=>x.kind==="meal").length;
    const latestEnergy=[...rows].reverse().find((x:any)=>x.kind==="energy")?.energy_level||null;
    return NextResponse.json({
      ok:true,
      user:{name:user.name,email:user.email},
      privacy:"private-self-tracking",
      medical_use:false,
      preferences:preferences.data||{
        water_target_ml:null,water_reminders:true,break_reminders:true,movement_reminders:true,reminder_interval_minutes:90
      },
      summary:{water_ml:water,screen_breaks:breaks,movement_breaks:movement,meal_checkins:meals,latest_energy:latestEnergy},
      checkins:rows
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Wellness data unavailable"},{status:503});
  }
}

export async function POST(req:Request){
  const user=getSessionUser(req);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"log");
  try{
    const db=await requireAdminDb();

    if(action==="preferences"){
      const target=body.waterTargetMl===null||body.waterTargetMl===""?null:Number(body.waterTargetMl);
      const interval=Number(body.reminderIntervalMinutes||90);
      if(target!==null&&(!Number.isFinite(target)||target<250||target>10000))return NextResponse.json({ok:false,error:"Water target must be between 250 and 10000 ml, or left blank."},{status:400});
      if(!Number.isFinite(interval)||interval<30||interval>240)return NextResponse.json({ok:false,error:"Reminder interval must be 30–240 minutes."},{status:400});
      const row={
        organization_id:ORG_ID,user_email:user.email,
        water_target_ml:target,
        water_reminders:body.waterReminders!==false,
        break_reminders:body.breakReminders!==false,
        movement_reminders:body.movementReminders!==false,
        reminder_interval_minutes:Math.round(interval),
        updated_at:new Date().toISOString()
      };
      const saved=await db.from("team_wellness_preferences").upsert(row,{onConflict:"organization_id,user_email"}).select().single();
      if(saved.error)throw saved.error;
      return NextResponse.json({ok:true,preferences:saved.data});
    }

    const kind=String(body.kind||"");
    if(!allowedKinds.has(kind))return NextResponse.json({ok:false,error:"Unsupported check-in type."},{status:400});
    const amount=body.amountMl===undefined||body.amountMl===null?null:Number(body.amountMl);
    const energy=body.energyLevel===undefined||body.energyLevel===null?null:Number(body.energyLevel);
    const note=typeof body.note==="string"?body.note.trim().slice(0,300):null;
    if(kind==="water"&&(!Number.isFinite(amount)||Number(amount)<50||Number(amount)>1500))return NextResponse.json({ok:false,error:"Water entry must be 50–1500 ml."},{status:400});
    if(kind==="energy"&&(!Number.isFinite(energy)||Number(energy)<1||Number(energy)>5))return NextResponse.json({ok:false,error:"Energy check-in must be 1–5."},{status:400});

    const saved=await db.from("team_wellness_checkins").insert({
      organization_id:ORG_ID,user_email:user.email,kind,
      amount_ml:kind==="water"?Math.round(Number(amount)):null,
      energy_level:kind==="energy"?Math.round(Number(energy)):null,
      note
    }).select("id,kind,amount_ml,energy_level,note,created_at").single();
    if(saved.error)throw saved.error;
    return NextResponse.json({ok:true,checkin:saved.data});
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Could not save wellness check-in"},{status:503});
  }
}
