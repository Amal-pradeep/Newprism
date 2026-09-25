import {buildBusinessResponse} from "./ai-system";

export type AgentId="marketing"|"sales"|"support"|"bi";
export type AgentSpec={id:AgentId;name:string;purpose:string;inputs:string[];outputs:string[];tools:string[];success:string;owner:string};

export const agentSpecs:AgentSpec[]=[
 {id:"marketing",name:"MarketingAgent",purpose:"Draft a measurable campaign or content test for review.",inputs:["objective","audience","approved product facts","baseline"],outputs:["campaign brief","draft content","KPI"],tools:["reviewed knowledge lookup","campaign brief builder"],success:"A founder approves an evidence-backed test and measures qualified enquiries.",owner:"Aneesh"},
 {id:"sales",name:"SalesAgent",purpose:"Qualify an opportunity and draft the next sales step.",inputs:["prospect","fit evidence","stage","approved contact"],outputs:["fit hypothesis","follow-up draft","next action"],tools:["reviewed knowledge lookup","prospect read","draft builder"],success:"A verified, approved lead progresses to a qualified meeting.",owner:"Amal"},
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

export function routeAgent(task:string):AgentId{
 const t=task.toLowerCase();
 if(/support|ticket|complaint|refund|customer question|help desk|churn/.test(t))return "support";
 if(/metric|report|analytics|trend|revenue|margin|anomal|forecast|dashboard/.test(t))return "bi";
 if(/lead|prospect|sales|deal|outreach|follow.up|objection/.test(t))return "sales";
 return "marketing";
}

export function draftForAgent(agent:AgentId,task:string,context:Record<string,unknown>={}){
 const brief=buildBusinessResponse(task,context);
 const spec=agentSpecs.find(x=>x.id===agent)!;
 const safe=(value:unknown)=>typeof value==="string"?value.trim().slice(0,300):"";
 const baseline=safe(context.baseline),current=safe(context.current);
 const baselineNumber=baseline&&Number(baseline),currentNumber=current&&Number(current);
 const measured=baselineNumber!==""&&currentNumber!==""&&Number.isFinite(baselineNumber)&&Number.isFinite(currentNumber)&&baselineNumber!==0;
 const artifact=agent==="support"?{
  title:"Customer reply draft",body:`Thanks for raising this. I understand your concern about ${task.slice(0,120)}. I am checking the relevant account details and policy with our team and will follow up with a confirmed answer.`,checks:["Verify account identity and applicable policy.","Have a human approve the response before sending."],
 }:agent==="sales"?{
  title:"Lead qualification draft",body:`Fit hypothesis: ${brief.assumptions[0]} Next step: verify a business contact and a current buying signal before drafting outreach.`,checks:["Confirm public contact and fit evidence.","Founder must approve any outreach."],
 }:agent==="bi"?{
  title:"Metric comparison",body:measured?`Supplied current value ${currentNumber} versus baseline ${baselineNumber}: ${(((currentNumber-baselineNumber)/Math.abs(baselineNumber))*100).toFixed(1)}% change. This calculation does not verify the source or time window.`:"No comparable numeric baseline and current value were supplied. Add both figures and the measurement period before calling this a trend.",checks:["Verify both figures against source data.","Confirm the same metric and comparable date windows."],
 }:{
  title:"Campaign test brief",body:`Objective: ${brief.objective}. Audience and offer need confirmation. Proposed test: ${brief.recommendation.experiment}`,checks:["Verify approved product facts and audience.","Founder must approve publishing or spend."],
 };
 const handoff=agent==="support"&&/churn|cancel|unhappy|competitor/.test(task.toLowerCase())
   ? {to:"sales" as AgentId,reason:"Possible retention risk. Review the support facts before asking SalesAgent for a retention draft."}:null;
 return {agent,owner:spec.owner,kind:"reviewable-draft",brief,artifact,review_required:true,external_action_taken:false,handoff,
  caution:agent==="bi"?"A trend cannot be verified until metric values and time windows are supplied.":agent==="support"?"Check the relevant customer policy and account facts before replying.":"Confirm all facts before external use."};
}
