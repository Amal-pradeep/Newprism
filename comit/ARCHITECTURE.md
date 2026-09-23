# COMIT Architecture

## Goal
COMIT is an automation-first AI business operating system for Prism of Stories.

Target architecture:

COMIT UI → Vercel → Supabase → n8n → connected services → Supabase → COMIT

Orbit remains the legacy fallback until COMIT is production-proven.

## Platform boundaries

### Vercel
Next.js application, authenticated UI, server-side route handlers, API boundaries, lightweight scheduled jobs where appropriate, observability hooks.

### Supabase
Authentication, relational business data, Row Level Security, storage, audit history, workflow state, AI interaction history.

### n8n
Orchestration, scheduled workflows, integrations, retries, enrichment, external service calls, event-driven automation.

n8n must not become the primary database.

### GitHub
Source control and CI.

## Core domain model
Initial entities:
organizations, users, roles, prospects, companies, contacts, opportunities, emails, conversations, follow_ups, tasks, clients, projects, campaigns, content_items, automations, workflow_executions, ai_interactions, notifications, business_insights, audit_logs, integration_connections.

Every business entity should include UUID primary key, organization ownership, created_at, updated_at, created_by where appropriate, and metadata JSONB only when genuinely needed.

## Multi-tenant security
All organization-owned tables use Supabase Row Level Security.

Rules:
- deny by default
- users only access organizations they belong to
- role permissions enforced server-side
- service-role credentials never reach the browser
- external webhook endpoints authenticate requests
- sensitive integration tokens are never stored in plaintext in application tables

## Event and automation model
Business changes emit normalized events.

Examples:
prospect.created
prospect.enriched
prospect.qualified
email.draft_created
email.approved
email.sent
email.replied
followup.due
meeting.booked
opportunity.won
client.onboarded
automation.failed

Events carry:
event_id, organization_id, event_type, entity_type, entity_id, actor_type, actor_id, timestamp, payload, idempotency_key.

## Idempotency
Every workflow that can produce an external side effect is idempotent.

Before sending or mutating:
1. validate authorization
2. check idempotency key
3. check current entity state
4. perform action
5. persist result
6. emit event
7. write audit record

Retries must not duplicate emails, leads, tasks, or external mutations.

## Automation state machine
draft → review → approved → queued → running → completed

Failure:
running → failed → retrying → running

Human-required:
running → awaiting_approval → approved/rejected

Every transition is recorded.

## Human approval gates
Mandatory approval before:
- cold email send
- follow-up send when not explicitly pre-approved
- ad spend changes
- public content publishing
- destructive data changes
- external client-facing actions with material consequences

AI may prepare actions, but approval controls the side effect.

## Communications
Prism of Stories is the outbound brand.

Cold email requirements:
- authorized Prism of Stories mailbox
- personalized content from prospect intelligence
- no Orbit links
- appropriate signature
- opt-out language
- message/thread metadata recorded
- replies classified and linked to CRM

## Lead intelligence
Lead Hunter:
discover → normalize → deduplicate → enrich → validate → classify → transparent qualification → persist → review queue.

Never fabricate missing company facts.

## AI architecture
AI is a service layer, not the source of truth.

Store:
prompt/version identifier, model/provider, input references, output, confidence where available, human review state, resulting action, cost metadata where available.

AI outputs that become business facts require explicit application to domain records.

## Integration architecture
Use native/free integrations first.

Priority:
Gmail, Google Calendar, Google Drive, GitHub, Supabase, n8n, HubSpot where useful, Meta/Instagram where authorized, analytics/ad platforms through supported connectors.

Integration health:
connected | degraded | expired | disconnected

## Observability
Required:
structured logs, workflow execution history, correlation IDs, audit logs, application health endpoint, integration health, failed workflow queue, retry visibility.

## Reliability
Design for:
- exponential backoff
- dead-letter/manual recovery queue
- idempotency
- timeout boundaries
- graceful degradation
- partial integration outages
- provider rate limits

## Data migration
Orbit is read-only/reference during COMIT construction.

Migration:
1. inventory Orbit data
2. map fields
3. validate and deduplicate
4. import staging
5. verify counts and relationships
6. migrate approved data
7. parallel validation
8. production switch
9. retain Orbit fallback

Never delete Orbit data during initial migration.

## Environment separation
local, preview, production. Secrets are environment-specific. No production credentials in Git.

## Quality gates
Before production:
- typecheck
- lint
- unit tests
- integration tests
- RLS tests
- workflow idempotency tests
- auth/permission tests
- accessibility checks
- mobile layout checks
- smoke test
- production health check

## Deployment
Target:
GitHub → Vercel preview → automated checks → production.

A deployment is complete only after deployment status, application health, database connectivity, authenticated smoke test, and critical workflow smoke test pass.
