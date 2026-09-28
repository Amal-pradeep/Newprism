import {buildBusinessResponse} from "./ai-system";
import {buildSalesDraft,buildSalesStrategy,normalizeSalesContext} from "./sales-engine";
import {evaluateSalesArtifact,evaluateSalesStrategy} from "./agent-evaluation";
import {selectTrainingLessons,seedSalesLessons,salesSwarmPlan} from "./agent-training";

export type AgentId="research"|"qualification"|"sales"|"outreach"|"followup"|"marketing"|"support"|"bi";
export type AgentSpec={id:AgentId;name:string;purpose:string;inputs:string[];outputs:string[];tools:string[];success:string;owner:string};

export const agentSpecs:AgentSpec[]=[
 {id:"research",name:"ResearchAgent",purpose:"Verify account facts, fit evidence and current buying signals before sales work begins.",inputs:["business","industry","location","sources","trigger"],outputs:["supported facts","research gaps","next evidence task"],tools:["reviewed knowledge lookup","prospect read"],success:"A prospect has enough verified evidence to qualify without invented claims.",owner:"Amal"},
 {id:"qualification",name:"QualificationAgent",purpose:"Score fit, urgency, access, decision process and proof readiness.",inputs:["research brief","contact status","decision process","proof"],outputs:["opportunity score","missing signals","priority"],tools:["prospect read","metric calculator"],success:"Sales time is concentrated on opportunities with evidence, urgency and access.",owner:"Amal"},
 {id:"sales",name:"SalesStrategistAgent",purpose:"Build discovery, objection and close strategy from verified account context.",inputs:["qualified opportunity","business problem","stakeholders","proof"],outputs:["discovery plan","value hypothesis","next action"],tools:["reviewed knowledge lookup","draft builder"],success:"Qualified opportunities progress to useful sales conversations and decisions.",owner:"Amal"},
 {id:"outreach",name:"OutreachAgent",purpose:"Draft a concise, personalized first-touch message for founder review.",inputs:["verified trigger","fit reason","proof asset","business contact"],outputs:["subject","message draft","quality score"],tools:["draft builder","prospect read"],success:"Approved outreach earns relevant replies without unsupported claims.",owner:"Amal"},
 {id:"followup",name:"FollowupAgent",purpose:"Create value-adding follow-ups based on prior touch and latest evidence.",inputs:["previous touch","reply state","new evidence","next question"],outputs:["follow-up draft","decision-process question","quality score"],tools:["draft builder","prospect read"],success:"Follow-ups add value and either progress the deal or close the loop respectfully.",owner:"Amal"},
 {id:"marketing",name:"MarketingAgent",purpose:"Draft a measurable campaign or content test for review.",inputs:["objective","audience","approved product facts","baseline"],outputs:["campaign brief","draft content","KPI"],tools:["reviewed knowledge lookup","campaign brief builder"],success:"A founder approves an evidence-backed test and measures qualified enquiries.",owner:"Aneesh"},
 {id:"support",name:"SupportAgent",purpose:"Triage an inquiry and draft a safe reply for review.",inputs:["customer question","approved policy","account context"],outputs:["triage","draft reply","escalation"],tools:["reviewed knowledge lookup","draft builder"],success:"The customer receives a correct approved answer and unresolved issues reach a human.",owner:"Amal"},
 {id:"bi",name:"BIAgent",purpose:"Find a measurable change in supplied business metrics.",inputs:["metric","time window","baseline","comparison"],outputs:["observation","data gaps","investigation"],tools:["reviewed knowledge lookup","metric calculator"],success:"The team verifies the signal against source data and records the decision.",owner:"Aadil"},
];

export const toolRegistry={
 "reviewed knowledge lookup":{access:"read",approval:false},
 "prospect read":{access:"read",approval:false},
 "metric calculator":{access:"local",approval:false},
 "campaign brief builder":{access:"draft",approval:false},
 "draft builder":{access:"draft",approval:false},
 "email sender":{access:"external",approval:true,enabled:false},
 "CRM mutation":{access:"external",approval:true,enabled:false},
 "ad publisher":{access:"external",approval:true,enabled:false},
} as const;

const salesAgents=new Set<AgentId>(["research","qualification","sales","outreach","followup"]);

export function routeAgent(task:string):AgentId{
 const t=task.toLowerCase();
 if(/follow.?up|no reply|second email|third email|close the loop/.test(t))return "followup";
 if(/cold email|first email|outreach|first touch/.test(t))return "outreach";
 if(/qualif|lead score|priority|fit|decision process|budget/.test(t))return "qualification";
 if(/research|verify|trigger|buying signal|account brief/.test(t))return "research";
 if(/proposal|objection|close|discovery|sales strategy|meeting/.test(t))return "sales";
 if(/support|ticket|complaint|refund|customer question|help desk|churn/.test(t))return "support";
 if(/metric|report|analytics|trend|revenue|margin|anomal|forecast|dashboard/.test(t))return "bi";
 if(/campaign|ads|seo|marketing|instagram|content/.test(t))return "marketing";
 if(/lead|prospect|sales|deal/.test(t))return "qualification";
 return "marketing";
}

