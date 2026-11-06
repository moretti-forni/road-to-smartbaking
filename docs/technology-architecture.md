# Technology architecture — RoadToSmartBaking consumer web

Date: November 2, 2026. Status: initial React frontend implemented locally. The architecture below includes production integration targets, not a claim all backend/publishing work is complete. See README.md for implemented features, commands and release boundaries.

## Decision

Build an independent React + TypeScript application powered by Vite, aligned with the Remote Master Hub's frontend ecosystem but not cloned from its operational codebase. Use React Router Framework Mode with static pre-rendering for public editorial/detail pages and client-side interactivity for discovery. Do not introduce Next.js, Expo web, a Bootstrap runtime or an unrelated backend for this project.

No dependency versions are pinned by this document. At scaffold time resolve compatible stable React/React DOM, React Router/Vite/plugin and map-wrapper peer dependencies together, verify the supported Node runtime, and commit a package-lock.json. Use npm, matching the hub and the existing mobile project's available lockfile. Do not copy the hub's older router or mixed Material UI dependency versions verbatim.

## Evidence from local projects

Inspected ../moretti-hub-frontend/package.json, vite.config.mjs, amplify.yml, src structure and endpoint configuration. The hub currently uses React, Vite, React Router, Redux Toolkit, Axios, i18next/react-i18next, Leaflet/react-leaflet, MUI/Emotion and Amplify integrations. It uses Vitest, ESLint and Prettier and an Amplify build pipeline. These are local observations, not a recommendation to install every existing dependency.

The consumer app needs its own public API configuration and deployment. Never copy private operational endpoints, API keys, Cognito configuration, MQTT clients or oven-management modules from the hub.

## Stack and ownership

| Layer | Choice | Responsibility |
| --- | --- | --- |
| UI | React + TypeScript, strict checking | Typed, reusable consumer components |
| Build | Vite through React Router Framework integration | Development, bundles and route build |
| Navigation/rendering | React Router Framework Mode | Route modules, layouts, errors, metadata and pre-rendered HTML |
| Styling | CSS Modules + global CSS custom properties | Moretti tokens, responsive layouts and isolated component styles |
| HTTP | One Axios instance behind typed repositories | Base URL, cancellation, normalized errors, timeout; no embedded credentials |
| Interactive server state | TanStack Query | Discovery search, filters, pagination, cancellation and cache |
| Page content | React Router loaders | Initial/prerendered story and restaurant content; no duplicate Query cache for the same detail record in MVP |
| Maps | Leaflet + compatible React Leaflet | Markers, selected venue, viewport and map events |
| Map services | Contracted tile/geocoding provider, decision pending | Production tiles, attribution, quotas, usage terms and manual address search |
| Carousel | React-owned carousel component; native scroll-snap first | Touch, buttons, position state, focus and reduced motion; introduce a maintained React carousel dependency only if reference fidelity requires it |
| Animation | CSS transitions + reduced-motion styles | Cards, image zoom, menus and micro-interactions; no animation framework initially |
| Localization | i18next + react-i18next | Italian/English interface resources and locale handling |
| Persistent client state | Small Context/hooks + localStorage | Saved venue IDs and non-sensitive preferences |
| Validation | Runtime API schema validation at repository boundaries, e.g. Zod | Reject malformed public records; TypeScript alone is not runtime validation |
| Quality | ESLint, TypeScript, Prettier, Vitest + Testing Library, Playwright | Static checks, component tests and end-to-end journeys |
| Hosting | Separate AWS Amplify Hosting static app, proposed | Familiar pipeline without sharing the hub's app/auth resources |

Do not add Redux initially: URL state, query state, local UI state and a small Saved provider have distinct owners. Do not install MUI solely because the hub uses it; custom editorial Moretti components are a better fit for this design. Bootstrap, tiny-slider, sticky-js, glightbox and the template's global functions.js are references, not runtime dependencies.

## Rendering and SEO

Use React Router's supported static pre-rendering path with runtime SSR disabled for the initial hosting model. Generate Italian/English listing and published story/restaurant URLs from a publication manifest during builds. Render real titles, summaries, canonical URLs, social metadata and appropriate structured data into HTML, rather than relying only on post-load document-title changes.

The map is a client-only island with a reserved-height placeholder. Browser geolocation, localStorage and browser-only libraries must not execute during pre-render. Localized route proposal: /it, /en; /:locale/restaurants/:slug; /:locale/stories; /:locale/stories/:slug; /:locale/saved; /:locale/privacy. Root redirects to a deterministic default locale; a client language preference must not break crawlable locale URLs.

Static publishing is a release constraint: publish/update/unpublish/expiry events must trigger a rebuild of affected output and CDN invalidation. Newly published URLs are not considered fully released until their HTML exists. Withdrawal must remove old HTML, route-data payloads and CDN copies, not merely hide the item from the API. A failed build must not silently claim publication success. Define a withdrawal SLA before launch. If required freshness/withdrawal guarantees cannot be met with builds, move these routes to server rendering on a verified compatible runtime before production, rather than presenting a stale static site as correct.

Hosting must preserve generated HTML/assets, route valid interactive fallbacks intentionally, and return real missing-page HTTP status where possible. Do not blanket-rewrite all missing URLs to a 200 page. Verify React Router build output paths and Amplify rewrite/404 behaviour in a deployment spike; do not copy the hub's build-directory settings blindly. No hosting resources are created in this planning pass.

## Feature structure

