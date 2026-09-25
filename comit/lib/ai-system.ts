export const COMIT_SYSTEM_PROMPT = [
  "You are COMIT, the business strategy assistant for Prism of Stories.",
  "Ground every claim in user-provided evidence or connected, dated sources. Distinguish facts, hypotheses and missing information.",
  "Give one prioritized experiment with an owner, next action, measurable KPI, review date and stop/change rule.",
  "Never invent revenue, conversion rates, prospect contacts, competitor prices, case-study results or delivery-platform availability.",
  "Do not send email, publish content, change ad spend or commit a client to terms without explicit human approval.",
  "Use the team's roles: Amal owns operations, sales and client meetings; Aadil owns accounts and compliance; Aneesh owns design; Jishnu owns AI development; Shahid owns video production.",
  "If a connected model is unavailable, state that a rules-based plan is being used. Do not claim that a model was trained on user data.",
].join("\n");

export type BusinessContext = {
  business?: string;
  objective?: string;
  evidence?: string;
  baseline?: string;
  target?: string;
  constraints?: string;
  outcome?: string;
};

type Lane = "sales" | "marketing" | "restaurant" | "creative" | "finance" | "operations" | "general";

const lanes: Record<Lane, {owner:string; outcome:string; intervention:string; metric:string; steps:string[]; experiment:string}> = {
  sales: {owner:"Amal",outcome:"More qualified sales conversations",intervention:"Improve account selection and personalized follow-up",metric:"Qualified meetings booked per 20 approved outreaches",steps:["Select 20 businesses with a verified fit signal and public contact.","Draft a short account-specific insight and proof point for approval.","Record replies and meeting outcomes; review the pattern after 20 approved contacts."],experiment:"Test one evidence-backed opening against the current outreach message."},
  marketing: {owner:"Aneesh",outcome:"More qualified enquiries from marketing",intervention:"Align creative, landing page and offer with one audience",metric:"Qualified enquiries per campaign visit",steps:["Choose one audience, one offer and one conversion action.","Audit the current creative and landing page for message mismatch.","Publish a reviewed variation and compare qualified enquiries over a defined period."],experiment:"Test one revised creative and landing-page message with a fixed budget."},
  restaurant: {owner:"Aneesh",outcome:"More repeat orders and local restaurant demand",intervention:"Show a specific food experience and make ordering easy",metric:"Attributed orders or reservations per promotion",steps:["Verify the restaurant's current menu, approved delivery partners and best-selling dishes.","Produce one food-led creative with a clear local hook and ordering path.","Track orders or reservations using a campaign code or customer question."],experiment:"Run one reviewed food-led promotion on a single channel before expanding."},
  creative: {owner:"Shahid",outcome:"More effective video and content output",intervention:"Use a clear first three seconds and one call to action",metric:"Qualified enquiries per 1,000 views",steps:["Write a 20–30 second shot list from approved footage and product facts.","Shoot or select strong food/product close-ups; edit two opening hooks.","Review retention and qualified enquiries before selecting the next hook."],experiment:"Compare two opening hooks with the same offer and call to action."},
  finance: {owner:"Aadil",outcome:"Clearer cash flow and service profitability",intervention:"Review receivables, costs and margin by client",metric:"Overdue receivables and gross margin per client",steps:["Reconcile invoices, receipts and direct delivery costs.","Identify the largest overdue balance or negative-margin project.","Agree an owner and date for one collection or pricing action."],experiment:"Run a weekly receivables and margin review for four weeks."},
  operations: {owner:"Amal",outcome:"Faster, accountable client delivery",intervention:"Assign one owner and due date to each blocked deliverable",metric:"On-time completion rate for committed tasks",steps:["List current commitments and their owners.","Escalate the highest-impact blocker and agree the next handoff.","Review completed, blocked and overdue work in the next team check-in."],experiment:"Use one daily owner-and-blocker check-in for a week."},
  general: {owner:"Amal",outcome:"A measurable business improvement",intervention:"Validate one constraint before scaling a solution",metric:"One baseline and one outcome measure for the chosen goal",steps:["Define the decision, customer and desired outcome.","Collect one reliable baseline and a source for the key assumption.","Choose a small reversible test with an owner and review date."],experiment:"Run one small, measurable test before committing resources."},
};

function laneFor(input:string):Lane {
  const t=input.toLowerCase();
  if(/restaurant|food|menu|delivery|talabat|keeta|noon|nostaza|kiyoos/.test(t))return "restaurant";
  if(/video|reel|shoot|edit|animation|creative/.test(t))return "creative";
  if(/invoice|account|margin|cash|expense|payment|profit/.test(t))return "finance";
  if(/email|prospect|lead|deal|sales|close|pipeline|outreach/.test(t))return "sales";
  if(/campaign|ads|seo|marketing|instagram|content|funnel/.test(t))return "marketing";
  if(/task|team|deadline|project|delivery|workflow/.test(t))return "operations";
  return "general";
}

function clean(value:unknown,limit=800):string {
  return typeof value==="string" ? value.trim().slice(0,limit) : "";
}

export function buildBusinessResponse(input:string, raw:BusinessContext={}) {
  const request=clean(input,2000);
  const context:BusinessContext={
    business:clean(raw.business,120),objective:clean(raw.objective,300),evidence:clean(raw.evidence),
    baseline:clean(raw.baseline,120),target:clean(raw.target,120),constraints:clean(raw.constraints,400),outcome:clean(raw.outcome,400),
  };
  const lane=laneFor([request,context.business,context.objective].join(" "));
  const play=lanes[lane];
  const known=[context.evidence&&{label:"Evidence supplied",value:context.evidence},context.baseline&&{label:"Baseline supplied",value:context.baseline},context.outcome&&{label:"Previous outcome reported",value:context.outcome}].filter(Boolean);
  const gaps=[!context.evidence&&"Add a source or direct observation for the main claim.",!context.baseline&&"Record the current baseline before comparing results.",!context.target&&"Set a numeric target and review date.",!context.business&&"Name the client or business to tailor the next action."].filter(Boolean);
  const objective=context.objective||play.outcome;
  const hypothesis=`For ${context.business||"this business"}, ${play.intervention.toLowerCase()} may improve ${objective.toLowerCase()}. Validate this before treating it as a fact.`;
  return {
    ok:true,mode:"rules-based-no-billing",system:"COMIT",lane,
    confidence:known.length>=2?"evidence-supplied; outcome unverified":"hypothesis; research needed",
    summary:request,objective,known,assumptions:[hypothesis],research_gaps:gaps,
    recommendation:{experiment:play.experiment,owner:play.owner,steps:play.steps,kpi:play.metric,baseline:context.baseline||"Not supplied",target:context.target||"Set before launch",review:"Review after the stated sample or within seven days",change_rule:"If the KPI does not improve, inspect audience, offer and measurement before scaling."},
    constraints:context.constraints||"No constraints supplied",approval:"Draft and measure only; sending, publishing and spending require approval.",
    learning:"Record the observed result and its measurement source, then rerun the plan with that outcome. This updates the decision context; it does not train model weights.",
  };
}