function safe(value:unknown,limit=500){return typeof value==="string"?value.trim().slice(0,limit):""}

export function draftForAgent(agent:AgentId,task:string,context:Record<string,unknown>={},approvedLessons:string[]=[]){
 const spec=agentSpecs.find(x=>x.id===agent)!;

 if(salesAgents.has(agent)){
   const salesContext=normalizeSalesContext({...context,business:context.business||context.name});
   const seeded=selectTrainingLessons(agent,salesContext,seedSalesLessons,3).map(x=>x.lesson);
   const lessons=[...approvedLessons,...seeded].slice(0,5);
   const strategy=buildSalesStrategy(salesContext);
   let artifact:{title:string;body:string;checks:string[]};

   if(agent==="research"){
     artifact={
       title:"Account research brief",
       body:[
         "Opportunity band: "+strategy.score.band+" ("+strategy.score.total+"/100).",
         strategy.supportedFacts.length?"Supported facts:\n- "+strategy.supportedFacts.join("\n- "):"No supported account facts supplied yet.",
         strategy.score.missing.length?"Research gaps:\n- "+strategy.score.missing.join("\n- "):"Core qualification evidence is present.",
         "Next: "+strategy.nextAction
       ].join("\n\n"),
       checks:["Attach source/date for each material claim.","Do not convert a hypothesis into a fact."],
     };
   }else if(agent==="qualification"){
     artifact={
       title:"Opportunity qualification",
       body:"Score "+strategy.score.total+"/100 · "+strategy.score.band.toUpperCase()+". Missing: "+(strategy.score.missing.join("; ")||"none of the core signals")+". Next: "+strategy.nextAction,
       checks:["Confirm current trigger and decision process.","Do not prioritize only from a generic lead score."],
     };
   }else if(agent==="sales"){
     const draft=buildSalesDraft(salesContext,"discovery");
     artifact={title:draft.subject,body:draft.body,checks:["Use discovery to verify pain, baseline, stakeholders and timing.","Do not promise an outcome before evidence exists."]};
   }else if(agent==="followup"){
     const draft=buildSalesDraft(salesContext,"followup");
     artifact={title:draft.subject,body:draft.body,checks:["Add new value or evidence.","Stop the cadence when a human reply or clear outcome is recorded."]};
   }else{
     const draft=buildSalesDraft(salesContext,"initial");
     artifact={title:draft.subject,body:draft.body,checks:["Verify public business contact and current signal.","Founder review is required before external sending."]};
   }

   const evaluation=(agent==="research"||agent==="qualification")?evaluateSalesStrategy(strategy):evaluateSalesArtifact(artifact.body,salesContext);
   return {
     agent,owner:spec.owner,kind:"reviewable-draft",sales_strategy:strategy,artifact,evaluation,
     approved_lessons:lessons,swarm:salesSwarmPlan(task),review_required:true,external_action_taken:false,
     caution:evaluation.pass?"Quality gate passed for review; facts still require human verification.":"Quality gate recommends revision before external use."
   };
 }

 const brief=buildBusinessResponse(task,{...context,outcome:approvedLessons.join(" ").slice(0,400)||(typeof context.outcome==="string"?context.outcome:"")});
 const baseline=safe(context.baseline),current=safe(context.current);
 const baselineNumber=baseline&&Number(baseline),currentNumber=current&&Number(current);
 const measured=baselineNumber!==""&&currentNumber!==""&&Number.isFinite(baselineNumber)&&Number.isFinite(currentNumber)&&baselineNumber!==0;
 const artifact=agent==="support"?{
  title:"Customer reply draft",body:"Thanks for raising this. I am checking the relevant account details and policy with our team and will follow up with a confirmed answer.",checks:["Verify account identity and applicable policy.","Have a human approve the response before sending."],
 }:agent==="bi"?{
  title:"Metric comparison",body:measured?"Supplied current value "+currentNumber+" versus baseline "+baselineNumber+": "+((((currentNumber as number)-(baselineNumber as number))/Math.abs(baselineNumber as number))*100).toFixed(1)+"% change. This calculation does not verify the source or time window.":"No comparable numeric baseline and current value were supplied. Add both figures and the measurement period before calling this a trend.",checks:["Verify both figures against source data.","Confirm the same metric and comparable date windows."],
 }:{
  title:"Campaign test brief",body:"Objective: "+brief.objective+". Audience and offer need confirmation. Proposed test: "+brief.recommendation.experiment,checks:["Verify approved product facts and audience.","Founder must approve publishing or spend."],
 };
 const handoff=agent==="support"&&/churn|cancel|unhappy|competitor/.test(task.toLowerCase())
   ? {to:"sales" as AgentId,reason:"Possible retention risk. Review support facts before asking SalesStrategistAgent for a retention plan."}:null;
 return {agent,owner:spec.owner,kind:"reviewable-draft",brief,artifact,approved_lessons:approvedLessons,review_required:true,external_action_taken:false,handoff,
  caution:agent==="bi"?"A trend cannot be verified until metric values and time windows are supplied.":agent==="support"?"Check the relevant customer policy and account facts before replying.":"Confirm all facts before external use."};
}
