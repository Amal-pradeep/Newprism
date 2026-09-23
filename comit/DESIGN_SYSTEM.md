# COMIT Design System

**COMIT by Prism of Stories**  
The AI Business Operating System by Prism of Stories.

## Design principles
- Premium, calm, intelligent, operational.
- The interface should feel like a command center, not a generic CRM.
- Every screen should answer: what matters, what changed, what needs attention, and what can be automated.
- Progressive disclosure over dense dashboards.
- Motion communicates system state, never decoration.
- Desktop, tablet, and mobile are first-class.
- Accessibility, keyboard navigation, semantic HTML, contrast, and reduced-motion support are mandatory.

## Visual language
Use design tokens rather than hard-coded colors.

Core palette:
- Prism Dark: near-black foundation.
- Prism Surface: cool slate surfaces.
- Prism Violet: primary brand accent.
- Prism Electric: blue interaction/accent.
- Prism Magenta: restrained secondary accent.
- Prism White: primary text.
- Prism Muted: secondary text.
- Accessible semantic success, warning, danger, and info states.

Use subtle violet-to-blue gradients only for focal areas. Avoid excessive neon, rainbow gradients, or glass effects.

Typography:
- Modern system/UI sans.
- Compact operational headings.
- Body copy optimized for scanning.
- Numeric KPIs use tabular numerals where available.
- Avoid excessive uppercase text.

## COMIT symbol
The recurring product symbol is the long-tailed star / prism spark: ✦.

Use it for:
- app mark and favicon
- AI activity
- automated actions
- intelligence/insight cards
- loading/progress states
- notifications
- empty states
- contextual micro-interactions

Use restrained glow/trail only when indicating active processing.

## Layout
Responsive application shell:
- Desktop: persistent sidebar + top context bar + content canvas.
- Tablet: collapsible navigation + full-width content.
- Mobile: bottom navigation or compact drawer.

Primary navigation:
1. Command Center
2. Prospects
3. Pipeline
4. Communications
5. Tasks
6. Clients
7. Projects
8. Content
9. Campaigns
10. Intelligence
11. Automations
12. Reports
13. Settings

## Components
Build on shadcn/ui patterns and accessible primitives.

Required primitives:
Button, IconButton, Input, Textarea, Select, Combobox, Date/Time picker, Badge, Avatar, Card, Sheet, Dialog, Drawer, Dropdown, Tabs, Table/Data grid, Timeline, Toast, Tooltip, Command palette, Skeleton, Empty state, Error state, Confirmation dialog.

Operational components:
KPI card, Lead score, Pipeline stage, AI activity indicator, Automation status, Approval gate, Execution log, Health indicator, Insight card, Activity timeline, Email composer, Follow-up queue, Client health card.

## Async state
Every asynchronous action exposes:
idle → queued → processing → awaiting approval → completed

Failure:
processing → failed → retryable

Never silently fail.

## AI interaction
AI suggestions are distinguishable from committed business data:
Suggested, Needs review, Approved, Applied.

AI never silently sends external communications, spends ad budget, deletes records, or makes irreversible changes.

## Tables and dashboards
Dense data must remain scannable:
- sticky headers
- configurable columns
- search
- filters
- saved views
- pagination or virtualization
- bulk actions
- row-level quick actions
- keyboard navigation

Command Center prioritizes:
- leads requiring action
- today's tasks
- communications awaiting approval
- automation health
- client alerts
- revenue/pipeline movement
- AI insights
- system health

## Motion
- 120–220ms micro-interactions.
- 200–350ms panels/dialogs.
- Respect prefers-reduced-motion.
- Long-tailed star may animate during active AI/automation processing.
- Avoid continuous ambient animation.

## Responsive behavior
- No horizontal page scrolling on mobile.
- Touch targets approximately 44px or larger.
- Bottom-sheet patterns for complex actions.
- Simplified mobile tables/cards.
- Persistent primary action where appropriate.

## Accessibility
Target WCAG 2.2 AA practices:
- semantic landmarks
- visible focus
- keyboard support
- sufficient contrast
- labels for controls
- accessible dialogs
- status announcements for async operations
- reduced-motion support
- never rely on color alone

## Content style
Voice: direct, professional, calm, concise, action-oriented.

Prefer: “3 prospects need follow-up today.”

Avoid hype or decorative copy.

## Empty and error states
Every module needs useful empty, loading, recoverable error, and permission states. Empty states provide a next action.

## Implementation rules
- TypeScript strict mode.
- Tailwind tokens for visual values.
- shadcn/ui-style accessible components.
- Server-side authorization for every protected operation.
- Supabase is the source of truth.
- UI state must not become the database.
- No business-critical data in localStorage.
- External side effects pass through auditable service/workflow boundaries.
