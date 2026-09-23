import type { DashboardSnapshot } from "./types";

export const demoDashboard: DashboardSnapshot = {
  prospects: 128,
  qualified: 34,
  followUpsDue: 5,
  automationHealth: 96.4
};

export const demoProspects = [
  { id: "p-001", name: "Al Noor Interiors", stage: "qualified", score: 92, source: "Lead Hunter" },
  { id: "p-002", name: "Gulf Hospitality Group", stage: "contacted", score: 84, source: "Website research" },
  { id: "p-003", name: "Urban Craft Studio", stage: "researching", score: 76, source: "Referral" }
] as const;
