# COMIT Meta Marketing AI Research & Architecture

Updated: 2026-09-29

## Objective

COMIT's Digital Marketing AI should create strong Meta-native creative, prepare campaigns/posts, measure outcomes and learn from reviewed results — while never publishing organic content or activating paid spend without explicit human permission.

## Current Meta documentation reviewed

### Marketing API Ad Creative
Official Meta documentation, updated 2026-08-06:
- https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/ad-creative
- Current documented Graph examples use v26.0.
- Ad creatives can be created programmatically.
- Compact recommended copy ranges shown in the reference include headline/title around 25 characters and body around 90 characters.
- Dynamic creative can use multiple assets/text through asset feeds.

COMIT implementation:
- generates three differentiated variants
- keeps headline/primary text compact
- scores each variant before review
- stores the selected variant and review history

### Meta generative AI creative features
Official Meta documentation, updated 2026-06-16:
- https://developers.facebook.com/documentation/ads-commerce/marketing-api/creative/generative-ai-features
- supported Marketing API creative feature names currently include:
  - text_generation
  - image_uncrop
  - image_background_gen
- each uses enroll_status: OPT_IN
- advertisers are responsible for previewing AI-generated ad creative before publishing
- Meta's documented flow is create -> preview -> verify -> set ad ACTIVE
- when text-generation is opted into through the ad endpoint, the ad is PAUSED by default before manual activation

COMIT implementation:
- Meta enhancement flags default OFF
- paid ads are created PAUSED
- Meta preview is retrieved/stored
- activation is a separate approval request
- COMIT will not combine "approve creative" with "activate spend"

### Reels creative
Meta for Business:
- https://www.facebook.com/business/ads/facebook-instagram-reels-ads
- Meta recommends native 9:16 Reels creative
- quality audio and key messages inside Reels safe zones are highlighted as important
- placement asset customization and A/B testing are supported
- commercial ads should use commercial-safe audio; Meta Sound Collection is suitable for commercial use

COMIT implementation:
- Reels concepts default to 9:16
- first 0-2 seconds are treated as the hook
- critical copy/logo/CTA stay inside safe-zone guidance
- audio/caption plan is included
- visual direction avoids clutter and uses one focal subject

### Instagram Content Publishing
Official Meta documentation, updated 2026-06-30:
- https://developers.facebook.com/documentation/instagram-platform/content-publishing
- supports programmatic publishing for professional accounts
- documented content types include images, videos, Reels and carousels
- media must be reachable by Meta during publishing
- current documented publishing limit is 100 API-published posts per 24-hour moving window
- Page Publishing Authorization can block publishing when required

COMIT implementation:
- initial adapter supports single image and Reel/video containers
- source media must use HTTPS
- video/Reel media is allowed to finish Meta processing before publication
- publishing remains an explicit approved action

### Permissions and App Review
Official Meta Permissions Reference, updated 2026-09-14:
- https://developers.facebook.com/documentation/development/permissions

Paid ads:
- ads_management
- dependencies: pages_read_engagement, pages_show_list
- ads_read for reporting
- current permissions reference also exposes ads_mcp_management for Meta Ads MCP agent access

Facebook Page organic publishing:
- pages_manage_posts
- dependencies: pages_read_engagement, pages_show_list

Instagram with Facebook Login:
- instagram_basic
- instagram_content_publish

Instagram Business Login:
- instagram_business_basic
- instagram_business_content_publish

For client/business assets, Advanced Access can require Meta App Review and Business Verification. COMIT should request only the minimum permissions it actually uses.

## Creative system

COMIT should not generate one generic ad. It creates three different strategic concepts.

### Variant A — Hero / outcome
One visual subject.
One promise or outcome.
One CTA.

### Variant B — Emotion / identity
Connect the brand to a real customer moment, local context or feeling.
Use proof so emotion does not become vague branding.

