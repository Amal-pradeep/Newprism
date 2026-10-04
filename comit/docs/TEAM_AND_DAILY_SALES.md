# COMIT team adoption and daily sales

| Teammate | Home | Daily responsibility |
| --- | --- | --- |
| Amal | Outreach / Command Center | Qualify accounts, approve messages, book meetings and make client handoffs |
| Aadil | Finance | Review payments, collections, commercial terms and outreach approvals |
| Aneesh | Creative Ops | Work from briefs, submit designs and resolve review comments |
| Jishnu | Mission Control / Integrations | Verify automations, research evidence and integration failures |
| Shahid | Creative Library | Organize shoots, footage, edits and final versions |

Every shared task needs one owner, a next action, a deadline and completion evidence. Team Pulse records work blockers. Personal wellness remains private.

## Daily lead-to-meeting routine

Start with an operating target of 10 researched businesses and 5 personalized drafts per day, plus every due follow-up. These are proposed targets, not guaranteed results.

1. Inspect due follow-ups and pending approvals in the Command Center.
2. Research suitable restaurants, hospitality and interiors businesses in the chosen market using official websites and public listings. Record a specific observed need and its source.
3. Add leads to `/prospects/shared`. Duplicate emails are rejected; new leads start in research with the contributor as owner in metadata. Entering an address does not verify it.
4. Verify contact evidence and prepare a relevant draft. Amal or Aadil reviews recipient, subject and body before choosing Approve & send.
5. Sync Gmail replies, inspect failures and record the opportunity outcome.
6. Check the follow-up queue daily. The existing sequence is day 3, 7, 12 and 21 after an initial send; do not email the same business every day.
7. Assign creative work when a qualified conversation progresses.

## Implemented in this branch

- COMIT logo animation for route loading, sales loading, shared workspace loading and legacy startup, with reduced-motion support.
- Login, clipboard and shared-action failure recovery.
- Working outreach API action names, visible review queue, and automatic dashboard refresh each minute while open and on window focus.
- Exact totals beyond list limits, with India-time daily counters. Lists currently show up to 100 follow-ups, newest 200 approvals and newest 50 replies; totals cover all records.
- Shared lead intake with source evidence, research notes, contributor ownership and duplicate-email checking.
- Actual CC encoding and Unicode email subjects; atomic approval claim to prevent concurrent duplicate sends; Gmail-accepted messages remain marked as delivered in the response if subsequent bookkeeping fails.
- Real shared overdue-task checks and 45-minute local reminders while the Automation page remains open.
- Direct work-area links for all five teammates.

## Prerequisites and limitations

This branch is a reviewable code update, not a production deployment. Supabase runtime configuration and approved-email login must be available in the deployed app.

Sending and reply sync require `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ORBIT_GMAIL_REFRESH_TOKEN` and the sender configuration. ChatGPT's Gmail connection does not configure COMIT's server. Configuration presence does not prove that tokens or mailbox permissions are valid.

Dashboard refresh reads the database; it does not poll Gmail every minute. Use Sync Gmail replies. Background daily runs still need self-hosted n8n configuration and a tested authenticated worker endpoint. No scheduler was activated and no external emails were sent during this change.

## Engineering next

1. Consolidate the separate workspace notes tables and sales tables into one canonical pipeline using a reviewed migration. Primary sales navigation now uses the populated sales database.
2. Add a durable outbox with unique recipient/draft/sequence keys and reconciliation. Reconcile unknown delivery after a network timeout before retrying.
3. Add editable lead assignment and a per-person queue of tasks, approvals and handoffs.
4. Configure n8n for a daily read-only report and reply reconciliation first. Schedule only explicitly approved messages with suppression rules, concurrency limits and run logs.
5. Measure qualified conversations, meetings, proposals, won revenue and collected payments—not only email volume.

## Design next

Default each teammate to their work area after sign-in. Keep one primary action per card, visible owners and next actions, and clear loading/error/success states. Label local drafts clearly and use shared records for team handoffs. Tie logo motion to real loading, without artificial delays.
