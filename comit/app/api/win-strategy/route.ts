import {NextResponse} from "next/server";
import {getSessionUser, requireAdminDb} from "@/lib/outreach";

const discovery=[
"Why is this a priority now?",
"What business outcome are you trying to improve?",
"What is the current process and where is it breaking?",
"What happens if the problem remains for another 6 months?",
"Who owns this problem internally?",
"Who else will influence the decision?",
"What alternatives are you considering?",
"What would make a solution feel low-risk?",
"What proof would you need before moving forward?",
"What is the decision process and target timing?",
"What would prevent this project from moving ahead?",
];

function clamp(n:number){return Math.max(0,Math.min(100,Math.round(n)))}

function buildWinPlan(p:any){
 const m=p.metadata||{}; const score=Number(p.score||0);
 const evidence=Number(Boolean(p.source||m.source_url))+Number(Boolean(m.fit_reason))+Number(Boolean(m.industry))+Number(Boolean(m.location));
 const email=Number(Boolean(p.email));
 const urgency=Number(m.trigger||m.buying_signal||m.recent_news||m.recent_change?1:0);
 const fit=clamp(score);
 const research=clamp(evidence*20);
 const access=clamp(email*100);
 const intent=clamp(urgency*100);
 const winScore=clamp(fit*.35+research*.20+access*.10+intent*.20+15);
 const gaps:string[]=[];
 if(!m.fit_reason)gaps.push("Verify the business problem and why Prism is relevant.");
 if(!m.trigger&&!m.buying_signal&&!m.recent_news)gaps.push("Find a current trigger: launch, hiring, expansion, weak funnel, new location, campaign, or visible growth initiative.");
 if(!p.email)gaps.push("Verify a legitimate public business contact before outreach.");
 gaps.push("Identify at least one decision-maker and one operational stakeholder.");
 gaps.push("Prepare one concrete proof/value artifact before asking for a meeting.");
 const opening=m.recent_news||m.buying_signal||m.trigger
   ? `Lead with the verified trigger: ${m.recent_news||m.buying_signal||m.trigger}.`
   : `Lead with a specific, evidence-backed growth hypothesis for ${p.name} rather than a generic agency pitch.`;
 return {
  win_score:winScore,
  priority:winScore>=75?"high":winScore>=55?"medium":"research-more",
  strategy:"RESEARCH → HYPOTHESIS → PROOF → DISCOVERY → MULTI-THREAD → PILOT → CLOSE",
  opening,
  why_now:m.trigger||m.buying_signal||"No verified urgency signal yet — research this before aggressive outreach.",
  value_hypothesis:m.fit_reason||`Prism of Stories can test a measurable digital-growth improvement for ${p.name}.`,
  proof_plan:["Create a 3–5 point account-specific growth audit.","Show one relevant Prism capability/case example.","Offer a small, measurable first step rather than a broad agency retainer."],
  stakeholders:["Economic buyer / owner","Day-to-day marketing or operations owner","Technical/creative stakeholder when relevant"],
  objections:["We already have an agency/team","Budget is not allocated","We need to think about it","We can do this internally"],
  objection_response:"Acknowledge the objection, ask what specifically is missing, then return to the business outcome and evidence rather than arguing.",
  discovery_questions:discovery,
  close_question:"If the audit confirms the opportunity and the first step is low-risk, what would need to happen internally to start?",
  followup_sequence:["Day 0: personalized insight + proof","Day 3: useful observation or mini-audit","Day 7: short case/example tied to their situation","Day 12: direct decision-process question","Day 21: respectful close-the-loop message"],
  research_gaps:gaps,
  next_action:winScore>=75?"Prepare approval-gated outreach with the verified trigger and proof asset.":winScore>=55?"Research the trigger, stakeholders and proof before sending.":"Do not rush outreach; deepen account research first."
 };
}

export async function GET(req:Request){
 const user=getSessionUser(req); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const id=new URL(req.url).searchParams.get("prospectId"); if(!id)return NextResponse.json({ok:false,error:"prospectId is required"},{status:400});
 try{const db=await requireAdminDb();const {data,error}=await db.from("prospects").select("*, companies(name,website,industry,location)").eq("id",id).single();if(error)throw error;return NextResponse.json({ok:true,prospect:data,plan:buildWinPlan(data)});}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"Failed to build win strategy"},{status:500})}
}
export async function POST(req:Request){
 const user=getSessionUser(req); if(!user)return NextResponse.json({ok:false,error:"Authentication required"},{status:401});
 const b=await req.json().catch(()=>({})); if(!b.prospectId)return NextResponse.json({ok:false,error:"prospectId is required"},{status:400});
 try{const db=await requireAdminDb();const {data,error}=await db.from("prospects").select("*, companies(name,website,industry,location)").eq("id",b.prospectId).single();if(error)throw error;const plan=buildWinPlan(data);return NextResponse.json({ok:true,status:"win-plan-ready",requestedBy:user.email,plan});}catch(e:any){return NextResponse.json({ok:false,error:e?.message||"Failed to build win strategy"},{status:500})}
}
