import {NextResponse} from "next/server";
import {getSessionUser,isApprover,requireAdminDb} from "@/lib/outreach";

const ORG_ID="acda1757-1698-405a-8451-5674316ceeaf";
export const dynamic="force-dynamic";

export async function GET(request:Request){
  const user=await getSessionUser(request);
  if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
  try{
    const db=await requireAdminDb();
    const [evaluations,feedback,outcomes]=await Promise.all([
      db.from("events").select("payload,created_at").eq("organization_id",ORG_ID).eq("event_type","agent.evaluation.completed").order("created_at",{ascending:false}).limit(100),
      db.from("events").select("payload,created_at").eq("organization_id",ORG_ID).eq("event_type","agent.feedback.reviewed").order("created_at",{ascending:false}).limit(100),
      db.from("events").select("payload,created_at").eq("organization_id",ORG_ID).eq("event_type","sales.outcome.recorded").order("created_at",{ascending:false}).limit(100)
    ]);
    if(evaluations.error)throw evaluations.error;
    if(feedback.error)throw feedback.error;
    if(outcomes.error)throw outcomes.error;

    const scores=(evaluations.data||[]).map((x:any)=>Number(x.payload?.score)).filter((x:number)=>Number.isFinite(x));
    const passes=(evaluations.data||[]).filter((x:any)=>x.payload?.pass===true).length;
    const reviewed=(feedback.data||[]).filter((x:any)=>x.payload?.decision==="accept"&&x.payload?.approved_for_reuse===true).length;
    const outcomeRows=outcomes.data||[];
    const positive=outcomeRows.filter((x:any)=>["positive_reply","meeting_booked","proposal_sent","won"].includes(String(x.payload?.outcome))).length;

    return NextResponse.json({
      ok:true,
      mode:"manual-outcome-learning",
      recurring_compute:false,
      metrics:{
        evaluated_outputs:scores.length,
        average_quality:scores.length?Number((scores.reduce((a:number,b:number)=>a+b,0)/scores.length).toFixed(1)):0,
        quality_pass_rate:scores.length?Number(((passes/scores.length)*100).toFixed(1)):0,
        founder_approved_feedback:reviewed,
        recorded_sales_outcomes:outcomeRows.length,
        positive_sales_outcomes:positive
      },
      rule:"COMIT only learns reusable lessons from human-reviewed corrections and recorded sales outcomes. No scheduled model training is running."
    });
  }catch(error:any){
    return NextResponse.json({ok:false,error:error?.message||"Learning summary unavailable"},{status:503});
  }
}

export async function POST(request:Request){
  const user=await getSessionUser(request);
  if(!user||!isApprover(user))return NextResponse.json({ok:false,error:"Founder approval required"},{status:403});
  return NextResponse.json({
    ok:false,
    error:"Automatic learning cycles are disabled. Record a measured sales outcome in the AI Training Lab instead.",
    next:"/agents/training"
  },{status:409});
}
