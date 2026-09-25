# OrchestratorAgent

- Purpose: Route each task to one specialist and maintain the review gate.
- Inputs: Task text, optional chosen agent, user identity and idempotency key.
- Outputs: Persistent queued job, specialist draft, event messages and review state.
- Tools: Existing organization-scoped `workflow_executions` queue and `events` log. External senders are disabled in Agent Home.
- Success: One task produces one traceable draft, a founder review decision and recorded feedback without accidental external actions.
- Owner: COMIT with founder oversight. Status: rule-based routing; no LangGraph/CrewAI worker or self-hosted model has been deployed.

## Home architecture

- Memory Room: Task input/output and feedback events in Supabase Postgres. Feedback is not silently promoted into approved knowledge.
- Workspace Room: `workflow_executions` states `queued → awaiting_approval → completed` or `failed`. Draft creation currently runs when a user clicks Create draft; there is no background worker.
- Tool Shed: `lib/agent-home.ts` names read, draft and disabled external tools.
- Meeting Room: Organization-scoped `events` records task, draft, review and feedback messages. A support churn signal is a suggested handoff, not an automatically executed offer.
- Model layer: Existing optional n8n webhook can later call self-hosted Ollama. Agent Home currently uses local rules and reviewed knowledge, so it incurs no per-token API charges.
- Vector search and fine-tuning: Future work after a curated private corpus and evaluation set exist. They are not represented as live features.
