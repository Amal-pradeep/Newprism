export type ProspectStage =
  | "new" | "researching" | "qualified" | "contacted" | "replied"
  | "meeting" | "won" | "lost" | "dormant";

export type AutomationStatus =
  | "draft" | "review" | "approved" | "running" | "paused" | "failed" | "completed";

export type WorkflowStatus =
  | "queued" | "processing" | "awaiting_approval" | "completed" | "failed";

export interface DashboardSnapshot {
  prospects: number;
  qualified: number;
  followUpsDue: number;
  automationHealth: number;
}
