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

The current workspace accepts measured outcomes on the next request, but does not persist feedback or retrain weights. A durable feedback system needs an authenticated, tenant-scoped store and a human review queue before corrections enter the knowledge base.
