import {normalizeSalesContext,type SalesContext} from "./sales-engine";

export type EvaluationDimension={name:string;score:number;max:number;note:string};
export type AgentEvaluation={score:number;grade:"A"|"B"|"C"|"D";pass:boolean;dimensions:EvaluationDimension[];risks:string[];revision:string[]};

function points(ok:boolean,value:number){return ok?value:0}
function hasAny(text:string,values:string[]){const t=text.toLowerCase();return values.some(v=>v&&t.includes(v.toLowerCase()))}

export function evaluateSalesArtifact(body:string,raw:Record<string,unknown>|SalesContext={}):AgentEvaluation{
  const c=normalizeSalesContext(raw as Record<string,unknown>);
  const text=String(body||"").trim();
  const lower=text.toLowerCase();
  const dimensions:EvaluationDimension[]=[];
  const risks:string[]=[];
  const revision:string[]=[];

  const personalization=points(Boolean(c.business)&&hasAny(text,[c.business||""]),14)+points(Boolean(c.industry)&&hasAny(text,[c.industry||""]),6);
  dimensions.push({name:"Personalization",score:personalization,max:20,note:personalization>=14?"Uses account context.":"Use verified business/industry context."});

  const evidence=points(Boolean(c.trigger)&&hasAny(text,[c.trigger||""]),10)+points(Boolean(c.fitReason)&&hasAny(text,[c.fitReason||""]),8)+points(Boolean(c.evidence),7);
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
  const grade:AgentEvaluation["grade"]=score>=85?"A":score>=75?"B":score>=60?"C":"D";
  return {score,grade,pass:score>=75&&risks.length===0,dimensions,risks,revision};
}
