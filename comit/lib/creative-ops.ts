export type CreativeTaskInput={
  clientName?:string;
  title:string;
  deliverableType?:string;
  platform?:string;
  objective?:string;
  audience?:string;
  offer?:string;
  dueAt?:string|null;
  priority?:"low"|"medium"|"high"|"urgent";
  brief?:string;
  revisionCount?:number;
  status?:string;
  approvalState?:string;
};

export type CreativeTaskGuidance={
  focusScore:number;
  focusBand:"now"|"today"|"this-week"|"backlog";
  nextAction:string;
  briefChecklist:string[];
  reviewChecklist:string[];
  risks:string[];
};

function clean(value:unknown,limit=500){
  return typeof value==="string"?value.trim().replace(/\s+/g," ").slice(0,limit):"";
}

function hoursUntil(value?:string|null){
  if(!value)return null;
  const t=new Date(value).getTime();
  if(!Number.isFinite(t))return null;
  return (t-Date.now())/3600000;
}

export function creativeTaskGuidance(input:CreativeTaskInput):CreativeTaskGuidance{
  const dueHours=hoursUntil(input.dueAt);
  const risks:string[]=[];
  let score=0;
  const priority=input.priority||"medium";
  score+=priority==="urgent"?45:priority==="high"?32:priority==="medium"?20:10;
  if(dueHours!==null){
    if(dueHours<0){score+=40;risks.push("Deadline has passed.");}
    else if(dueHours<=24)score+=32;
    else if(dueHours<=72)score+=22;
    else if(dueHours<=168)score+=12;
  }
  if(input.status==="blocked"){score+=25;risks.push("Task is blocked; identify the dependency before more design work.");}
  if(Number(input.revisionCount||0)>=2){score+=10;risks.push("Multiple revisions detected; reconfirm objective and approval criteria before another iteration.");}
  if(!clean(input.objective,300))risks.push("Business objective is missing.");
  if(!clean(input.audience,300))risks.push("Audience is missing.");
  if(!clean(input.platform,120))risks.push("Output platform/placement is missing.");

  score=Math.min(100,score);
  const focusBand=score>=70?"now":score>=50?"today":score>=30?"this-week":"backlog";

  let nextAction="Clarify the brief before execution.";
  if(input.status==="blocked")nextAction="Resolve the blocker or request a handoff before continuing.";
  else if(input.approvalState==="client_review")nextAction="Wait for/collect client feedback and convert it into one consolidated revision.";
  else if(input.approvalState==="internal_review")nextAction="Run the internal review checklist and prepare one approval-ready version.";
  else if(input.status==="in_progress")nextAction="Finish the current version and attach the review asset/link.";
  else if(input.status==="done")nextAction="Archive final asset and record the reusable design learning.";
  else if(clean(input.objective,300)&&clean(input.audience,300))nextAction="Start the first production version using the approved brief.";

  const briefChecklist=[
    "One business objective",
    "One primary audience",
    "One message/offer",
    "Required format, size and platform",
    "Brand/logo/color/font constraints",
    "Reference assets or factual source material",
    "CTA and approval owner",
    "Deadline and definition of done"
  ];

  const reviewChecklist=[
    "Message understood in 2–3 seconds",
    "Clear visual hierarchy and one focal point",
    "Brand consistency",
    "Readable mobile typography",
    "No invented offer, price, claim or client fact",
    "Correct dimensions / placement",
    "CTA visible where required",
    "Final spelling, logo and asset check"
  ];

  return {focusScore:score,focusBand,nextAction,briefChecklist,reviewChecklist,risks};
}

export function buildCreativeBrief(input:CreativeTaskInput){
  const client=clean(input.clientName,120)||"Client";
  const type=clean(input.deliverableType,120)||"creative";
  const platform=clean(input.platform,120)||"platform to confirm";
  const objective=clean(input.objective,300)||"Objective to confirm";
  const audience=clean(input.audience,300)||"Audience to confirm";
  const offer=clean(input.offer,300)||"No specific offer supplied";
  return [
    client+" · "+type,
    "",
    "Objective",
    objective,
    "",
    "Audience",
    audience,
    "",
    "Message / offer",
    offer,
    "",
    "Platform / format",
    platform,
    "",
    "Creative direction",
    "- Use one dominant focal point.",
    "- Build a clear hook → proof/visual → CTA hierarchy.",
    "- Keep typography mobile-readable and avoid decorative clutter.",
    "- Use only verified client/product facts and supplied assets.",
    "",
    "Definition of done",
    "- Correct dimensions/export.",
    "- Internal review passed.",
    "- Revision notes consolidated.",
    "- Approval/final handoff recorded in COMIT."
  ].join("\n");
}

export function dailyCreativeFocus<T extends CreativeTaskInput>(tasks:T[]){
  return [...tasks]
    .map(task=>({task,guidance:creativeTaskGuidance(task)}))
    .filter(x=>x.task.status!=="done"&&x.task.status!=="cancelled")
    .sort((a,b)=>b.guidance.focusScore-a.guidance.focusScore)
    .slice(0,3);
}
