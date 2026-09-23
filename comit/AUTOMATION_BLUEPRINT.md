# COMIT Automation Blueprint

## Principles
1. No duplicate data entry.
2. No silent failures.
3. Every workflow is observable.
4. Every external side effect is auditable.
5. Human approval is required for material outbound actions.
6. Every retry is idempotent.
7. Supabase remains the source of truth.

## Workflow catalog

### Lead Hunter
Trigger: scheduled/manual.
discover → normalize → deduplicate → enrich → validate → classify → persist → notify.

### Lead Researcher
Trigger: new prospect/manual.
website → business profile → public social presence → service clues → decision-maker clues → pain-point hypotheses → research summary.

Never convert an inference into a verified fact.

### Qualification
Trigger: prospect enriched.
business model → geography → service fit → company signals → contactability → qualification → review queue.

### Cold Mail Engine
Trigger: approved prospect.
load intelligence → personalized draft → quality checks → human approval → Gmail send → save metadata → schedule follow-up.

Rules:
- Prism of Stories sender identity
- no Orbit links
- opt-out language
- no fabricated claims
- prevent duplicate outreach

### Follow-up Engine
Trigger: due follow-up.
check thread → check reply/unsubscribe → draft → approval → send → log.

### Inbox Intelligence
Trigger: new Gmail message.
ingest → classify → detect reply/interest/objection/unsubscribe → link conversation → update prospect → create task when necessary.

Unsubscribe suppresses future automated outreach.

### Meeting Engine
Trigger: interested reply/meeting request.
extract request → check calendar → prepare response → approval → create event → update opportunity.

### Client Onboarding
Trigger: opportunity won.
create client → project → onboarding tasks → authorized Drive structure → notify team.

### Content Engine
Trigger: request/schedule.
brief → research/context → draft → design brief → approval → publish through authorized channel → log status.

### Marketing Monitor
Trigger: scheduled.
collect permitted metrics → normalize → compare baseline → anomaly detection → insight → notify.

### Daily CEO Brief
Trigger: daily.
Include:
- pipeline movement
- qualified leads
- outreach
- replies
- meetings
- overdue tasks
- client alerts
- campaign movement
- automation failures
- suggested next actions

### Task Agent
Trigger: task created/due.
prioritize → dependencies → suggest next action → notify owner → update after explicit completion.

### Client Alert System
Trigger: monitored anomaly.
Examples: campaign anomaly, website health issue, missed follow-up, integration failure, unusual lead drop.

### Report Engine
Trigger: scheduled/manual.
canonical data → metrics → report → artifact → notify.

### Dormant Lead Recovery
Trigger: inactivity threshold.
check history → classify dormancy → reactivation draft → approval → send → log.

## Workflow contract
Each n8n workflow defines:
workflow_id, version, trigger, input schema, output schema, required permissions, idempotency strategy, retry policy, timeout, human approval points, audit events, failure destination.

## Error handling
Every workflow has retryable errors, non-retryable errors, dead-letter/manual review, execution correlation ID, and user-visible failure state.

## Secrets
Credentials live in the integration/secret layer, not workflow JSON or Git.

## Webhooks
Validate signature/authentication, timestamp/replay window, payload schema, and idempotency key. Persist event before processing when practical.

## Cost controls
Prefer deterministic rules before AI, smaller models for classification, batched enrichment, cached research, configurable schedules, and execution budgets.

## Approval UX
Every approval item shows:
- what will happen
- why it was prepared
- target recipient/system
- exact content or mutation
- source data used
- risk level
- approve / edit / reject

## Automation dashboard
Show:
- active workflows
- executions today
- success rate
- failed executions
- pending approvals
- average execution time
- integration health
- retry queue
- recent activity

## Rollout
Phase 1: database, auth/RLS, command center, prospects, tasks, audit logs.
Phase 2: Gmail, lead intelligence, cold mail approval, follow-ups, inbox intelligence.
Phase 3: Calendar, clients/projects, content, reporting.
Phase 4: marketing/ad integrations and advanced intelligence.
Phase 5: migration validation, production cutover, Orbit fallback.
