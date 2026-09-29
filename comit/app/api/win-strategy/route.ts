import {NextResponse} from "next/server";
import {getSessionUser,requireAdminDb} from "@/lib/outreach";
import {buildSalesStrategy,salesContextFromProspect} from "@/lib/sales-engine";

function planFor(prospect:any){
 const context=salesContextFromProspect(prospect);
 const strategy=buildSalesStrategy(context);
 return {
  win_score:strategy.score.total,
  priority:strategy.score.band==="hot"?"high":strategy.score.band==="warm"?"medium":"research-more",
  strategy:"RESEARCH → QUALIFY → PROOF → DISCOVERY → PROPOSAL → CLOSE → OUTCOME",
  supported_facts:strategy.supportedFacts,
  value_hypothesis:strategy.problemHypothesis,
  value_angle:strategy.valueAngle,
  proof_plan:[
   "Create the account-specific proof asset: "+strategy.proofAsset+".",
   "Tie the proof to one measurable business outcome.",
   "Offer a small, reversible first step before a broad retainer."
  ],
  discovery_questions:strategy.discoveryQuestions,
  score_breakdown:strategy.score.components,
  research_gaps:strategy.score.missing,
  next_action:strategy.nextAction
 };
}

async function getProspect(db:Awaited<ReturnType<typeof requireAdminDb>>,id:string){
 const {data,error}=await db.from("prospects").select("*, companies(name,website,industry,location)").eq("id",id).single();
 if(error)throw error;
 return data;
}

export async function GET(req:Request){
 const user=await getSessionUser(req);
 if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const id=new URL(req.url).searchParams.get("prospectId");
 if(!id)return NextResponse.json({ok:false,error:"prospectId is required"},{status:400});
 try{
  const db=await requireAdminDb();
  const prospect=await getProspect(db,id);
  return NextResponse.json({ok:true,prospect,plan:planFor(prospect)});
 }catch(e:any){
  return NextResponse.json({ok:false,error:e?.message||"Failed to build win strategy"},{status:500});
 }
}

export async function POST(req:Request){
 const user=await getSessionUser(req);
 if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const body=await req.json().catch(()=>({}));
 if(!body.prospectId)return NextResponse.json({ok:false,error:"prospectId is required"},{status:400});
 try{
  const db=await requireAdminDb();
  const prospect=await getProspect(db,String(body.prospectId));
  const plan=planFor(prospect);
  return NextResponse.json({ok:true,status:"win-plan-ready",requestedBy:user.email,plan});
 }catch(e:any){
  return NextResponse.json({ok:false,error:e?.message||"Failed to build win strategy"},{status:500});
 }
}
