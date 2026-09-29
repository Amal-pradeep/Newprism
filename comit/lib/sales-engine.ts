export type SalesContext = {
  business?: string;
  industry?: string;
  location?: string;
  stage?: string;
  score?: number;
  fitReason?: string;
  trigger?: string;
  evidence?: string | string[];
  contactVerified?: boolean;
  deliveryStatus?: "unknown"|"verified"|"delayed"|"failed";
  decisionMakerKnown?: boolean;
  budgetSignal?: boolean;
  proofAvailable?: boolean;
  previousOutcome?: string;
  services?: string[];
};

export type OpportunityScore = {
  total: number;
  band: "hot" | "warm" | "research";
  components: {
    fit: number;
    evidence: number;
    urgency: number;
    access: number;
    decisionProcess: number;
    proof: number;
  };
  missing: string[];
};

function clamp(value:number){return Math.max(0,Math.min(100,Math.round(value)))}
function text(value:unknown,limit=500){return typeof value==="string"?value.trim().slice(0,limit):""}
function list(value:unknown):string[]{
  if(Array.isArray(value))return value.map(v=>text(v,300)).filter(Boolean);
  return text(value,1200).split(/\n|\s*;\s*/).map(v=>v.trim()).filter(Boolean);
}

export function normalizeSalesContext(raw:Record<string,unknown>={}):SalesContext {
  return {
    business:text(raw.business||raw.name,120),
    industry:text(raw.industry,120),
    location:text(raw.location,120),
    stage:text(raw.stage,40),
    score:Number.isFinite(Number(raw.score))?Number(raw.score):undefined,
    fitReason:text(raw.fitReason||raw.fit_reason,600),
    trigger:text(raw.trigger||raw.buying_signal||raw.recent_news||raw.recent_change,600),
    evidence:list(raw.evidence),
    contactVerified:Boolean(raw.contactVerified??raw.contact_verified??raw.email),
    deliveryStatus:(["verified","delayed","failed"].includes(String(raw.deliveryStatus??raw.delivery_status))?String(raw.deliveryStatus??raw.delivery_status):"unknown") as SalesContext["deliveryStatus"],
    decisionMakerKnown:Boolean(raw.decisionMakerKnown??raw.decision_maker_known),
    budgetSignal:Boolean(raw.budgetSignal??raw.budget_signal),
    proofAvailable:Boolean(raw.proofAvailable??raw.proof_available),
    previousOutcome:text(raw.previousOutcome||raw.previous_outcome,500),
    services:Array.isArray(raw.services)?raw.services.map(v=>text(v,80)).filter(Boolean):[],
  };
}

export function scoreOpportunity(raw:Record<string,unknown>|SalesContext):OpportunityScore {
  const c=normalizeSalesContext(raw as Record<string,unknown>);
  const evidence=list(c.evidence);
  const missing:string[]=[];
  const fit=clamp((c.fitReason?55:15)+(c.industry?20:0)+(c.score!==undefined?Math.min(25,c.score/4):0));
  const evidenceScore=clamp(Math.min(100,evidence.length*24+(c.fitReason?20:0)));
  const urgency=clamp(c.trigger?90:15);
  const access=clamp(c.deliveryStatus==="failed"?0:c.deliveryStatus==="delayed"?40:c.contactVerified?100:10);
  const decisionProcess=clamp((c.decisionMakerKnown?60:10)+(c.budgetSignal?40:0));
  const proof=clamp(c.proofAvailable?100:(c.previousOutcome?55:20));
  if(!c.fitReason)missing.push("Verified fit reason");
  if(!evidence.length)missing.push("Evidence with a source/date");
  if(!c.trigger)missing.push("Current buying trigger or urgency signal");
  if(!c.contactVerified)missing.push("Verified business contact");
  if(c.deliveryStatus==="failed")missing.push("Replace the failed/bounced contact before outreach");
  if(c.deliveryStatus==="delayed")missing.push("Verify email deliverability before another follow-up");
  if(!c.decisionMakerKnown)missing.push("Decision maker / decision process");
  if(!c.proofAvailable)missing.push("Relevant proof asset or case evidence");
  const total=clamp(fit*.28+evidenceScore*.18+urgency*.20+access*.12+decisionProcess*.12+proof*.10);
  return {total,band:total>=75?"hot":total>=55?"warm":"research",components:{fit,evidence:evidenceScore,urgency,access,decisionProcess,proof},missing};
}

const offerByIndustry:{pattern:RegExp;offer:string;proof:string}[]=[
  {pattern:/restaurant|cafe|food|hospitality|f&b/i,offer:"a measurable local-demand system combining creative, discovery, conversion and repeat-order experiments",proof:"a food-led creative or local-discovery audit tied to an order or reservation path"},
  {pattern:/interior|architecture|real estate|construction/i,offer:"a lead-quality system aligning website, search visibility, paid acquisition and portfolio proof",proof:"a conversion audit showing where enquiries are lost between discovery, portfolio review and contact"},
  {pattern:/gym|fitness|wellness|salon|beauty/i,offer:"a local acquisition and retention system combining landing pages, content, offers and follow-up",proof:"a local funnel audit with one measurable acquisition experiment"},
];

