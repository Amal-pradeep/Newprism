# COMIT AI Engineering Architecture

## Objective

COMIT should improve Prism of Stories sales by making better decisions from verified evidence, not by maximizing message volume. The measurable funnel is:

Research -> Qualified opportunity -> Approved outreach -> Reply -> Meeting -> Proposal -> Won/Lost -> Reviewed lesson -> Better next decision.

## 1. Foundation

- GitHub is the source of truth.
- Production deployment is a separate explicit action.
- Supabase is the intended private operational database.
- Workspace login is verified-email magic link only; no passwords.
- Server-only secrets stay server-side.
- Cloudflare deployment and automatic recurring learning compute are disabled.

## 2. Context layer

Agents receive structured context rather than raw unrestricted prompts:

- business
- industry
- location
- current CRM stage
- fit reason
- current trigger / buying signal
- dated or source-backed evidence
- verified business contact state
- decision-process signal
- budget signal
- proof/case-study availability
- previous measured outcomes

Private Google Drive or Gmail content must not be copied into the public repository. Extract only reviewed, non-sensitive lessons suitable for reuse.

## 3. Sales reasoning layer

lib/sales-engine.ts is the single source for:

- opportunity scoring
- missing-signal detection
- vertical value angles
- proof-asset recommendations
- discovery questions
- initial/follow-up/discovery drafts

A generic CRM score alone cannot make an account "hot". Current urgency, access, decision process, proof and evidence are separate inputs.

## 4. Agent organization

Sales work is decomposed into specialized agents:

1. ResearchAgent — verifies facts and current signals.
2. QualificationAgent — decides whether sales time is justified.
3. SalesStrategistAgent — discovery, objection and decision strategy.
4. OutreachAgent — concise first-touch draft.
5. FollowupAgent — adds evidence/value instead of repeating the pitch.

MarketingAgent, SupportAgent and BIAgent remain separate functional lanes.

## 5. Evaluation layer

Every sales artifact receives a deterministic quality evaluation.

Message criteria:
- personalization
- evidence grounding
- commercial relevance
- one low-friction next step
- claim safety
- message hygiene

Research/qualification are evaluated as plans, not as marketing copy.

A connected model is optional. When present, COMIT compares its draft with the deterministic draft. It can only replace the deterministic output for text-producing sales agents when it passes the same quality gate and scores at least as high.

## 6. Human review and action boundary

Agent Home is draft/review mode.

External actions require human review. Outreach preparation is blocked when:
- opportunity score is below the research threshold
- the message fails the quality gate
- a verified business contact is missing

Founder approval remains required before sending.

## 7. Outcome learning

COMIT does not claim to fine-tune model weights.

Training means:
1. run an agent on real CRM context
2. evaluate the output
3. human reviews/corrects it
4. record the real sales outcome
5. optionally approve a concise reusable lesson
6. retrieve the strongest relevant lessons on future runs

Allowed outcome labels:
- delivery_failed
- no_reply
- negative_reply
- positive_reply
- meeting_booked
- proposal_sent
- won
- lost

The Training Lab optimizes for replies, meetings, proposals and wins rather than number of emails sent.

## 8. Training data quality

Do not train on stale or inconsistent CRM labels.

The outreach reconciliation flow repairs sent messages whose prospect stage was not advanced. Delivery failures and temporary delays are tracked separately from no-reply; permanent failures stop pending follow-ups. Replies stop pending follow-up cadence and mark the contact as deliverable. Outcomes recorded in Training Lab can update the linked prospect stage.

A lesson is reusable only after founder approval.

## 9. Database contracts

Review these SQL files before applying:

- supabase/workspace.sql
- supabase/agent-training.sql
- supabase/ai-performance.sql

Agent training tables are RLS-enabled and direct anon/authenticated access is revoked. COMIT accesses them from trusted server code using server-only credentials.

## 10. Zero-cost design

Core reasoning, scoring and evaluation are deterministic TypeScript and require no paid model API.

Optional model path:
- n8n/self-hosted or another explicitly approved no-charge model endpoint
- draft-only
- no external tools
- same evaluation gate
- safe fallback to deterministic logic

No recurring model training or cron loop is required.

## 11. Release checklist

Before merging:
1. inspect Git diff
2. run npm ci
3. run npm run typecheck
4. run npm run regression
5. run npm run build
6. review auth/no-deploy guardrails
7. review SQL separately
8. do not deploy

Before a later production release:
1. explicit user approval
2. confirm no-charge hosting/integration state
3. apply reviewed database migrations
4. run Supabase security/performance advisors
5. smoke-test magic-link login
6. smoke-test Research -> Qualification -> Outreach draft
7. verify no message sends without founder approval
8. verify reply reconciliation and outcome recording