### Variant C — Proof / conversion
Lead with evidence, offer, process or convenience.
Best for retargeting and lower-funnel tests.

Industry examples:

Restaurants:
- sensory food hero
- home/local emotion
- ordering convenience + proof

Interiors:
- transformation
- craft/detail
- portfolio proof + consultation

General services:
- problem/outcome
- proof
- low-friction first step

## Beautiful-ad quality gate

Every variant is scored on:
- objective fit
- scroll-stop hook
- visual hierarchy
- truthful proof
- CTA
- placement fit
- brand consistency
- claim/policy risk

COMIT should not ask for creative review when the score is very weak.

Core visual rules:
1. One focal subject.
2. Three hierarchy layers maximum: hook -> hero/proof -> CTA.
3. Strong contrast and negative space.
4. Brand accent, not brand-color overload.
5. Logo present but not dominant.
6. One business message per ad.
7. Real client/product assets preferred.
8. AI-generated visuals may stylize presentation but cannot invent a product, price, customer result or factual claim.

## Approval architecture

### Organic content

AI prepares creative
-> quality score
-> Aneesh review for image/design
-> Shahid joins review for video/Reels
-> creative approved
-> "Ask permission to publish"
-> Amal/Aadil approve or reject
-> user explicitly executes approved publish
-> Meta post
-> capture performance
-> reviewed learning

### Paid ads

AI prepares creative
-> quality score
-> creative-team review
-> creative approved
-> "Ask permission to create PAUSED ad"
-> Amal/Aadil approve
-> create Meta ad in PAUSED state
-> retrieve Meta preview / generated asset_feed_spec
-> founder reviews real Meta rendering
-> "Ask permission to activate / spend"
-> second Amal/Aadil approval
-> explicit execute
-> ACTIVE ad
-> insights
-> learn from measured outcome

This is deliberately two approval gates for paid media.

## External-write safety

COMIT requires all of:
- approved database action
- founder session for external execution
- Meta credentials configured
- META_EXTERNAL_WRITES_ENABLED=true

If any one is missing, COMIT does not post or activate spend.

## Special/restricted category handling

COMIT flags briefs that appear related to:
- politics/elections/social issues
- housing
- employment
- financial products/services

These require manual compliance review before the external-execution path is enabled. COMIT does not decide legal/policy eligibility from keywords alone.

## Current implementation

Git branch:
- feature/comit-meta-creative-agent

Added:
- lib/meta-creative.ts
- lib/meta-client.ts
- app/api/meta/creative/route.ts
- app/meta-studio/page.tsx
- supabase/meta-creative.sql

Workflow state:
- draft
- creative_review
- creative_approved
- publish_review
- approved
- processing_on_meta
- paused_on_meta
- published
- active_on_meta
- rejected / failed

Approval action types:
- creative_review
- publish_organic
- create_paused_ad
- activate_ad

## Future connection path

Phase 1:
- one explicitly authorized Meta business/ad account using server-held credentials
- verify organic publishing and PAUSED ad preview flow

Phase 2:
- Meta Business Login / OAuth connection per client
- store only token references using a reviewed secret-storage strategy
- request minimum client permissions
- complete required Meta App Review / Business Verification
- never commit access tokens to Git or client-visible tables

Phase 3:
- optional Meta Ads MCP adapter using ads_mcp_management after Meta approval and MCP security review
- keep COMIT's local approval model in front of MCP actions rather than granting the agent unrestricted campaign control

## Performance learning

Do not train on vanity metrics alone.

Primary outcome candidates:
- qualified leads
- messages with buying intent
- bookings/orders
- cost per qualified result
- revenue where attribution is reliable

Supporting creative diagnostics:
- impressions
- reach
- CTR
- CPC
- CPM
- video retention/watch metrics when available
- frequency

Creative learning should compare:
- angle
- first hook
- visual format
- proof style
- CTA
- placement

Only promote a pattern to reusable guidance after a real measured result and human review.