function offerFor(industry:string){
  return offerByIndustry.find(x=>x.pattern.test(industry))||{offer:"a measurable digital-growth experiment focused on one business bottleneck",proof:"a short account-specific audit with a measurable first step"};
}

export function buildSalesStrategy(raw:Record<string,unknown>|SalesContext){
  const c=normalizeSalesContext(raw as Record<string,unknown>);
  const score=scoreOpportunity(c);
  const play=offerFor(c.industry||"");
  const evidence=list(c.evidence);
  const supportedFacts=( [
    c.business ? "Business: "+c.business : "",
    c.industry ? "Industry: "+c.industry : "",
    c.location ? "Location: "+c.location : "",
    c.fitReason ? "Fit evidence: "+c.fitReason : "",
    c.trigger ? "Current trigger: "+c.trigger : "",
    ...evidence.slice(0,3).map(x=>"Evidence: "+x),
  ]).filter(Boolean);

  const nextAction=score.band==="hot"
    ?"Prepare one personalized, approval-gated message using the verified trigger and a proof asset."
    :score.band==="warm"
      ?"Research the missing urgency/decision-process signal before outreach, then prepare a short audit."
      :"Do not send yet. Improve evidence, trigger, contact and proof first.";

  return {
    score,
    supportedFacts,
    problemHypothesis:c.fitReason||"The business may have a measurable growth bottleneck that Prism should verify before proposing a solution.",
    valueAngle:play.offer,
    proofAsset:play.proof,
    discoveryQuestions:[
      "Why is this a priority now?",
      "What result are you trying to improve, and what is the current baseline?",
      "Where does the current process break most often?",
      "Who owns this result internally and who approves spend?",
      "What have you already tried?",
      "What would make a first step feel low-risk?",
      "What evidence would you need to decide?",
      "What is the target timing for a decision?",
    ],
    nextAction,
  };
}

export function buildSalesDraft(raw:Record<string,unknown>|SalesContext,kind:"initial"|"followup"|"discovery"="initial"){
  const c=normalizeSalesContext(raw as Record<string,unknown>);
  const strategy=buildSalesStrategy(c);
  const name=c.business||"your team";
  const trigger=c.trigger ? "I noticed "+c.trigger.replace(/[.]+$/,"")+"." : "";
  const fit=c.fitReason ? "One opportunity worth validating is "+c.fitReason.replace(/[.]+$/,"")+"." : "";
  const proof="Rather than send a broad agency pitch, Prism of Stories can prepare "+strategy.proofAsset+".";

  if(kind==="discovery"){
    return {
      subject:"Discovery plan for "+name,
      body:["Goal: verify whether Prism can create measurable value for "+name,"",...strategy.discoveryQuestions.map((q,i)=>(i+1)+". "+q),"","Next action: "+strategy.nextAction].join("\n"),
      strategy,
    };
  }

  if(kind==="followup"){
    return {
      subject:"Re: growth idea for "+name,
      body:["Hi "+name+" team","",trigger||fit||"I wanted to follow up with one useful next step rather than repeat the earlier message.",proof,"","If useful, I can send the short audit first and you can decide whether a conversation is worthwhile.","","Regards,","Amal","Prism of Stories"].filter(Boolean).join("\n"),
      strategy,
    };
  }

  return {
    subject:"A practical growth idea for "+name,
    body:["Hi "+name+" team","",trigger,fit,"We help businesses test "+strategy.valueAngle+".",proof,"","Would it be useful if I sent the short audit first?","","Regards,","Amal","Prism of Stories"].filter(Boolean).join("\n"),
    strategy,
  };
}

export function salesContextFromProspect(prospect:any):SalesContext {
  const metadata=prospect?.metadata||{};
  return normalizeSalesContext({
    business:prospect?.name||prospect?.companies?.name,
    industry:metadata.industry||prospect?.companies?.industry,
    location:metadata.location||prospect?.companies?.location,
    stage:prospect?.stage,
    score:prospect?.score,
    fit_reason:metadata.fit_reason,
    trigger:metadata.trigger||metadata.buying_signal||metadata.recent_news||metadata.recent_change,
    evidence:[metadata.source_url,metadata.evidence,prospect?.source].filter(Boolean),
    email:prospect?.email,
    delivery_status:metadata.delivery_status,
    decision_maker_known:Boolean(metadata.decision_maker||metadata.decision_maker_name),
    budget_signal:Boolean(metadata.budget_signal||metadata.budget),
    proof_available:Boolean(metadata.proof_asset||metadata.case_study),
    previous_outcome:metadata.previous_outcome,
    services:metadata.services,
  });
}
