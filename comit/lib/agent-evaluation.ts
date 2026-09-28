import {normalizeSalesContext,type SalesContext} from "./sales-engine";

export type EvaluationDimension={name:string;score:number;max:number;note:string};
export type AgentEvaluation={score:number;grade:"A"|"B"|"C"|"D";pass:boolean;dimensions:EvaluationDimension[];risks:string[];revision:string[]};

function points(ok:boolean,value:number){return ok?value:0}
function hasAny(text:string,values:string[]){const t=text.toLowerCase();return values.some(v=>v&&t.includes(v.toLowerCase()))}
function gradeFor(score:number):AgentEvaluation["grade"]{return score>=85?"A":score>=75?"B":score>=60?"C":"D"}

export function evaluateSalesArtifact(body:string,raw:Record<string,unknown>|SalesContext={}):AgentEvaluation{
  const c=normalizeSalesContext(raw as Record<string,unknown>);
  const text=String(body||"").trim();
  const lower=text.toLowerCase();
  const dimensions:EvaluationDimension[]=[];
  const risks:string[]=[];
  const revision:string[]=[];
  const evidenceItems=Array.isArray(c.evidence)?c.evidence.filter(Boolean):typeof c.evidence==="string"&&c.evidence.trim()?[c.evidence.trim()]:[];

  const personalization=points(Boolean(c.business)&&hasAny(text,[c.business||""]),14)+points(Boolean(c.industry)&&hasAny(text,[c.industry||""]),6);
  dimensions.push({name:"Personalization",score:personalization,max:20,note:personalization>=14?"Uses account context.":"Use verified business/industry context."});

  const evidence=points(Boolean(c.trigger)&&hasAny(text,[c.trigger||""]),10)+points(Boolean(c.fitReason)&&hasAny(text,[c.fitReason||""]),8)+points(evidenceItems.length>0,7);
  dimensions.push({name:"Evidence grounding",score:evidence,max:25,note:evidence>=15?"Grounded in supplied signals.":"Add a verified trigger, fit reason or source-backed observation."});

  const relevance=points(/audit|experiment|measure|baseline|result|conversion|lead|order|growth|retention|discovery/i.test(text),10)+points(text.length>=120&&text.length<=1200,10);
  dimensions.push({name:"Commercial relevance",score:relevance,max:20,note:relevance>=15?"Focused and outcome-oriented.":"Make the value concrete and keep the message concise."});

  const cta=points(/would it be useful|open to|send the|conversation|call|meeting|audit|next step/i.test(lower),15);
  dimensions.push({name:"Clear next step",score:cta,max:15,note:cta?"Has a low-friction CTA.":"End with one specific, low-friction next step."});

  const restraint=points(!/guarantee|guaranteed|100%|definitely|will increase|will generate|best agency|number one/i.test(lower),15);
  dimensions.push({name:"Claim safety",score:restraint,max:15,note:restraint?"Avoids obvious unsupported guarantees.":"Remove guarantees or claims that are not supported by evidence."});
  if(!restraint)risks.push("Unsupported or guaranteed performance language detected.");

  const hygiene=points(!/dear sir\/madam|to whom it may concern|hope this email finds you well/i.test(lower),5);
  dimensions.push({name:"Message hygiene",score:hygiene,max:5,note:hygiene?"Avoids generic filler.":"Remove generic sales filler."});

  if(!c.trigger)revision.push("Research a current trigger before high-priority outreach.");
  if(!c.fitReason)revision.push("State one verified reason Prism is relevant.");
  if(!c.contactVerified)revision.push("Verify the business contact before sending.");
  if(cta===0)revision.push("Add one clear next action.");
  if(text.length>1200)revision.push("Shorten the message.");

  const score=dimensions.reduce((sum,d)=>sum+d.score,0);
  return {score,grade:gradeFor(score),pass:score>=75&&risks.length===0,dimensions,risks,revision};
}

export function evaluateSalesStrategy(strategy:{
  score:{total:number;missing?:string[]};
  supportedFacts?:string[];
  nextAction?:string;
}):AgentEvaluation{
  const supported=(strategy.supportedFacts||[]).filter(Boolean);
  const missing=(strategy.score.missing||[]).filter(Boolean);
  const dimensions:EvaluationDimension[]=[
    {name:"Account evidence",score:Math.min(35,supported.length*9),max:35,note:supported.length>=3?"Multiple account facts are available.":"More verified account facts are needed."},
    {name:"Opportunity quality",score:Math.round(Math.max(0,Math.min(100,strategy.score.total))*0.4),max:40,note:"Based on fit, urgency, access, decision process and proof."},
    {name:"Research completeness",score:missing.length===0?15:Math.max(0,15-missing.length*3),max:15,note:missing.length?"Missing: "+missing.join("; "):"Core qualification signals are present."},
    {name:"Actionability",score:strategy.nextAction?10:0,max:10,note:strategy.nextAction?"Next action is explicit.":"Add a specific next action."}
  ];
  const score=dimensions.reduce((sum,d)=>sum+d.score,0);
  const revision=missing.slice(0,4).map(item=>"Verify: "+item);
  return {score,grade:gradeFor(score),pass:score>=70&&supported.length>=2,dimensions,risks:[],revision};
}
