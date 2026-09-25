# COMIT + n8n — no-billing automation

Set N8N_COMIT_WEBHOOK_URL to your self-hosted n8n webhook.

Recommended flows:
1. AI request: Webhook -> local/free AI node -> normalize JSON -> respond.
2. Prospect research: Schedule Trigger -> research -> normalize -> COMIT -> Supabase.
3. Win strategy: Webhook -> fetch prospect -> evidence -> win plan -> store -> notify.
4. Outreach: COMIT approval -> n8n -> Gmail -> audit log.
5. Daily brief: Schedule Trigger -> pipeline/tasks -> summary -> Slack/email.
6. Learning loop: outcome -> compare predicted vs actual -> store lesson.

Keep external messaging approval-gated. Store credentials in n8n, never in Git.

## Local-model upgrade, when an always-on machine is available

COMIT's `/api/ai` already retrieves a small set of reviewed, source-labeled business notes and sends the resulting plan and system prompt to the configured n8n webhook. The default response remains rules-based if no webhook is available or the webhook fails. This is lexical retrieval, not vector embeddings, fine-tuning, or autonomous learning.

Run self-hosted n8n and Ollama on infrastructure you control. In n8n, use a Webhook trigger, the Ollama Chat Model (or an HTTP Request to Ollama's `/api/chat`), a response validator, and Respond to Webhook. Limit output length and return JSON with `ok: true` and a reviewable answer. Treat retrieved text as data, not instructions. Never connect a public Cloudflare Worker directly to an unauthenticated Ollama port on a home network; use an authenticated, private bridge. Do not add OpenAI, Anthropic or other token-billed credentials to this path.

Before ingesting company files, have the owner approve each document, remove personal data that is not needed, record a source and review date, and define a deletion/update process. Keep client-private material out of the checked-in knowledge file. Once the corpus outgrows curated notes, replace the retrieval implementation with locally computed embeddings and a private vector store, retaining source labels and access checks. Only consider LoRA after collecting a reviewed evaluation set showing retrieval and prompting are insufficient.

The strategy form accepts measured outcomes on the next request. Agent Home separately stores feedback in the existing organization-scoped event log and requires founder review before a same-business lesson can be reused. Neither mechanism retrains model weights.

## Agent Home worker and reviewed feedback

Agent Home stores queued jobs and events in the existing organization-scoped Supabase tables. To process queued jobs periodically, configure a self-hosted n8n Schedule Trigger to POST `/api/agents/worker` with `Authorization: Bearer <AGENT_WORKER_SECRET>`. Store this secret on the Worker and in n8n credentials, never in Git. Each call claims at most three jobs; leave a suitable interval so slow local inference does not accumulate overlapping runs. Without a schedule, the Create draft button processes one job on demand.

For local-model drafting, set both `N8N_AGENT_WEBHOOK_URL` and `N8N_AGENT_SHARED_SECRET` on COMIT. Verify the `X-COMIT-Agent-Secret` header in your n8n webhook before passing the task to an Ollama node. Return JSON `{ "ok": true, "answer": "reviewable draft" }`, limited to 4,000 characters. COMIT times out after eight seconds and falls back to its rules-based draft. Do not expose the Ollama port publicly or put a paid provider in this workflow.

The agent feedback review action writes an accepted lesson to the event log, scoped to the same agent and explicitly named business. Only founders can approve it. The next draft retrieves up to three accepted lessons for that same scope. No lessons are shared across businesses or automatically made public.
