# COMIT Super-Agent Research Notes

Updated: 2026-09-29

This document records the open-source and public documentation patterns used to improve COMIT. It is not a dependency list: COMIT implements the safest useful patterns natively in TypeScript first, and treats optional frameworks/plugins as reviewed adapters.

## Research sources

### LangGraph / Deep Agents
- https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph
- https://docs.langchain.com/oss/javascript/deepagents/overview
- https://docs.langchain.com/oss/python/learn

Patterns adopted:
- store raw state, not prompt-formatted text
- decompose work into small inspectable nodes
- explicit checkpoints and resumable human review
- plan before acting
- spawn specialists for context isolation
- permission rules around tools
- context compaction for long-running work
- bounded human approval for sensitive actions

### Microsoft Agent Framework
- https://learn.microsoft.com/en-us/agent-framework/get-started/
- https://github.com/microsoft/agent-framework

Patterns adopted:
- sessions for multi-turn state
- persistent context providers
- workflows for multi-step coordination
- a harness/supervisor that plans and tracks work
- provider-independent agent architecture

AutoGen was reviewed but is in maintenance mode; COMIT should not newly depend on it:
- https://github.com/microsoft/autogen

### CrewAI
- https://docs.crewai.com/
- https://github.com/crewAIInc/crewAI

Patterns adopted:
- specialist roles
- explicit crews/flows rather than a single giant prompt
- memory + guardrails + observability
- business workflows should end in measurable outputs

### PydanticAI
- https://ai.pydantic.dev/tools/
- https://ai.pydantic.dev/durable_execution/
- https://ai.pydantic.dev/capabilities/

Patterns adopted:
- typed/validated tool arguments
- toolsets as a permission boundary
- durable workflows separate from chat persistence
- capabilities for approvals, guardrails and cost controls
- deterministic functions for logic that should not depend on the model

### OpenHands Agent SDK
- https://docs.openhands.dev/sdk/arch/agent
- https://docs.openhands.dev/sdk/arch/sdk
- https://docs.openhands.dev/sdk/guides/custom-tools
- https://github.com/OpenHands/software-agent-sdk

Patterns adopted:
- event-driven reasoning/action loop
- typed actions and observations
- explicit workspace/tool boundaries
- security validation before execution
- skills as reusable behavior modules
- separate automation lifecycle from agent execution

### Letta
- https://docs.letta.com/

Patterns adopted:
- long-lived agents need persistent memory
- memory should be explicit, reviewed and editable
- continual learning should be based on experience/outcomes, not fake model-weight claims

### MCP
- https://modelcontextprotocol.io/
- https://github.com/modelcontextprotocol/modelcontextprotocol

Patterns adopted:
- tools/resources should have machine-readable schemas
- capability discovery belongs in a standard tool layer
- read tools and write tools must have different trust levels
- COMIT should be MCP-ready without requiring every integration to become custom code

### Local models: Ollama and llama.cpp
- https://ollama.com/
- https://github.com/ollama/ollama
- https://github.com/ggml-org/llama.cpp

Patterns adopted:
- structured JSON outputs for reliable parsing
- local inference is optional, not required for core COMIT logic
- native tool calling when a model supports it
- deterministic fallback whenever the model/tool runtime is unavailable

### Open WebUI
- https://docs.openwebui.com/features/extensibility/plugin/
- https://docs.openwebui.com/features/extensibility/plugin/functions/
- https://docs.openwebui.com/features/extensibility/plugin/tools/

Patterns adopted:
- separate model tools from deeper platform functions
- code-executing plugins are administrator-only
- community plugins are never assumed safe
- review source before importing
- prefer current Tools/Functions/MCP interfaces over legacy Pipelines

### n8n
- https://docs.n8n.io/
- https://github.com/n8n-io/n8n

Patterns adopted:
- self-hosted workflows for no-charge operation
- scheduled/event-driven work belongs in an automation layer
- community nodes must be source-reviewed
- agents can be composed into workflows without giving them unrestricted control

## COMIT architecture derived from the research

COMIT now uses a bounded supervisor instead of a free-running autonomous agent.

Mission flow:

1. User states a goal.
2. Supervisor decomposes it into no more than eight specialist steps.
3. Only the first step is queued.
4. Remaining steps stay blocked.
5. Each specialist has one measurable success condition.
6. A reviewed step unlocks the next step.
7. A rejected step pauses the mission.
8. Writes, external sends, publishing, spend and production changes stay human-approved.
9. Mission state is persisted in Supabase workflow executions.
10. Outcome lessons are stored separately from raw private source material.

This keeps the system understandable, recoverable and measurable.

## Memory model

COMIT should keep four different memory classes separate:

- Working state: facts/results required by the current mission.
- Business memory: reviewed facts about Prism, clients and operating rules.
- Training memory: founder-approved lessons tied to measured outcomes.
- Private personal state: teammate wellness and personal settings; never injected into business/sales agents.

