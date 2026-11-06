# Web app plan

## Product interpretation

RoadToSmartBaking's internal Moretti Marketing Studio manages the content consumed by the mobile application. It is a constrained no-code content studio, not a consumer discovery website, restaurant-owner portal or unrestricted page builder. This interpretation comes from the existing mobile technical design and screen implementation plan; it remains subject to user confirmation.

Source documents are copied under docs/references. The visual-style Word document remains the visual source of truth. The corrected Studio concepts supersede the earlier dashboard-only exploration. Use the oven-corrected images in assets/references/backoffice for visual guidance, not as production UI or exact implementation specifications.

## Information architecture

- Sign in and session recovery; MFA according to company policy.
- Studio home: drafts, review requests, scheduled publications, validation issues and recent activity.
- Content library: searchable/filterable restaurants, events, stories, programs, collections and banners; content-type and workflow status filters.
- Restaurant Studio: basics, bilingual copy, address and coordinates, cuisine, opening hours, contacts, Moretti relationship, media ordering and alt text, validation and mobile preview.
- Event Studio: details, dates, venue, targeting, placements, localization, scheduling and preview.
- Story Studio: editorial copy, hero/media, reading metadata, localization, preview and scheduling.
- Explore composer: arrange approved mobile modules, never arbitrary HTML or unrestricted layout.
- Media library: uploads, crop, ordering, replacements, alt text and approved imagery.
- Review and publishing: compare changes, validation, comments, return to editor, approval, immediate publication, scheduling, unpublish and archival.
- Imports: staged file upload, duplicate/geocoding/consent checks and review before publication.
- Access and audit: editor, publisher and administrator permissions, MFA state and administrative history.
- Settings: Italian/English, controlled vocabularies, defaults and integrations.

Programs, collections and banners belong to the planned content taxonomy; their detailed schemas and backend readiness still need confirmation.

## Initial page and shell

Desktop uses a Graphite left navigation rail, a light main workspace and a contextual right-side mobile preview on editing screens. Proposed header: current area, search where relevant, locale and user controls. Studio home prioritizes work requiring action, with summary counts, drafts/review queue, scheduled publications and recent activity; avoid decorative analytics without real data.

Restaurant editing is the first complete workflow: choose/create record → edit structured fields → inspect Italian/English mobile preview → save draft → request review → publisher approves → publish or schedule. Keep draft, review and publication actions persistent and clearly distinct. Preview must use unsaved draft content and must not expose it through public APIs.

Responsive proposal: collapse the rail on smaller screens and move preview into a dedicated tab or drawer instead of squeezing two columns. Support keyboard access, visible focus, readable labels and accessible error summaries. Loading, empty, permission-denied, validation-error and server-error states are part of each workflow.

## Shared visual foundation

| Token | Hex | Use |
| --- | --- | --- |
| Moretti Red | #D62839 | Primary actions and active markers |
| Moretti Red Dark | #A91F2D | Pressed/emphasized states |
| Graphite | #20201E | Navigation and dark panels |
| Ink | #171715 | Primary text |
| Warm Cream | #F7F4EE | Workspace background |
| Warm White | #FFFEFB | Cards, fields and elevated surfaces |
| Stone | #DEDAD3 | Borders and dividers |
| Muted | #6F6B65 | Secondary text |
| Success | #168A4A | Success status |
| Warning | #C98512 | Attention status |
| Information | #2563B8 | Informational status |
| Error | #B3261E | Error status |

Theme direction: warm, editorial and premium with a functional operational workspace. Graphite navigation is part of the light workspace, not a separately approved dark mode. Use DM Serif Display for editorial titles and mobile previews; Inter for controls, forms, tables, metadata and numbers. Fonts and OFL licenses are available locally.

Use the shared 4/8/12/16/24/32/48 px spacing scale. Web content gutters: 24–32 px; card/field radii: 10–12 px; dense tables: 8 px. Prefer borders over decorative shadows. One dominant primary action per view. Always pair status colour with text; test actual foreground/background pairs for WCAG AA rather than assuming every palette combination passes. Proposed web type scale and responsive breakpoints need visual approval; do not blindly reuse mobile headline sizes.

Photography: authentic people, craft, food and locations in warm natural light. Neapolis for restaurant/pizzeria contexts; Serie S/X for bakery, production, training and exhibitions. Never substitute generic masonry ovens or invented Moretti products. “Powered by Moretti Forni” communicates a relationship, not food-quality certification.

## Delivery order

1. Confirm internal Studio scope, initial screen and roles; review source visual references.
2. Choose the web stack and deployment target; inspect existing backend contracts/auth before adding dependencies. No stack is committed by this planning pass.
3. Implement shell, shared tokens, typography and accessible UI primitives.
4. Deliver content library + Restaurant Studio + draft-driven mobile preview, with clearly labeled fixtures until APIs exist.
5. Connect authentication, permissions, media and restaurant APIs; enforce authorization and publishing on the backend, not only in UI.
6. Add review, approval, scheduling and publication validation.
7. Extend to stories/events and Explore composition; add imports, audit and settings according to backend readiness.
8. Validate responsiveness, Italian/English, accessibility, lint, types and workflow tests before release.

## Out of scope

Ratings, public reviews, bookings, payments, loyalty, restaurant self-service, oven controls and unrestricted page building. Consumer accounts, push notifications and other conditional mobile features are not implicitly approved here.

## Current validation

This folder currently contains only plans, reference documents and copied assets. It has no package.json, runnable app, lint configuration or TypeScript project. Web lint/typecheck become required once the application is scaffolded. Mobile source files were not modified.
