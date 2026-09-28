import {normalizeSalesContext,type SalesContext} from "./sales-engine";

export const salesOutcomes=["no_reply","negative_reply","positive_reply","meeting_booked","proposal_sent","won","lost"] as const;
export type SalesOutcome=typeof salesOutcomes[number];

export type TrainingLesson={
  id:string;
  agent:string;
  lesson:string;
  tags:string[];
  outcome:SalesOutcome|"pattern";
  quality:number;
};

export const seedSalesLessons:TrainingLesson[]=[
  {id:"qualify-budget",agent:"qualification",lesson:"When budget or internal approval is uncertain, qualify decision process, budget range and timing before investing in a large proposal.",tags:["budget","decision","qualification"],outcome:"pattern",quality:88},
  {id:"specific-first-step",agent:"outreach",lesson:"Lead with a small account-specific audit or experiment instead of a broad list of agency services.",tags:["outreach","audit","offer"],outcome:"pattern",quality:92},
  {id:"trigger-before-volume",agent:"research",lesson:"A current trigger or visible business change is more useful than a high generic lead score. Research urgency before prioritizing outreach.",tags:["research","trigger","priority"],outcome:"pattern",quality:95},
  {id:"proof-before-meeting",agent:"sales",lesson:"Give the prospect a concrete proof artifact before asking for a larger commitment; make the first step easy to evaluate.",tags:["proof","meeting","sales"],outcome:"pattern",quality:90},
  {id:"learn-from-outcome",agent:"followup",lesson:"Follow-ups should add new evidence, proof or a decision-process question. Do not repeat the same pitch.",tags:["followup","reply","learning"],outcome:"pattern",quality:94},
];

function tokens(value:string){return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2))}

export function selectTrainingLessons(agent:string,raw:Record<string,unknown>|SalesContext,lessons:TrainingLesson[]=seedSalesLessons,limit=4){
  const c=normalizeSalesContext(raw as Record<string,unknown>);
  const query=tokens([agent,c.industry,c.stage,c.fitReason,c.trigger].filter(Boolean).join(" "));
  return lessons.map(item=>{
    let score=item.agent===agent?5:item.agent==="sales"?2:0;
    for(const tag of item.tags)if(query.has(tag.toLowerCase()))score+=2;
    if(item.outcome==="won"||item.outcome==="meeting_booked")score+=3;
    score+=item.quality/100;
    return {item,score};
  }).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.item);
}

export function outcomeWeight(outcome:SalesOutcome){
  return {no_reply:-1,negative_reply:-2,positive_reply:3,meeting_booked:6,proposal_sent:7,won:10,lost:-4}[outcome];
}

export function salesSwarmPlan(task:string){
  const t=task.toLowerCase();
  if(/follow.?up|no reply|second email/.test(t))return ["research","followup"];
  if(/proposal|objection|close|meeting|discovery/.test(t))return ["qualification","sales"];
  if(/lead|prospect|outreach|cold email/.test(t))return ["research","qualification","outreach"];
  return ["research","qualification","sales"];
}
