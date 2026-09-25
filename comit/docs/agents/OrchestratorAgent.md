# OrchestratorAgent

- Purpose: Route each task to one specialist and maintain the review gate.
- Inputs: Task text, optional chosen agent, user identity and idempotency key.
- Outputs: Persistent queued job, specialist draft, event messages and review state.
- Tools: Existing organization-scoped `workflow_executions` queue and `events` log. External senders are disabled in Agent Home.
- Success: One task produces one traceable draft, a founder review decision and recorded feedback without accidental external actions.
- Owner: COMIT with founder oversight. Status: rule-based routing; no LangGraph/CrewAI worker or self-hosted model has been deployed.

## Home architecture

- Memory Room: Task input/output and feedback events in Supabase Postgres. Feedback is not silently promoted into approved knowledge.
- Workspace Room: `workflow_executions` states `queued → processing → awaiting_approval → completed` or `failed`. The protected `/api/agents/worker` endpoint processes up to three jobs when called by a scheduler. Manual Create draft also uses the same processor. No scheduler is configured yet.
- Tool Shed: `lib/agent-home.ts` names read, draft and disabled external tools.
- Meeting Room: Organization-scoped `events` records task, draft, review and feedback messages. A support churn signal is a suggested handoff, not an automatically executed offer.
- Model layer: Set `N8N_AGENT_WEBHOOK_URL` and `N8N_AGENT_SHARED_SECRET` for a trusted self-hosted n8n workflow that returns `{ "ok": true, "answer": "..." }`. The model result is only an additional draft and the rules-based draft remains available. Neither endpoint is configured or live by default.
- Feedback: Team members record corrections. A founder can approve a correction for reuse by the same agent and business scope; the next draft receives at most three such notes. Corrections do not train model weights.
- Vector search and fine-tuning: Future work after a curated private corpus and evaluation set exist. They are not represented as live features.
