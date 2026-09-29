import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  { file: "vercel.json", pattern: /cron/i, reason: "COMIT must not depend on Vercel Cron for scheduled work." },
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
  "supabase/meta-creative.sql",
  "app/meta-studio/page.tsx",
  "app/api/meta/creative/route.ts",
  "lib/meta-client.ts",
  "lib/meta-creative.ts",
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
  "open-next.config.ts",
  "wrangler.jsonc",
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

const packageJson = fs.readFileSync(path.join(root, "package.json"), "utf8");
const wranglerConfig = fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
const openNextConfig = fs.readFileSync(path.join(root, "open-next.config.ts"), "utf8");
if (!packageJson.includes('"cf:build"') || !packageJson.includes('"cf:deploy"') || !packageJson.includes('"verify:cloudflare"')) {
  throw new Error("Regression guard: manual Cloudflare build/deploy scripts are missing.");
}
if (!wranglerConfig.includes(".open-next/worker.js") || !wranglerConfig.includes("nodejs_compat") || !wranglerConfig.includes(".open-next/assets")) {
  throw new Error("Regression guard: Cloudflare OpenNext Worker configuration is incomplete.");
}
if (wranglerConfig.includes("d1_databases") || wranglerConfig.includes("COMIT_DB") || wranglerConfig.includes("WORKER_SELF_REFERENCE")) {
  throw new Error("Regression guard: Cloudflare config must not reintroduce D1 or self-service bindings.");
}
if (!openNextConfig.includes("defineCloudflareConfig")) {
  throw new Error("Regression guard: OpenNext Cloudflare adapter config is missing.");
}

const metaCreative = fs.readFileSync(path.join(root, "lib/meta-creative.ts"), "utf8");
const metaClient = fs.readFileSync(path.join(root, "lib/meta-client.ts"), "utf8");
const metaApi = fs.readFileSync(path.join(root, "app/api/meta/creative/route.ts"), "utf8");
const metaSql = fs.readFileSync(path.join(root, "supabase/meta-creative.sql"), "utf8");
const notificationsApi = fs.readFileSync(path.join(root, "app/api/notifications/route.ts"), "utf8");
if (!metaClient.includes('META_EXTERNAL_WRITES_ENABLED==="true"') || !metaClient.includes('status:"PAUSED"')) {
  throw new Error("Regression guard: Meta external writes must be explicitly enabled and paid ads must be created PAUSED.");
}
if (!metaApi.includes('"create_paused_ad"') || !metaApi.includes('"activate_ad"') || !metaApi.includes("isApprover")) {
  throw new Error("Regression guard: paid Meta ads need separate paused-create and activation approvals.");
}
if (!metaApi.includes('"creative_review"') || !metaApi.includes("isCreativeReviewer")) {
  throw new Error("Regression guard: Meta creative-team review gate is missing.");
}
if (!metaApi.includes("special_category_review_required") || !metaApi.includes("manual compliance review")) {
  throw new Error("Regression guard: Meta special/restricted-category manual review gate is missing.");
}
if (!metaCreative.includes("evaluateMetaCreative") || !metaCreative.includes("summarizeMetaInsights")) {
  throw new Error("Regression guard: Meta creative quality/performance evaluation is missing.");
}
if (!metaSql.includes("meta_action_approvals") || !metaSql.includes("deny_direct_browser_access")) {
  throw new Error("Regression guard: Meta approval data must remain server-only.");
}
if (!notificationsApi.includes("target_email") || !notificationsApi.includes("Notification does not belong to this teammate")) {
  throw new Error("Regression guard: review notifications must remain scoped to the intended teammate.");
}

const ciWorkflowPath = path.join(root, ".github/workflows/comit.yml");
if (fs.existsSync(ciWorkflowPath)) {
  const ciWorkflow = fs.readFileSync(ciWorkflowPath, "utf8");
  if (/push:|pull_request:/.test(ciWorkflow)) {
    throw new Error("Regression guard: GitHub verification must remain manual-only under the zero-billing policy.");
  }
}
if (!wranglerConfig.includes('"observability"') || !wranglerConfig.includes('"enabled": false')) {
  throw new Error("Regression guard: Cloudflare observability must remain disabled under the zero-billing policy.");
}

console.log("COMIT regression guard passed.");
