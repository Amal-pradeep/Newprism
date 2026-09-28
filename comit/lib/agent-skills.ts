import type {AgentId} from "./agent-home";

export type AgentSkill={
  id:string;
  name:string;
  purpose:string;
  triggers:RegExp[];
  preferredAgents:AgentId[];
  instructions:string[];
  success:string[];
  requiresApproval:boolean;
};

export const agentSkills:AgentSkill[]=[
  {
    id:"account-to-meeting",
    name:"Account → Meeting",
    purpose:"Turn a real prospect into an evidence-backed next sales decision.",
    triggers:[/prospect/i,/outreach/i,/meeting/i,/lead/i,/sales/i],
    preferredAgents:["research","qualification","sales","outreach","followup"],
    instructions:[
      "Verify at least two account facts and one current trigger before recommending outreach.",
      "Separate account facts, hypotheses and missing evidence.",
      "Qualify fit, urgency, access, decision process, proof and deliverability.",
      "Prepare the smallest useful proof artifact before asking for a larger commitment.",
      "Use a low-friction CTA and stop the cadence on reply, bounce or explicit outcome."
    ],
    success:["Verified account evidence","Qualified next step","Approval-ready message or discovery plan"],
    requiresApproval:true
  },
  {
    id:"creative-growth-test",
    name:"Creative Growth Test",
    purpose:"Turn a client objective into one measurable creative experiment.",
    triggers:[/creative/i,/reel/i,/poster/i,/content/i,/campaign/i,/instagram/i,/video/i],
    preferredAgents:["research","marketing","bi"],
    instructions:[
      "Start from the business objective and audience, not a visual trend.",
      "Collect references as inspiration only; do not copy third-party assets.",
      "Define hook, format, proof/offer, CTA and KPI.",
      "Create a production brief with owner, assets, shots/copy and review criteria.",
      "Record the measured result before promoting the pattern to reusable memory."
    ],
    success:["Production-ready brief","Clear KPI","Reusable lesson only after measured outcome"],
    requiresApproval:true
  },
  {
    id:"client-risk-rescue",
    name:"Client Risk Rescue",
    purpose:"Handle complaints, churn risk or delivery blockers without losing factual discipline.",
    triggers:[/complaint/i,/cancel/i,/churn/i,/unhappy/i,/retention/i,/blocker/i],
    preferredAgents:["support","sales","bi"],
    instructions:[
      "Triage facts, policy questions and emotional context separately.",
      "Do not promise compensation, timelines or outcomes that are not approved.",
      "Identify the smallest corrective action and one owner.",
      "Escalate commercial retention strategy only after the support facts are verified."
    ],
    success:["Safe response draft","Owned corrective action","Clear escalation rule"],
    requiresApproval:true
  },
  {
    id:"team-unblock",
    name:"Team Unblock",
    purpose:"Turn a teammate blocker into one owned, verifiable next action.",
    triggers:[/team/i,/blocked/i,/handoff/i,/task/i,/delivery/i],
    preferredAgents:["bi","support","marketing"],
    instructions:[
      "Use shared work-status data only; never read private wellness records.",
      "Identify the blocked outcome, dependency and one owner.",
      "Prefer a short handoff with evidence over a broad status report.",
      "Close the loop by recording whether the blocker was removed."
    ],
    success:["One blocker","One owner","One next action","Outcome recorded"],
    requiresApproval:false
  },
  {
    id:"evidence-first-decision",
    name:"Evidence-First Decision",
    purpose:"Convert an unclear business question into a bounded measurable decision.",
    triggers:[/.*/],
    preferredAgents:["research","bi","marketing"],
    instructions:[
      "List known facts, assumptions and missing evidence separately.",
      "Pick one decision or experiment rather than producing an unbounded strategy dump.",
      "Name owner, KPI, baseline, review point and stop/change rule.",
      "Store conclusions and outcomes, not hidden reasoning."
    ],
    success:["Evidence map","One bounded next move","Measurement plan"],
    requiresApproval:false
  }
];

export function selectAgentSkill(task:string){
  const ranked=agentSkills.map(skill=>({
    skill,
    score:skill.triggers.reduce((sum,pattern)=>sum+(pattern.test(task)?1:0),0)
  })).sort((a,b)=>b.score-a.score);
  return ranked[0]?.skill||agentSkills[agentSkills.length-1];
}

export function skillSummary(){
  return agentSkills.map(({triggers,...skill})=>skill);
}
