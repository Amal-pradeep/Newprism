import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const forbidden = [
  { file: "vercel.json", pattern: /cron/i, reason: "COMIT must not depend on Vercel Cron for scheduled work." },
];

const required = [
  "app/api/health/route.ts",
  "lib/outreach.ts",
  "AUTOMATION_BLUEPRINT.md",
  "vercel.json",
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Regression guard: missing required file ${rel}`);
}

for (const item of forbidden) {
  const file = path.join(root, item.file);
  if (fs.existsSync(file) && item.pattern.test(fs.readFileSync(file, "utf8"))) {
    throw new Error(`Regression guard: ${item.reason}`);
  }
}

const outreach = fs.readFileSync(path.join(root, "lib/outreach.ts"), "utf8");
if (!outreach.includes("SPF") && !outreach.includes("SENDER_EMAIL")) {
  throw new Error("Regression guard: outreach sender configuration is missing.");
}
if (!outreach.includes("unsubscribe") && !outreach.includes("not relevant") && !outreach.includes("isn't relevant")) {
  throw new Error("Regression guard: outreach suppression/opt-out language is missing.");
}

console.log("COMIT regression guard passed.");
