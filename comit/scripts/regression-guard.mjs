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
  "app/api/agents/training/route.ts",
  "app/agents/training/page.tsx",
  "supabase/agent-training.sql",
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

console.log("COMIT regression guard passed.");