Do not store hidden reasoning or chain-of-thought.

## Tool permission model

- read: may run automatically
- draft: may create internal artifacts automatically
- internal_write: requires a deliberate application action or approval
- external_write: always human-approved
- code_execution: disabled until source/runtime are reviewed

No plugin may silently escalate its own permission level.

## Free capability shelf

Reviewed optional components:
- MCP
- Ollama
- llama.cpp
- self-hosted n8n
- Open WebUI Tools/Functions
- Supabase
- GitHub

Optional means available for later adapter work, not automatically installed.

## Team collaboration

Work-status and personal wellness are intentionally separated.

Shared Team Pulse may contain:
- available/focused/blocked/done
- current work focus
- blocker/help needed
- last pulse timestamp

Private Wellness may contain only the signed-in teammate's:
- water entries
- screen breaks
- movement breaks
- meal breaks
- simple 1-5 energy check-in
- personal reminder preferences

There is no manager-facing health score, health leaderboard or automatic performance decision from wellness data.

## Design research

The UI direction borrows patterns, not assets:
- mission-control dashboards: top-level status cards, specialist cards, progress and recent activity
- Dribbble AI-agent dashboards: compact agent status rows and high-signal metrics
- hydration dashboard concepts: simple intake progress, quick-add controls and low-friction daily check-ins
- Figma Community/agent patterns: reusable skills, design-system consistency, editable output and feedback-in-context
- Pinterest hydration/tracker references: large progress indicator, one-tap intake buttons, minimal daily cards and mobile-first layouts; used as pattern inspiration only

References:
- https://dribbble.com/shots/27121979-AxionAI-AI-Agent-Dashboard
- https://dribbble.com/shots/25775877-Hydration-Tracker-Website-design
- https://help.figma.com/hc/en-us/articles/360038510693-Guide-to-the-Figma-Community
- https://help.figma.com/hc/en-us/articles/42287852075543-Find-and-use-skills-from-the-Figma-Community
- https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/
- https://in.pinterest.com/pin/hydration-tracker-dynamic-island-ui-in-2025--360147301472262283/
- https://ca.pinterest.com/pin/free-hydration-tracker-dashboard-for-figma--597571444328279434/

No third-party image or design asset is copied into COMIT from these references.

## Next engineering priorities

1. run local typecheck/regression/build before merge
2. expose mission checkpoints/events in a richer activity stream
3. add MCP adapter interface after reviewing each server
4. add optional local-model adapter for Ollama/llama.cpp without removing deterministic fallback
5. add explicit model/tool budgets per mission
6. add agent eval datasets from real Prism outcomes
7. preserve the no-deploy boundary until an explicit production release decision


## Research update — 2026-09-29

Further review of the current docs reinforced these implementation choices:

### LangGraph / Deep Agents
Deep Agents explicitly combines planning, context management/compaction, specialist subagents, persistent memory, declarative permissions and human approval. LangGraph's workflow guidance uses checkpointers for resumable HITL, retry policies and explicit graph nodes. COMIT mirrors the pattern with bounded mission steps, blocked successors, durable workflow rows and founder review rather than importing the framework as a dependency.

### Microsoft Agent Framework
Current Agent Framework guidance distinguishes:
- sessions for conversation state
- context providers for information that should proactively exist on every invocation
- tools for reactive/on-demand actions
- workflows when execution order must be guaranteed
- harness agents for planning/tracking multi-step work

COMIT now has a proactive context envelope that separates working context, reviewed business context and founder-approved training lessons. Private wellness data is excluded from the business-agent context provider.

### MCP 2026-07-28
The current final MCP specification uses a stateless protocol core. COMIT should target the current protocol shape for any future MCP adapter and avoid designing around the older protocol-level session model. MCP's tool/resource/prompt separation and Skills extension align with COMIT's capability registry + reusable agent skills.

### Local model adapters
Ollama supports schema-constrained structured outputs. COMIT now has an optional server-side Ollama adapter that requests a JSON object containing an answer and exposes no tools. Local-model use is explicit configuration only; deterministic TypeScript remains the fallback.

### Observability
OpenTelemetry JavaScript has stable traces and metrics; Langfuse can ingest OTEL and can be self-hosted. COMIT now emits its own vendor-neutral trace IDs and trace records first. This avoids making observability dependent on a hosted vendor while keeping later OTEL/Langfuse export possible.

### Design tooling
Figma's 2026 agent guidance strongly emphasizes reusable skills, design-system context and self-healing/refinement loops. Figma also states its agent/MCP beta is currently free but intended to become usage-based paid, so it cannot be a permanent dependency under COMIT's no-billing rule.

Penpot is a self-hostable open-source design/prototyping alternative and is now listed as an optional capability for teams that need a free canvas.

### License/cost correction
n8n is treated in COMIT as source-available/fair-code, not labeled as OSI open source. Self-hosted n8n remains an optional no-charge automation route, with community nodes treated as code-execution risk until reviewed.
