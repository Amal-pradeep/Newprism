# COMIT Implementation Plan

## Foundation
- Next.js + TypeScript application
- design tokens
- responsive shell
- Supabase client/server boundary
- authentication
- organization membership and RLS
- health endpoint

## Command Center
- live KPIs from Supabase
- action queue
- automation health
- approval queue
- notifications
- recent activity

## CRM
- prospects
- companies
- contacts
- pipeline
- search/filter/saved views
- deduplication

## Communications
- Gmail connection
- thread ingestion
- draft generation
- approval queue
- send + audit trail
- unsubscribe suppression
- follow-up scheduling

## Automation
- n8n webhook/event contract
- execution records
- retries
- idempotency
- dead-letter queue
- integration health

## Client operations
- clients
- projects
- tasks
- onboarding templates
- reporting

## Intelligence
- AI interactions
- business insights
- research cache
- daily CEO brief

## Production gate
No cutover until:
- build passes
- typecheck passes
- auth passes
- RLS passes
- core CRUD passes
- Gmail workflow passes in a controlled test
- n8n workflow executes successfully
- health endpoint passes
- mobile/desktop smoke tests pass
- Vercel production deployment is verified

Orbit remains untouched throughout this work.