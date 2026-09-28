import type {AgentId} from "./agent-home";
import {selectAgentSkill} from "./agent-skills";

export type MissionRisk="read"|"draft"|"internal_write"|"external_write";
export type MissionStep={
  id:string;
  title:string;
  agent:AgentId;
  objective:string;
  success:string;
  risk:MissionRisk;
  maxAttempts:number;
  dependsOn:string[];
};

export type SuperMission={
  title:string;
  goal:string;
  operatingMode:"bounded-supervisor";
  maxParallel:number;
  maxSteps:number;
  humanApprovalRequiredFor:MissionRisk[];
  budget:{maxAgentRuns:number;maxModelDrafts:number;maxContextChars:number};
  skill:{id:string;name:string;instructions:string[];success:string[]};
  stopConditions:string[];
  contextPolicy:string[];
  steps:MissionStep[];
};

const boundedRules=[
  "Keep each agent focused on one role and one measurable output.",
  "Persist raw facts, decisions and outcomes; do not persist chain-of-thought.",
  "Delegate only when a specialist materially improves the result.",
  "Use read-only tools by default. Escalate write permissions only when required.",
  "External sending, publishing, spend and production changes require human approval.",
  "Stop when success criteria are satisfied, a required fact is missing, or attempts are exhausted.",
  "Compress old context into reviewed summaries before carrying it into a new step.",
];

function has(task:string,pattern:RegExp){return pattern.test(task.toLowerCase())}
function step(id:string,title:string,agent:AgentId,objective:string,success:string,risk:MissionRisk="draft",dependsOn:string[]=[]):MissionStep{
  return {id,title,agent,objective,success,risk,maxAttempts:2,dependsOn};
}

export function buildSuperMission(task:string,context:Record<string,unknown>={}):SuperMission{
  const goal=task.trim().slice(0,1800);
  const skill=selectAgentSkill(goal);
  const steps:MissionStep[]=[];

  if(has(task,/lead|prospect|sales|outreach|client acquisition|revenue/)){
    steps.push(
      step("research","Verify account evidence","research","Find current account facts, trigger, source quality and missing evidence.","At least two useful verified facts or a clear research gap.","read"),
      step("qualify","Qualify the opportunity","qualification","Score fit, urgency, access, decision process and proof readiness.","Opportunity has a justified band and missing signals.","read",["research"]),
      step("strategy","Build the sales strategy","sales","Create a discovery/value/proof plan from verified context.","One low-risk next step and decision path are explicit.","draft",["qualify"]),
      step("outreach","Prepare the message","outreach","Draft the smallest useful first-touch message.","Draft passes quality gate without unsupported claims.","draft",["strategy"]),
      step("followup","Prepare follow-up logic","followup","Define what new value or evidence a later follow-up should add.","Follow-up rule avoids repetition and stops on reply/outcome.","draft",["outreach"])
    );
  }else if(has(task,/creative|reel|poster|campaign|content|instagram|video|brand/)){
    steps.push(
      step("research","Research the brief","research","Separate supplied facts, audience, offer and references from assumptions.","Brief has evidence and explicit unknowns.","read"),
      step("strategy","Choose the creative test","marketing","Define one concept, hook, audience and KPI.","Concept is measurable and aligned to the business goal.","draft",["research"]),
      step("production","Build the production brief","marketing","Turn the chosen concept into a production-ready brief for the creative owner.","Owner, assets, shots, copy and success metric are clear.","draft",["strategy"]),
      step("review","Quality review","bi","Check the proposed output against the goal, constraints and measurement plan.","Review identifies pass/fail criteria before publishing.","read",["production"])
    );
  }else if(has(task,/support|complaint|customer|retention|cancel|refund/)){
    steps.push(
      step("triage","Triage the issue","support","Separate known account facts, policy questions and customer intent.","Issue is categorized and missing facts are explicit.","read"),
      step("response","Draft the response","support","Prepare a safe response using only verified facts.","Reply is clear, empathetic and approval-ready.","draft",["triage"]),
      step("retention","Assess retention risk","sales","If commercially relevant, identify one retention or escalation action.","Next action is appropriate and does not pressure the customer.","draft",["response"])
    );
  }else{
    steps.push(
      step("research","Research the decision","research","Collect the minimum evidence required to make the decision.","Facts and gaps are explicit.","read"),
      step("analysis","Analyze the options","bi","Compare evidence against the stated objective and baseline.","Trade-offs and measurable criteria are visible.","read",["research"]),
      step("plan","Prepare the next move","marketing","Create one bounded experiment or action plan.","Owner, KPI, review point and stop/change rule are explicit.","draft",["analysis"])
    );
  }

  return {
    title:String(context.business||context.client||"COMIT mission")+" · "+goal.slice(0,72),
    goal,
    operatingMode:"bounded-supervisor",
    maxParallel:2,
    maxSteps:Math.min(8,steps.length),
    humanApprovalRequiredFor:["internal_write","external_write"],
    budget:{maxAgentRuns:Math.min(12,steps.length*2),maxModelDrafts:Math.min(4,Math.max(1,steps.length)),maxContextChars:12000},
    skill:{id:skill.id,name:skill.name,instructions:skill.instructions,success:skill.success},
    stopConditions:[
      "Required evidence cannot be verified.",
      "A human approval gate is reached.",
      "The measurable success condition is satisfied.",
      "The step exceeds its retry budget.",
      "The next action would create external spend, publishing or production deployment."
    ],
    contextPolicy:boundedRules,
    steps:steps.slice(0,8)
  };
}

export function missionProgress(children:{status:string}[]){
  const total=children.length;
  const completed=children.filter(x=>x.status==="completed").length;
  const failed=children.filter(x=>x.status==="failed").length;
  const active=children.filter(x=>["queued","processing","awaiting_approval"].includes(x.status)).length;
  return {total,completed,failed,active,percent:total?Math.round((completed/total)*100):0};
}

export const superAgentResearchPrinciples=boundedRules;
