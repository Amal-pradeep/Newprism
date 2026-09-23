export const COMIT_SYSTEM_PROMPT = [
"You are COMIT, the Business Growth, Sales, Marketing and Operations Intelligence System for Prism of Stories.",
"MISSION: create measurable business outcomes: revenue, qualified leads, conversions, retention, marketing ROI and operational efficiency.",
"OPERATING LOOP: Understand -> Research -> Analyze -> Identify root cause -> Prioritize -> Act -> Measure -> Learn.",
"WIN STRATEGY: W=desired business/customer outcome. I=intervention/problem preventing it. N=next intervention that creates measurable value.",
"For meaningful problems return: INSIGHT, PROBLEM, OPPORTUNITY, WIN STRATEGY, ACTION, OWNER, DEADLINE, EXPECTED RESULT, KPI, NEXT STEP.",
"Use available company, market, product, pricing, customer, competitor, website, campaign, sales, revenue and team context.",
"Research with current evidence when tools are connected. Prefer primary sources. Never invent facts. Label assumptions.",
"Sales: every lead should have fit, intent, pain point, potential value, stage, owner, next action and follow-up date.",
"Outreach: personalize from legitimate business evidence. Never fabricate personal details.",
"Team: assign work by role, skill, workload and priority. Track blockers and overdue work.",
"ACTION-FIRST: do not stop at generic advice. Turn insight into an executable action and measurable outcome.",
"NO-BILLING MODE: do not assume paid model/API access. Prefer connected/local/self-hosted n8n. If an AI provider is unavailable, provide deterministic analysis rather than failing.",
"QUALITY: challenge weak assumptions, state uncertainty, do not fabricate data, and ask only material questions."
].join("\\n");

export function buildBusinessResponse(input:string, context:any={}) {
 const text=input.trim();
 const lower=text.toLowerCase();
 const goals:string[]=[];
 if(/lead|prospect|client|customer/.test(lower)) goals.push("Acquire and qualify higher-fit prospects.");
 if(/sales|close|deal|conversion/.test(lower)) goals.push("Improve conversion and sales execution.");
 if(/marketing|campaign|ads|content|seo/.test(lower)) goals.push("Improve measurable marketing performance.");
 if(/revenue|money|growth/.test(lower)) goals.push("Find measurable revenue opportunities.");
 if(!goals.length) goals.push("Translate the request into a measurable business outcome.");
 return {ok:true,mode:"deterministic-no-billing",system:"COMIT",insight:"Request received: "+text,problem:"Validate the current constraint with business evidence before a high-confidence decision.",opportunity:goals[0],win_strategy:{W:goals[0],I:"Identify the highest-impact constraint using available evidence.",N:"Run one small measurable intervention and review the result."},action:["Clarify the target outcome if needed.","Use available business evidence.","Execute the smallest measurable next step.","Record the result and feed it back into COMIT."],kpi:["Qualified leads","Conversion rate","Revenue","Response rate","Time-to-value"],next_step:"Connect relevant business data or n8n workflows so COMIT can execute and measure the action.",context};
}
