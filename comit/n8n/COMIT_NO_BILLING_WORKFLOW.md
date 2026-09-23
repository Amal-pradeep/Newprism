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