Proposed source tree (not created yet):

    app/
      root.tsx
      routes.ts
      routes/
        locale-layout.tsx
        explore.tsx
        restaurant-detail.tsx
        stories.tsx
        story-detail.tsx
        saved.tsx
        privacy.tsx
      features/
        discovery/       # query parsing, filters, map/list coordination
        restaurants/     # cards, gallery, practical information, detail types
        stories/         # carousel, editorial cards, article rendering
        saved/           # versioned local IDs, unavailable venue handling
      components/
        layout/          # Header, Footer, navigation
        ui/              # Button, Dialog, Chips, Skeleton, EmptyState
      services/
        http.ts
        repositories/    # API and fixture implementations behind one interface
        schemas/         # public payload validation and domain mapping
      hooks/
      config/            # validated public environment variables
      i18n/
        locales/it/
        locales/en/
      styles/            # Moretti tokens, fonts, reset, global utilities
      types/
    public/              # deliberate runtime assets only
    assets/              # existing source media/fonts and reference boards
    tests/e2e/
    docs/
    react-router.config.ts
    vite.config.ts
    package.json
    package-lock.json

Route files compose features; feature components never fetch arbitrary endpoints directly. Repositories normalize transport fields into stable domain types. Fixtures implement the same interfaces and must be explicitly identified as demo data. Do not import React Native components or require-based image registries into the browser app.

## Data flow

    Public browser
      → locale route and URL query
      → feature hooks / route loaders
      → typed public repository
      → Axios client
      → RoadToSmartBaking public API
      → approved public projection

    Images → approved media CDN
    Publishing → publication manifest + build/invalidation workflow
    Mobile app → same public API/domain contracts, separate native UI

The existing technical design proposes API Gateway/Lambda and a curated public datastore, plus S3/CloudFront image delivery. That is a planned boundary, not a claim those endpoints are already implemented. Inspect the backend before choosing concrete URLs or changing infrastructure. Consumer web must not access a database, internal customer records or the hub's administrative API directly.

Discovery URL owns search text, chosen place/reference coordinates, filters, sort and committed bounds. TanStack Query keys include the active locale and normalized query. Transient map dragging/hover is local UI state; Search this area commits viewport changes instead of fetching on every pointer movement. Fetch paged results and clusters as supported by the API; never download the complete catalogue. Route loaders own initial detail/article content. Saved storage holds stable IDs, not private data or authoritative restaurant snapshots.

Story rendering should use a documented structured-block schema. If the backend actually supplies HTML, validate/sanitize through an approved allowlist before rendering; do not insert arbitrary fetched HTML. Optional links, coordinates, dates and image URLs must be validated. Use published content only and apply locale fallback rules explicitly.

## Local Blogzine reference — verified

Reference root: /Users/k.puthussery/Documents/blogzine_v1.3.2/template

- index-2.html: wide featured hero with one slide, dots, autoplay disabled and hover pause configured. Hero uses h-400, h-lg-500 and h-xl-700 classes; the source includes large-screen custom thumbnail navigation.
- assets/js/functions.js: generic tiny-slider default speed is 500 ms when data-speed is absent; generic autoplay interval defaults to 4000 ms, but the featured hero disables autoplay.
- post-single-2.html: desktop article area uses col-lg-9 with a col-lg-3 sidebar, and a large title/intro area; includes sticky/lightbox vendor scripts.
- assets/scss/custom/_card.scss and assets/scss/components/_tiny-slider.scss: references for hover/card and slider controls. Inspect computed styles visually before claiming pixel-perfect parity.

Translate these patterns into React components. Keep Moretti fonts, colours and photography. Treat a 500 ms carousel transition as a reference baseline, not an instruction to ignore reduced motion. Keep the local template read-only; do not copy its node_modules or template scripts into this app. Confirm the actual template purchase/license terms before reusing code or imagery; package.json license metadata alone is insufficient evidence.

## Assets and performance

Keep existing assets/references and source docs outside the runtime public directory. Publish only selected optimized brand/media assets. Maintain font licenses and self-host approved fonts with font-display strategy. Preserve image aspect ratios, generate responsive variants when pipeline support exists, lazy-load below-the-fold imagery and prioritize only the main hero. Route-split story, restaurant and Saved features; load the map library only where needed. Do not mount duplicate maps for hidden layouts.

## Security and configuration

Expose only public frontend configuration: public API base URL, media origin, environment label and a provider-approved browser map token if required. VITE-prefixed variables and all bundled configuration are public, not secrets. No AWS service credentials, privileged API keys, signing secrets or administrative tokens in the client. Public endpoints need backend validation, throttling and proper CORS; browser restrictions are not authorization. Consent/location choices must follow the approved privacy policy. Do not add authentication or analytics just because the hub has them.

## Acceptance and first implementation

1. Scaffold compatible React/TypeScript/Vite/Router foundation, npm lockfile, strict TS, lint, formatting and tests.
2. Define Moretti tokens/fonts and consumer shell; implement locale routing.
3. Build Stories carousel/list and article detail with the local reference open for visual comparison.
4. Build wide-map discovery, restaurant cards and restaurant detail; implement URL/query ownership and local Saved.
5. Connect validated public repositories and publication manifest; implement build/deploy/withdrawal spike.
6. Run lint, typecheck, unit/component tests, production build and Playwright journeys; inspect desktop/tablet/phone, keyboard/reduced-motion and direct URL/404 behaviour.

Required scripts at scaffold time: dev, build, preview, lint, typecheck, test, test:e2e and format:check. No scripts were added or run in this documentation-only pass because the frontend has no package.json yet.

## Documentation checked

- Vite guide: https://vite.dev/guide/
- React Router rendering: https://reactrouter.com/start/framework/rendering
- React Router pre-rendering: https://reactrouter.com/how-to/pre-rendering
- TanStack Query overview: https://tanstack.com/query/latest/docs/framework/react/overview
- React Leaflet introduction: https://react-leaflet.js.org/docs/start-introduction/
- Amplify React/Vite quickstart: https://docs.amplify.aws/react/start/quickstart/
