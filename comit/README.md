# COMIT by Prism of Stories

COMIT is the AI business operating system for Prism of Stories, with Lunes AI as the product north star.

## Product principles
- Premium Prism of Stories visual identity
- Long-tailed star ✦ as the core product symbol
- Automation-first workflows powered by n8n
- Supabase as the persistent business source of truth
- Vercel as the target production platform
- Human approval gates for external communication and ad spend
- Mobile-first, responsive and accessible UX
- No paid scheduler dependency: recurring workflows belong in n8n

## Revenue operating loop
1. **Discover** — research industries, pain points and ideal customers.
2. **Qualify** — score fit, urgency and buying signals.
3. **Engage** — prepare cold outreach and follow-ups with human approval before sending.
4. **Learn** — record replies, meetings, delivery and revenue outcomes.
5. **Expand** — turn evidence into the next growth action.

## Team operating model
- **Amal** — Founder / Command: revenue, approvals and strategy.
- **Aadil** — Sales / Outreach: prospecting, qualification and follow-ups.
- **Aneesh** — Creative / Growth: revenue-focused posters, carousels, reels and client creative growth.
- **Jishnu** — Operations / Client Growth: delivery, retention, systems and QA.

Each teammate has a profile, ownership lane, daily outcome and morning task path inside COMIT.

## Automation
COMIT keeps the application layer on Vercel and delegates recurring/background workflows to n8n. Vercel is intentionally configured without cron jobs so the project does not depend on paid scheduler features.

## Integrations
The product is structured around Supabase, Gmail, n8n and future workspace integrations. Secrets belong in environment variables and are never committed to Git.

## Design references
Figma, Figma Community UI Kits, UI Store, UI8, shadcn/ui, UI Verse and Magic UI are references for composition, components and interaction patterns. COMIT uses an original Prism of Stories identity rather than copying templates.

## Planned modules
Command Center, AI, CRM, Sales Intelligence, Lead Research, Outreach, Gmail, Clients, Projects, Marketing, Tasks, Automation, Reports, Finance, Team and Monitoring.

## Deployment
The production app lives under `comit/` and is intended to be deployed as a Next.js project with Vercel's root directory set to `comit`. Keep the repository's legacy Prism Orbit system intact as a fallback until the COMIT production verification checklist is complete.
