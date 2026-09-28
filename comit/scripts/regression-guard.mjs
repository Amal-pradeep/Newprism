import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  { file: "vercel.json", pattern: /cron/i, reason: "COMIT must not depend on Vercel Cron for scheduled work." },
  { file: "package.json", pattern: /cf:deploy|opennextjs-cloudflare deploy|wrangler deploy/i, reason: "Cloudflare deployment commands must stay disabled." },
  { file: "app/api/learning/route.ts", pattern: /scheduled_learning|cycle_seconds|setInterval/i, reason: "AI learning must be outcome-driven, not recurring pseudo-training." },
];

const required = [
  "app/api/health/route.ts",
  "lib/outreach.ts",
  "lib/sales-engine.ts",
  "lib/agent-evaluation.ts",
  "lib/agent-training.ts",
  "lib/super-agent.ts",
  "lib/agent-tracing.ts",
  "lib/agent-context.ts",
  "lib/model-adapters.ts",
  "lib/agent-skills.ts",
  "lib/free-capabilities.ts",
  "app/api/agents/training/route.ts",
  "app/api/agents/missions/route.ts",
  "app/agents/training/page.tsx",
  "app/agents/mission-control/page.tsx",
  "app/api/wellness/route.ts",
  "app/wellness/page.tsx",
  "app/api/team/pulse/route.ts",
  "app/team/pulse/page.tsx",
  "supabase/agent-training.sql",
  "supabase/team-wellness.sql",
  "supabase/team-pulse.sql",
  "AUTOMATION_BLUEPRINT.md",
  "vercel.json",
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error("Regression guard: missing required file " + rel);
}

for (const item of forbidden) {
  const file = path.join(root, item.file);
  if (fs.existsSync(file) && item.pattern.test(fs.readFileSync(file, "utf8"))) {
    throw new Error("Regression guard: " + item.reason);
  }
}

const outreach = fs.readFileSync(path.join(root, "lib/outreach.ts"), "utf8");
if (!outreach.includes("SPF") && !outreach.includes("SENDER_EMAIL")) {
  throw new Error("Regression guard: outreach sender configuration is missing.");
}
if (!outreach.includes("unsubscribe") && !outreach.includes("not relevant") && !outreach.includes("isn't relevant")) {
  throw new Error("Regression guard: outreach suppression/opt-out language is missing.");
}

const auth = fs.readFileSync(path.join(root, "app/api/auth/login/route.ts"), "utf8");
const login = fs.readFileSync(path.join(root, "app/login/page.tsx"), "utf8");
if (!auth.includes("signInWithOtp") || !login.includes("Send sign-in link")) {
  throw new Error("Regression guard: workspace authentication must remain verified-email only.");
}
if (fs.existsSync(path.join(root, "app/api/workspace/invites/route.ts")) || fs.existsSync(path.join(root, "app/workspace/owner-setup.tsx"))) {
  throw new Error("Regression guard: password invite/setup endpoints must stay removed.");
}

const salesEngine = fs.readFileSync(path.join(root, "lib/sales-engine.ts"), "utf8");
const evaluator = fs.readFileSync(path.join(root, "lib/agent-evaluation.ts"), "utf8");
const outreachRoute = fs.readFileSync(path.join(root, "app/api/outreach/route.ts"), "utf8");
if (!salesEngine.includes("scoreOpportunity") || !salesEngine.includes("buildSalesStrategy")) {
  throw new Error("Regression guard: shared opportunity scoring engine is missing.");
}
if (!evaluator.includes("evaluateSalesArtifact") || !evaluator.includes("Claim safety")) {
  throw new Error("Regression guard: sales quality evaluation is missing.");
}
if (!outreachRoute.includes("quality.pass") || !outreachRoute.includes("isApprover")) {
  throw new Error("Regression guard: outbound sales must remain quality-gated and founder-approved.");
}

const superAgent = fs.readFileSync(path.join(root, "lib/super-agent.ts"), "utf8");
const agentRoute = fs.readFileSync(path.join(root, "app/api/agents/route.ts"), "utf8");
if (!superAgent.includes("bounded-supervisor") || !superAgent.includes("maxAttempts") || !superAgent.includes("maxAgentRuns")) {
  throw new Error("Regression guard: bounded super-agent mission planner or execution budget is missing.");
}
const skills = fs.readFileSync(path.join(root, "lib/agent-skills.ts"), "utf8");
const agentHome = fs.readFileSync(path.join(root, "lib/agent-home.ts"), "utf8");
if (!skills.includes("Account → Meeting") || !skills.includes("Team Unblock") || !agentHome.includes("missionSkill")) {
  throw new Error("Regression guard: reusable mission skills are not wired into agent output.");
}
if (!agentRoute.includes("advanceMission") || !agentRoute.includes('status:"blocked"') && !fs.readFileSync(path.join(root, "app/api/agents/missions/route.ts"), "utf8").includes('status:index===0?"queued":"blocked"')) {
  throw new Error("Regression guard: super-agent sequential review gates are missing.");
}

const wellnessApi = fs.readFileSync(path.join(root, "app/api/wellness/route.ts"), "utf8");
const pulseApi = fs.readFileSync(path.join(root, "app/api/team/pulse/route.ts"), "utf8");
if (!wellnessApi.includes('eq("user_email",user.email)')) {
  throw new Error("Regression guard: wellness API must scope reads to the signed-in teammate.");
}
if (!wellnessApi.includes("medical_use:false") || !fs.readFileSync(path.join(root, "app/wellness/page.tsx"), "utf8").includes("not medical")) {
  throw new Error("Regression guard: wellness feature must remain non-medical self-tracking.");
}
if (pulseApi.includes("team_wellness")) {
  throw new Error("Regression guard: shared Team Pulse must not read private wellness tables.");
}

const capabilities = fs.readFileSync(path.join(root, "lib/free-capabilities.ts"), "utf8");
if (!capabilities.includes('id:"figma"') || !capabilities.includes('noCostCore:false')) {
  throw new Error("Regression guard: Figma must remain an optional, non-core capability under the no-billing policy.");
}
const missionApi = fs.readFileSync(path.join(root, "app/api/agents/missions/route.ts"), "utf8");
if (!missionApi.includes("average_quality") || !missionApi.includes("recentActivity") || !missionApi.includes("skillSummary")) {
  throw new Error("Regression guard: Mission Control observability or skill shelf is missing.");
}

const modelAdapters = fs.readFileSync(path.join(root, "lib/model-adapters.ts"), "utf8");
const contextProvider = fs.readFileSync(path.join(root, "lib/agent-context.ts"), "utf8");
const tracing = fs.readFileSync(path.join(root, "lib/agent-tracing.ts"), "utf8");
if (!modelAdapters.includes("COMIT_OLLAMA_URL") || !modelAdapters.includes("external_tools_allowed:false") && !fs.readFileSync(path.join(root, "lib/agent-runner.ts"), "utf8").includes("external_tools_allowed")) {
  throw new Error("Regression guard: optional local model path must remain explicit and tool-disabled.");
}
if (!contextProvider.includes("Never inject teammate private wellness") || !contextProvider.includes("excluded_private_fields")) {
  throw new Error("Regression guard: business-agent context must exclude private wellness data.");
}
if (!tracing.includes("trace_id") || !tracing.includes("span_id")) {
  throw new Error("Regression guard: vendor-neutral agent tracing contract is missing.");
}

console.log("COMIT regression guard passed.");
