# RoadToSmartBaking screen implementation plan

This document translates the approved visual-style reference into an implementation checklist for the mobile app and the future marketing backoffice. The Word reference remains the visual source of truth; this file records what exists, what needs alignment and what must still be built.

## Visual foundation

### Colours

| Token | Value | Role |
| --- | --- | --- |
| Moretti Red | `#D62839` | Primary actions, active navigation and highlights |
| Moretti Red Dark | `#A91F2D` | Pressed states and emphasis on dark surfaces |
| Graphite | `#20201E` | Dark surfaces, hero panels and navigation |
| Ink | `#171715` | Primary text on light backgrounds |
| Warm Cream | `#F7F4EE` | Main light background |
| Warm White | `#FFFEFB` | Cards, forms and elevated surfaces |
| Stone | `#DEDAD3` | Borders, dividers and inactive controls |
| Muted | `#6F6B65` | Secondary text and metadata |

Functional colours are Success `#168A4A`, Warning `#C98512`, Information `#2563B8` and Error `#B3261E`. Status must always combine text with colour.

### Typography and spacing

- Use DM Serif Display for hero messages, screen titles and editorial stories.
- Use Inter for navigation, forms, buttons, labels, metadata, dates and numbers.
- Use 42, 32, 24, 16, 14 and 12 px as the principal mobile type sizes.
- Build layouts from 4, 8, 12, 16, 24, 32 and 48 px spacing tokens.
- Keep mobile horizontal padding between 20 and 24 px.
- Use 16 to 20 px radii for mobile cards and sheets, and 14 to 16 px for buttons.
- Use one dominant primary action per view.
- Prefer borders to decorative shadows.

The current `src/theme/tokens.ts` uses provisional values. It must be aligned with this foundation before visual acceptance.

## Mobile screen inventory

| Journey or screen | Current state | Required implementation |
| --- | --- | --- |
| Splash and brand launch | Partial | Add the final launch treatment and production assets through Expo configuration. |
| Welcome onboarding | Implemented prototype | Align approved typography, colours, spacing and copy; add localization. |
| Location value explanation | Missing | Explain the benefit before requesting permission and always offer manual search. |
| Explore map | Visual prototype | Integrate a real map, current location, selected markers, clustering and search-this-area. |
| Explore list | Implemented prototype | Connect to the public API and add production loading, empty, error and pagination states. |
| Search and filters | Partial | Add city/address autocomplete, accessible filter controls, applied-filter state and clearing. |
| Restaurant detail | Implemented prototype | Add real media, opening hours, call, website, native share, accessibility text and API data. |
| Directions | Partial | Keep external Apple/Google Maps hand-off; calculate no route inside the app. |
| Stories list | Implemented prototype | Connect to published editorial content and localized metadata. |
| Story detail | Missing | Build immersive editorial detail with readable body content and native sharing. |
| Saved places populated | Implemented prototype | Keep local-first for MVP and ensure API record changes fail safely. |
| Saved places empty | Implemented prototype | Align approved illustration, copy and primary action. |
| Settings | Visual prototype | Implement language, location, notifications, privacy, legal information and about pages. |
| Loading and skeletons | Missing | Add screen-specific loading states without blocking navigation unnecessarily. |
| Location denied | Missing | Explain recovery and link to system settings while preserving manual search. |
| Offline and retry | Missing | Show cached content where available and provide a clear retry path. |
| No results | Missing | Preserve the query and filters and offer useful recovery actions. |

### Mobile implementation rules

- Photography leads hero and location-detail surfaces.
- Search and map controls remain visually light.
- Primary actions stay near the active content area and use direct labels.
- The phrase “Powered by Moretti Forni” describes a relationship and must not imply unsupported certification.
- Touch targets must be at least 44 by 44 px.
- Essential mobile text must never be below 14 px; body text defaults to 16 px.
- All images require descriptive alt text or accessibility labels.
- Motion is functional: 180 to 240 ms for control feedback and 280 to 360 ms for sheets, with reduced-motion support.

## Marketing backoffice screen inventory

The backoffice is a structured content studio, not an unrestricted website builder. Editing stays on the left and a live mobile preview stays on the right.

| Area | Required pages and behaviour |
| --- | --- |
| Authentication | Sign in, password recovery or federated login, session expiry and MFA according to company policy. |
| Studio home | Content requiring attention, drafts, review requests, scheduled publications and recent activity. |
| Content library | Search and filter restaurants, events, stories, programs, collections and banners. |
| Restaurant studio | Basics, location, cuisine, opening hours, Moretti relationship, media, alt text, preview and validation. |
| Event studio | Details, dates, venue, targeting, placements, localization, scheduling and preview. |
| Story studio | Editorial fields, media, reading metadata, localization, preview and scheduling. |
| Explore composer | Arrange approved modules only; do not provide arbitrary drag-and-drop page building. |
| Media library | Upload, crop, order, replace, add alt text and verify approved Moretti imagery. |
| Review requests | Compare changes, show validation, comment, approve or return to the editor. |
| Publishing | Publish immediately or schedule, show status text and colour, and support safe archival. |
| Imports | Upload structured data, validate duplicates/geocoding/consent and require review before publishing. |
| Access and audit | Roles, permissions, MFA status and immutable administrative activity history. |
| Settings | Locales, controlled vocabularies, publication defaults and integrations. |

### Backoffice implementation rules

- Use a dark Graphite navigation rail with a Moretti Red active marker.
- Use 24 to 32 px content gutters, 10 to 12 px card and field radii, and 8 px radii for dense tables.
- Keep save draft, request review, approve and publish actions persistent and visually distinct.
- Use structured templates for restaurants, events and stories.
- Keep forms and operational tables in Inter; reserve the display serif for titles and previews.
- Make keyboard navigation, visible focus, WCAG AA contrast and logical reading order release requirements.

## Photography constraints

- Use official Moretti Neapolis imagery for restaurant and pizzeria contexts.
- Use Serie S and Serie X for bakery, production, training and exhibition contexts.
- Do not use generic brick domes, rustic masonry ovens or invented Moretti products.
- Prefer authentic locations, people, craft and food in warm natural light.
- Keep defining oven features visible when the oven supports the story.
- Do not embed translated interface text in images.

## Content and localization

- Support Italian and English from the start.
- Use direct action labels such as Cerca, Indicazioni, Salva and Pubblica.
- Lead with the customer task and place brand/editorial context second.
- Avoid exaggerated or unsupported quality claims.
- Make every error specific and explain how the user can recover.

## Acceptance order

1. Align shared mobile design tokens with the approved foundation.
2. Complete the onboarding and location-permission journey.
3. Complete real Explore map, list, search and filter states.
4. Complete restaurant detail, directions, sharing and saving.
5. Complete Stories, Saved places, Settings and recovery states.
6. Build the backoffice shell and shared web tokens.
7. Build restaurant editing with live mobile preview as the first end-to-end backoffice workflow.
8. Add events, stories, review, publishing, media, imports and audit pages.

## Explicitly outside the MVP

Ratings, public reviews, bookings, payments, loyalty, restaurant self-service, professional oven controls and unrestricted page building are not part of the agreed first release.
