# RoadToSmartBaking

## Technical Requirements and Design Plan

**Product position:** consumer-facing brother app to SmartBaking  
**Company:** Moretti Forni  
**Document status:** proposed baseline for discovery and estimation  
**Date:** 19 October 2026

---

## 1. Executive summary

RoadToSmartBaking is a new iOS and Android application that helps consumers discover and visit restaurants using Moretti Forni ovens. Its primary journey is deliberately short:

> Open the app → discover nearby venues → inspect a venue → get directions → visit.

The product should be presented as the **brother app to SmartBaking**:

- **SmartBaking** is the professional, authenticated application for oven owners, operators and businesses. It controls equipment, displays operational data and supports business workflows.
- **RoadToSmartBaking** is the public, consumer application for discovering the food, places and people enabled by that equipment.

The two apps belong to the same Moretti digital family, but they solve different user problems. RoadToSmartBaking should therefore reuse SmartBaking's brand language, proven technical patterns and selected shared components without being built inside the existing SmartBaking application.

The recommended delivery model is:

1. A separate React Native application and store listing.
2. A separate public API boundary and approved restaurant dataset.
3. Shared Moretti design tokens, reusable UI primitives and engineering conventions.
4. Guest-first discovery, with an optional consumer account only where it adds value.
5. AWS serverless services aligned with the existing Moretti ecosystem.
6. A small content/admin system so Marketing can manage listings and editorial content without a mobile release.

---

## 2. Context from the current SmartBaking platform

This plan is based on inspection of the current SmartBaking mobile repository and the Moretti serverless backend repository.

### 2.1 Existing mobile foundation

SmartBaking currently provides:

- React Native 0.77.3 for iOS and Android.
- React Navigation 7 with stack and bottom-tab navigation.
- Redux Toolkit and React Redux for application state.
- AWS Amplify 6 and Cognito authentication.
- Axios-based access to Moretti REST APIs.
- Firebase Analytics, Crashlytics and Messaging.
- i18next localization in Italian, English, French, German, Spanish and Polish.
- Runtime permission handling, geolocation support and network-state handling.
- Shared styled UI components for text, buttons, cards, inputs, loaders and safe areas.
- Moretti product imagery, logos and SVG assets.
- A defined dark visual palette and NativeWind configuration.
- Separate development and production backend configuration.

### 2.2 Existing visual language

The present SmartBaking palette is based on:

| Token | Current value | Proposed sibling-app use |
|---|---:|---|
| Background | `#2D2D2D` | App shell, headers, dark surfaces |
| Accent | `#D62839` | Primary actions, selected states, map pins |
| Highlight | `#DD2222` | Promotional emphasis; consolidate with accent during design-token cleanup |
| White/contrast | `#FFFFFF` | Primary text and icons on dark surfaces |
| Light grey | `#BABABA` | Secondary text, dividers and inactive controls |
| Black | `#000000` | Image overlays and elevated dark surfaces |

Existing controls use rounded corners of approximately 10 px, full-width actions, white-on-red primary buttons, dark cards and simple icon-led navigation. These cues should remain recognizable in RoadToSmartBaking.

### 2.3 Reuse principle

Reuse should happen at three levels:

| Reuse | Recommendation |
|---|---|
| Brand and interaction conventions | Reuse and formalize |
| Source code and shared packages | Extract selectively after compatibility review |
| SmartBaking screens and business flows | Do not reuse directly |

SmartBaking contains professional concepts—ovens, warehouses, companies, roles, BLE, MQTT and operational analytics—that do not belong in a consumer discovery experience. Copying the full app would increase bundle size, complexity and coupling.

---

## 3. Product objectives and success criteria

### 3.1 Product objectives

- Help a user find a suitable Moretti-powered restaurant quickly.
- Turn Moretti's installed base into a visible consumer network.
- Provide restaurants with qualified visibility after explicit approval.
- Give Marketing controlled ownership of public content.
- Reuse Moretti's proven mobile and AWS capabilities.
- Validate AI-assisted development and carefully selected low-code workflows.

### 3.2 MVP success metrics

Final targets must be agreed with Marketing, but the MVP should measure:

- Search-to-venue-detail conversion.
- Venue-detail-to-directions conversion.
- Percentage of sessions completing a discovery action.
- Search result availability by pilot area.
- Crash-free sessions and API success rate.
- Median time from app open to usable nearby results.
- Number and freshness of approved published venues.
- Marketing time required to create or update a listing.
- Engineering hours saved or accelerated by the AI-assisted pilot.

Analytics must not collect precise location histories. Location should be used for the immediate discovery request and coarse analytics should be preferred.

---

## 4. Scope

### 4.1 MVP scope

1. Branded splash and short first-run introduction.
2. Guest access to all restaurant-discovery functions.
3. Location permission requested in context, not on first launch.
4. Nearby restaurant map with marker clustering where required.
5. Synchronized list view ordered by relevance or distance.
6. Search by venue name, city, postcode or address.
7. Distance-radius filter and basic result count.
8. Restaurant detail with approved public information.
9. Open directions in Apple Maps, Google Maps or another installed navigation app.
10. Share a restaurant using the native share sheet.
11. Settings for language, privacy, location permission and legal documents.
12. Remote content and restaurant-management capability for authorized staff.
13. Analytics, crash reporting, logging and basic operational monitoring.
14. Italian and English at launch; the existing SmartBaking languages remain the preferred expansion set.

### 4.2 Conditional MVP features

These should enter the MVP only after an explicit product decision:

- News/editorial feed.
- Push notifications.
- Optional account creation and sign-in.
- Saving favourite venues across devices.
- Newsletter consent.

### 4.3 Out of scope for the first release

- Restaurant-owner self-service registration.
- User reviews and ratings.
- Table booking or payment processing.
- Loyalty and rewards.
- Promotions marketplace.
- Social feed or user-generated content.
- Real-time oven information.
- SmartBaking oven control or professional features.
- Direct public access to CRM, ERP or SmartBaking customer tables.

---

## 5. User roles

| Role | Access in MVP |
|---|---|
| Guest consumer | Browse, search, filter, view and navigate to restaurants |
| Registered consumer | Optional; guest capabilities plus synchronized favourites/preferences if approved |
| Marketing editor | Create and edit draft restaurants and content |
| Marketing publisher | Approve, publish, unpublish and schedule content |
| Moretti administrator | Manage roles, imports, audit history and data-quality exceptions |
| Restaurant owner | No self-service in MVP; managed through Moretti staff |

Administration must not be exposed inside the consumer mobile app. It should be a responsive web interface or an existing approved CMS.

---

## 6. Functional requirements

Requirements use `MUST`, `SHOULD` and `MAY` in their usual priority sense.

### 6.1 Discovery and location

- **FR-D01:** The app MUST remain usable when the user denies location permission.
- **FR-D02:** The app MUST request location only when the user selects “Use my location” or enters the map discovery flow.
- **FR-D03:** The user MUST be able to search manually by city, postcode or address.
- **FR-D04:** The backend MUST perform geographical queries; the mobile client must not download the complete restaurant dataset.
- **FR-D05:** Results MUST be limited to restaurants with `PUBLISHED` status and a valid publication period.
- **FR-D06:** Map and list MUST represent the same active query, map bounds and filters.
- **FR-D07:** Results SHOULD show distance when a reference location is available.
- **FR-D08:** The app SHOULD support radius values of 5, 10, 25, 50 and 100 km, subject to UX validation.
- **FR-D09:** Dense map areas SHOULD use marker clustering.
- **FR-D10:** The app MUST present useful empty, permission-denied, offline and server-error states.

### 6.2 Restaurant details

- **FR-R01:** Every published restaurant MUST contain name, formatted address, country, latitude and longitude.
- **FR-R02:** A listing SHOULD contain at least one approved image and a short description.
- **FR-R03:** Optional fields MAY include telephone, website, social links, oven model, cuisine tags, opening-hours text and reservation URL.
- **FR-R04:** Directions MUST open through a standard platform deep link with the coordinates as the stable destination.
- **FR-R05:** Phone and website actions MUST be omitted or disabled when their data is absent.
- **FR-R06:** Images MUST include alternative text or an accessible label in the content system.
- **FR-R07:** The app MUST make Moretti verification visible without implying food-quality certification unless Legal approves that claim.

### 6.3 Search and filtering

- **FR-S01:** Search MUST tolerate case and accent differences.
- **FR-S02:** Search SHOULD use debouncing and cancel superseded network requests.
- **FR-S03:** Search MAY offer city/address suggestions through the selected map provider.
- **FR-S04:** Filters MUST be encoded in the API request and reflected in the UI.
- **FR-S05:** A cleared query MUST restore the current-location or selected-area results.

### 6.4 Content management and publication

- **FR-C01:** Editors MUST be able to create and update drafts without a mobile release.
- **FR-C02:** Only publishers or administrators MUST be able to make content public.
- **FR-C03:** Publication actions MUST be auditable with actor, timestamp and before/after status.
- **FR-C04:** The system MUST support `DRAFT`, `IN_REVIEW`, `PUBLISHED`, `SUSPENDED` and `ARCHIVED` states.
- **FR-C05:** Imports MUST not automatically publish records.
- **FR-C06:** Duplicate candidates MUST be flagged using address, coordinates, customer identifiers and normalized names.
- **FR-C07:** Editors MUST be able to preview a listing before publication.
- **FR-C08:** A restaurant MUST support withdrawal of publication and removal of consumer-facing data.

### 6.5 Accounts and preferences

- **FR-A01:** Restaurant discovery MUST not require an account in the recommended MVP.
- **FR-A02:** If accounts are enabled, Cognito SHOULD be reused operationally, but RoadToSmartBaking SHOULD have a separate app client and preferably a consumer-specific user pool or identity domain.
- **FR-A03:** Sharing a SmartBaking user pool MUST happen only if product requirements demand a single Moretti identity and after a claim/role/privacy review.
- **FR-A04:** Consent for marketing communication MUST be separate, optional, versioned and revocable.
- **FR-A05:** Guest preferences SHOULD be stored locally; account synchronization MAY be added later.

### 6.6 Notifications and editorial content

- **FR-N01:** Push notifications MUST be opt-in and must not be required for discovery.
- **FR-N02:** Marketing notifications MUST respect consent, locale and campaign audience.
- **FR-N03:** Deep links SHOULD open the relevant restaurant or article.
- **FR-N04:** Editorial content MUST have locale, status, hero image, summary, body, publication date and optional expiry.

---

## 7. Information architecture and navigation

### 7.1 Recommended MVP navigation

Use a three-item bottom navigation:

1. **Explore** — combined list/map discovery, search and filters.
2. **Stories** — optional remote editorial content; omit this tab if it is not in MVP.
3. **Settings** — language, permissions, privacy, legal and optional account.

Map and list should be two modes inside Explore rather than separate top-level destinations. This keeps the primary task in one place and avoids duplicating search state.

### 7.2 Screen inventory

| Screen | Purpose | MVP |
|---|---|---:|
| Splash | App and Moretti identity while bootstrapping | Yes |
| Welcome | Two or three concise value/permission explanations | Yes |
| Explore | Search, nearby results, featured areas and list/map toggle | Yes |
| Full map | Map-focused result browsing | Yes |
| Filters | Radius and future taxonomy filters | Yes |
| Restaurant detail | Images, information, Moretti relationship and actions | Yes |
| Settings | Language, permissions, privacy and legal | Yes |
| Offline/error | Recovery state with retry and manual search options | Yes |
| Stories list/detail | Marketing/editorial content | Conditional |
| Sign in/register | Optional identity | Conditional |
| Favourites | Saved restaurants | Post-MVP unless local-only |

### 7.3 Primary flow

```text
Launch
  └─ Explore
      ├─ Use current location ── permission ── nearby results
      ├─ Search place ────────── suggestions ─ results
      └─ Move map ────────────── search this area
                                      │
                                      └─ restaurant detail
                                           ├─ directions
                                           ├─ call / website
                                           └─ share
```

---

## 8. Design direction in the SmartBaking family

### 8.1 Design principle

RoadToSmartBaking should look related to SmartBaking at first glance, but feel warmer, lighter and more editorial in use. SmartBaking communicates machine status and precision. RoadToSmartBaking should communicate place, food and discovery.

### 8.2 Elements to inherit

- Moretti logo treatment and approved brand assets.
- Graphite app chrome and red primary accent.
- White iconography and typography on dark surfaces.
- Rounded 10 px controls and cards.
- Existing icon family where the metaphor remains appropriate.
- Header proportions, safe-area behavior and minimum 44 pt touch targets.
- Loading, error, offline and version-update patterns.
- The existing language set and translation-key conventions.

### 8.3 Elements to adapt

- Use restaurant photography as the dominant content layer.
- Introduce warm neutral content surfaces for readability, while retaining dark navigation chrome.
- Use red primarily for actions and Moretti verification, not large reading surfaces.
- Replace dense equipment/status layouts with generous spacing and short consumer copy.
- Use card aspect ratios designed for venue photography.
- Use map pins derived from the Moretti symbol, with accessible selected/unselected states.
- Use a bottom sheet for map-result previews, matching the existing app's bottom-sheet familiarity.

### 8.4 Proposed semantic tokens

Hard-coded colors should be replaced with semantic tokens shared by both apps where practical:

```text
brand.red              #D62839
brand.graphite         #2D2D2D
surface.dark           #2D2D2D
surface.elevated       #3E3E3E
surface.content        warm near-white, to validate with Brand
text.onDark            #FFFFFF
text.secondaryOnDark   #BABABA
text.onLight           accessible near-black
border.subtle          accessible neutral
state.success/error    distinct from brand red
```

The current `accent` and `highlight` reds should be consolidated after checking official brand guidance. Final color, typography and logo rules require Brand/Marketing approval.

### 8.5 Component plan

Create a small RoadToSmartBaking design system containing:

- `AppShell`, `ScreenHeader`, `BottomNavigation`.
- `PrimaryButton`, `SecondaryButton`, `IconButton`.
- `SearchField`, `FilterChip`, `ListMapToggle`.
- `RestaurantCard`, `RestaurantMarker`, `RestaurantPreviewSheet`.
- `ImageCarousel`, `MorettiVerifiedBadge`, `DistanceLabel`.
- `EmptyState`, `OfflineBanner`, `ErrorState`, `SkeletonLoader`.
- `BodyText`, `Title`, `Label`, all with controlled dynamic-type scaling.

Extract SmartBaking components only after removing oven-specific assumptions and adding accessibility tests. A versioned internal package is preferable to copying files between repositories.

---

## 9. Recommended technical architecture

### 9.1 System context

```text
Consumer mobile app
  ├─ Public discovery API ── API Gateway ── Lambda ── public restaurant store
  ├─ Optional account API ── Cognito authorizer ───── user preferences
  ├─ Image delivery ──────── CloudFront/S3
  ├─ Maps/geocoding ──────── selected map provider
  └─ Analytics/crash/push ── approved mobile services

Internal systems (CRM/ERP/SmartBaking installation data)
  └─ controlled import/sync ── staging records ── validation/approval
                                              └─ published public records

Marketing/admin web application
  └─ authenticated admin API ── draft/review/publish + audit log
```

### 9.2 Mobile application

Use a separate React Native repository or clearly isolated monorepo application with:

- React Native aligned with the supported SmartBaking version at project start.
- TypeScript for all new code.
- React Navigation for root stack and bottom tabs.
- Redux Toolkit only for cross-screen/session state; use query caching for server state.
- A generated or typed API client based on OpenAPI.
- i18next using existing locale conventions.
- React Native Firebase for Analytics, Crashlytics and Messaging if privacy review approves continued use.
- A selected native map SDK after a cost/feature proof of concept.
- Platform link handling for directions and universal/app links for shared venues.

RoadToSmartBaking should not include MQTT, BLE, oven control, camera scanning, warehouse code or equipment analytics.

### 9.3 Backend application

Align with the existing AWS SAM/serverless repository conventions while maintaining a distinct domain boundary:

- API Gateway with separate public and administration routes.
- Lambda functions grouped by restaurant, search, content and import domains.
- PostgreSQL with PostGIS if the existing managed PostgreSQL environment is suitable; otherwise evaluate a search store with native geo queries.
- Cognito authorizer for administration and optional consumer identity.
- S3 for original images and processed variants.
- CloudFront for cached image delivery.
- EventBridge/SQS for imports, image processing and publication events.
- CloudWatch structured logs, dashboards and alarms.
- AWS WAF, throttling and caching on public endpoints where appropriate.

The first technical spike must confirm network/VPC implications and whether an existing PostgreSQL cluster can safely serve the public discovery workload.

### 9.4 Environment separation

Provide at least `dev`, `staging` and `production` environments. Configuration must be injected at build/deploy time and validated at startup. Secrets and private credentials must not be stored in mobile source code. Public mobile API identifiers still require restriction, rotation and usage monitoring.

---

## 10. Data design

### 10.1 Core entities

```sql
restaurant (
  id UUID PRIMARY KEY,
  external_source VARCHAR,
  external_id VARCHAR,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  description_i18n JSONB,
  address_line_1 VARCHAR NOT NULL,
  address_line_2 VARCHAR,
  city VARCHAR NOT NULL,
  region VARCHAR,
  postal_code VARCHAR,
  country_code CHAR(2) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  geo GEOGRAPHY(POINT, 4326),
  phone VARCHAR,
  website_url VARCHAR,
  reservation_url VARCHAR,
  publication_status VARCHAR NOT NULL,
  published_at TIMESTAMPTZ,
  publication_expires_at TIMESTAMPTZ,
  consent_reference VARCHAR,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)

restaurant_image (
  id UUID PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurant(id),
  storage_key VARCHAR NOT NULL,
  alt_text_i18n JSONB,
  sort_order INTEGER,
  publication_status VARCHAR NOT NULL
)

oven_model (
  id UUID PRIMARY KEY,
  code VARCHAR UNIQUE NOT NULL,
  public_name VARCHAR NOT NULL
)

restaurant_oven (
  restaurant_id UUID REFERENCES restaurant(id),
  oven_model_id UUID REFERENCES oven_model(id),
  visibility VARCHAR NOT NULL,
  PRIMARY KEY (restaurant_id, oven_model_id)
)

publication_audit (
  id UUID PRIMARY KEY,
  entity_type VARCHAR NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR NOT NULL,
  actor_id VARCHAR NOT NULL,
  changed_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL
)
```

Additional entities may include `content_item`, `tag`, `restaurant_tag`, `import_job`, `source_record`, `consent_record`, `user_favourite` and `notification_campaign`.

### 10.2 Data ownership

- CRM/ERP remains the source of truth for commercial relationships.
- Installation/SmartBaking data remains the source of truth for connected equipment.
- RoadToSmartBaking is the source of truth for the curated public representation.
- Marketing owns descriptions, images and publication status.
- An identified data steward owns correctness, consent evidence and verification dates.

### 10.3 Publication pipeline

```text
Source extraction
  → staging and normalization
  → duplicate/geocode checks
  → consent and eligibility validation
  → Marketing enrichment
  → publisher approval
  → public projection/cache invalidation
  → mobile availability
```

No internal customer identifier, contact record, commercial detail or equipment telemetry may be exposed through the public API.

---

## 11. API requirements

### 11.1 Proposed public endpoints

```http
GET /v1/restaurants?lat=&lng=&radiusKm=&query=&limit=&cursor=
GET /v1/restaurants/{slug}
GET /v1/content?type=story&locale=&limit=&cursor=
GET /v1/content/{slug}?locale=
GET /v1/config/mobile?platform=&appVersion=&locale=
```

Optional authenticated endpoints:

```http
GET    /v1/me/preferences
PUT    /v1/me/preferences
GET    /v1/me/favourites
POST   /v1/me/favourites/{restaurantId}
DELETE /v1/me/favourites/{restaurantId}
```

Administrative routes should use a separate authorization scope and may use `/admin/v1/...`.

### 11.2 API behavior

- OpenAPI 3 must define contracts, validation and generated types.
- Cursor pagination should be used for public lists.
- Geo queries must have a bounded radius and result limit.
- Errors should use a stable machine code, HTTP status, user-safe message and correlation ID.
- Responses should include cache headers and an ETag where useful.
- APIs must be versioned and backward compatible for supported mobile versions.
- Public endpoints require rate limits and abuse monitoring.
- Restaurant details should be addressable by stable slug while internal relationships use UUIDs.

---

## 12. Non-functional requirements

### 12.1 Performance and resilience

- First usable Explore screen: target under 2.5 seconds on a representative mid-range device and normal 4G, excluding an operating-system permission decision.
- Cached shell/settings must remain available offline.
- P95 public API latency: target under 500 ms in the pilot region, excluding third-party geocoding.
- Search input must remain responsive and stale requests must not replace newer results.
- Images must be resized, compressed, lazy-loaded and served in device-appropriate variants.
- Public services should target at least 99.9% monthly availability for production after pilot acceptance.

### 12.2 Accessibility

- Meet WCAG 2.2 AA principles applicable to native mobile interfaces.
- Minimum touch target: 44 × 44 pt.
- Support screen readers, logical focus order and accessible map alternatives through the list.
- Do not encode selected, verified or error state by color alone.
- Respect dynamic type within tested layout limits and reduced-motion settings.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text/UI components.

### 12.3 Privacy and compliance

- Complete a GDPR assessment and, if required, a DPIA before pilot launch.
- Explain the purpose of location access immediately before the system prompt.
- Prefer “while using the app”; background location is not required.
- Do not persist precise consumer location on the server unless a separately approved feature requires it.
- Define retention periods for analytics, account, consent and admin-audit data.
- Support access, deletion and consent withdrawal for registered consumers.
- Provide privacy policy, terms, company information and map-provider attribution.
- Establish documented restaurant publication consent or another approved lawful basis.

### 12.4 Security

- Follow OWASP MASVS/ASVS guidance appropriate to the app and API.
- Use TLS only and platform-secure token storage for authenticated sessions.
- Separate public, consumer-authenticated and administrative authorization scopes.
- Require MFA for administrative users.
- Apply least-privilege IAM and separate environment resources.
- Validate all imported and editor-supplied URLs and uploaded file types.
- Strip image metadata where appropriate and scan uploads.
- Keep immutable audit records for publication and privilege changes.
- Add dependency, secret and static-code scanning to CI.
- Perform threat modeling and penetration testing before broad public launch.

### 12.5 Observability

- Crash-free sessions, app start, API errors and failed deep links.
- Backend latency, error rate, throttles, cold starts and geo-query load.
- Import failures, stale records and restaurants awaiting verification.
- Correlation IDs across API Gateway and Lambda logs.
- Alerts must be actionable and must not contain consumer precise-location data.

---

## 13. Analytics event model

Recommended events:

| Event | Key properties |
|---|---|
| `explore_opened` | locale, entry source |
| `location_prompt_shown` | context |
| `location_permission_result` | granted/denied/restricted |
| `search_submitted` | coarse area or query type, not raw personal address |
| `results_loaded` | result count, radius, latency band |
| `view_mode_changed` | list/map |
| `restaurant_viewed` | restaurant public ID, result position |
| `directions_opened` | restaurant public ID, provider |
| `restaurant_shared` | restaurant public ID |
| `content_viewed` | content public ID, campaign |

Do not send raw latitude/longitude, telephone numbers, free-text address queries or other directly identifying input to analytics.

---

## 14. Delivery and repository strategy

### 14.1 Recommended code organization

```text
moretti-mobile/
  apps/
    smart-baking/
    road-to-smart-baking/
  packages/
    brand-tokens/
    mobile-ui/
    localization-core/
    analytics-core/
    api-core/
```

This monorepo is an optional future target, not a prerequisite for the MVP. The lower-risk starting point is a separate RoadToSmartBaking repository with one or two versioned shared packages. Avoid a large SmartBaking repository migration during the pilot.

### 14.2 Components suitable for extraction

- Brand palette and semantic tokens.
- Typography and accessible text primitives.
- Buttons, inputs, loaders and error/empty states.
- Localization initialization and locale matching.
- Analytics wrapper and screen-view conventions.
- API error normalization and structured logging concepts.
- Environment validation and release-version checks.

### 14.3 Components that should remain SmartBaking-only

- Oven state colors and mode semantics.
- MQTT and IoT authorization.
- BLE pairing and QR equipment setup.
- Oven, analytics and warehouse Redux slices.
- Professional RBAC mappings.
- Equipment cards and interaction controls.

---

## 15. Testing and quality gates

### 15.1 Automated testing

- Unit tests for selectors, reducers, formatting and permission decisions.
- Component tests for search, cards, filters, error states and accessibility labels.
- API contract tests generated from OpenAPI.
- Backend unit tests for publication and geo-query authorization rules.
- Integration tests for import → approval → public API.
- End-to-end tests for guest discovery, permission denial, manual search, venue detail and directions.
- Snapshot/screenshot regression tests for agreed device sizes and both core themes if a light content surface is introduced.

### 15.2 Device and field testing

- Current and minimum-supported iOS and Android versions.
- Low-memory Android device and small-screen iPhone.
- Slow network, offline transition and API timeout.
- Location disabled, approximate location and denied permission.
- Rural/empty region and dense urban marker clusters.
- Long translations, large text and screen reader.
- Directions providers installed/not installed.

### 15.3 Release gates

- No critical/high unresolved security findings.
- Legal approval of privacy, attribution and restaurant-publication wording.
- Marketing approval of launch dataset and all imagery.
- Product acceptance of the primary journeys.
- Crash-free internal/beta sessions at the agreed threshold.
- Store metadata, screenshots, age ratings and data-safety forms completed.
- Rollback/feature-disable mechanism tested.

---

## 16. AI-assisted and low-code pilot

### 16.1 Approved AI uses

- Generate first-pass components from approved designs.
- Generate unit tests, test data and accessibility cases.
- Draft API schemas and technical documentation.
- Refactor repetitive code under human review.
- Summarize logs containing no personal or confidential production data.
- Create internal prototypes that do not connect to production systems.

All AI-generated code must pass the same review, security, licensing and test gates as manually written code. Production secrets, personal data and confidential customer exports must not be submitted to unapproved tools.

### 16.2 Appropriate low-code boundary

Low-code is appropriate for:

- Marketing content entry and scheduling.
- Listing review queues and internal dashboards.
- Notification campaign approval workflows.
- Non-production UI experiments.

It should not own:

- Mobile runtime architecture.
- Public API authorization.
- Consent enforcement.
- Production data integration logic.
- Core geo-search behavior.

### 16.3 Pilot measurements

- Lead time per feature from design-ready to accepted.
- Engineering and review hours by activity.
- Escaped defects and rework rate.
- Test coverage of assisted versus conventional work.
- Time Marketing needs to publish a content change.
- Number of interventions needed to correct generated code.
- Subscription and infrastructure cost.

For a meaningful comparison, implement one representative, bounded feature conventionally and one with the selected visual/AI-assisted approach under equivalent acceptance criteria.

---

## 17. Delivery plan

### Phase 0 — Product and data discovery (1–2 weeks)

- Confirm pilot market and consumer proposition.
- Inventory CRM, ERP, distributor, installation and SmartBaking data sources.
- Sample and score restaurant-data completeness.
- Confirm publication consent process and data owner.
- Decide guest/account scope and Stories scope.
- Select success metrics and baseline.
- Confirm Brand, Legal, Marketing and technical approvers.

**Exit:** signed MVP brief, data-readiness report, decision log and prioritized backlog.

### Phase 1 — Experience and technical proof of concept (2 weeks)

- Define sibling-app design tokens and core components.
- Prototype Explore, map/list transition and restaurant detail.
- Compare map providers using representative pilot data.
- Validate geo-query performance and cost assumptions.
- Prove sample import and publication workflow.
- Establish AI-assisted pilot controls and measurements.

**Exit:** tested interactive prototype, architecture decision records and selected providers.

### Phase 2 — Foundation and backend (2–3 weeks)

- Create application repository, CI and environments.
- Implement schema, migrations, import staging and audit model.
- Implement public restaurant APIs and admin authorization.
- Configure S3/image delivery, logging, metrics and alarms.
- Establish typed API contracts and seeded non-production data.

**Exit:** deployable backend and content workflow with approved sample records.

### Phase 3 — Mobile MVP (3–4 weeks)

- Build app shell, localization and navigation.
- Build search, list, map, filters and detail flows.
- Implement permission, offline, loading and recovery states.
- Add analytics, crash reporting and deep links.
- Add Stories/account only if included in the signed MVP.

**Exit:** feature-complete alpha on iOS and Android.

### Phase 4 — Hardening and release (2 weeks)

- Accessibility, security, performance and device testing.
- Data validation and editorial QA.
- UAT, beta distribution and defect resolution.
- Store submission material and operational runbooks.

**Exit:** approved release candidate.

### Phase 5 — Controlled pilot (2–4 weeks)

- Launch to the selected market or audience.
- Monitor reliability, discovery funnel and data issues.
- Collect structured user and Marketing feedback.
- Compare AI/low-code outcomes against the baseline.
- Produce scale/no-scale and roadmap recommendations.

**Planning range:** 10–13 weeks to release candidate, followed by a 2–4 week pilot. This is a planning estimate, not a commitment. Data quality, consent and integration readiness are the largest schedule variables.

---

## 18. Key decisions required before implementation

| Decision | Recommended default | Owner |
|---|---|---|
| Pilot geography | One data-rich region/country | Product + Marketing |
| Authentication | Guest-first; optional account later | Product |
| SmartBaking identity sharing | Do not share by default | Product + Security |
| Map provider | Decide through cost/feature spike | Architecture + Procurement |
| Restaurant source of truth | Curated public dataset | Data owner |
| Publication lawful basis | Explicit documented process | Legal + Data owner |
| CMS/admin approach | Existing approved CMS if fit; otherwise lightweight admin | Marketing + Architecture |
| News in MVP | Include only with committed content owner | Marketing |
| Push in MVP | Defer unless a launch use case exists | Marketing + Product |
| Database | PostgreSQL/PostGIS if operationally suitable | Architecture |
| Repository | Separate app with selected shared packages | Engineering |
| Launch languages | Italian and English | Marketing + Product |

---

## 19. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Customer data does not map cleanly to public restaurants | High | Complete a sampled data audit before build; create a curated public model |
| Publication rights are unclear | High | Require evidence/status before `PUBLISHED`; involve Legal in Phase 0 |
| Low density in the pilot region | High | Select geography using data coverage; communicate radius/empty states clearly |
| Mandatory registration reduces adoption | High | Keep discovery guest-accessible |
| Map/geocoding cost grows unexpectedly | Medium–High | Provider spike, request limits, caching, budgets and usage alarms |
| SmartBaking code is copied wholesale | Medium–High | Extract only generic packages; keep separate domain architecture |
| Marketing workflow becomes an engineering bottleneck | Medium | Draft/review/publish CMS with ownership and training |
| Low-code tool cannot meet integration/security needs | Medium | Restrict it to content/workflows and run a bounded proof of concept |
| Consumer design feels too industrial | Medium | Retain brand chrome but validate warmer content surfaces and photography with users |
| Public data becomes stale | Medium | `last_verified_at`, review queues, expiry rules and data-owner SLA |

---

## 20. MVP acceptance criteria

The MVP is acceptable when:

1. A new user can find a nearby published restaurant without creating an account.
2. A user who denies location can complete the same journey using manual search.
3. List and map results remain consistent for the active query and filters.
4. A restaurant detail shows only approved public content and can open directions successfully.
5. Marketing can draft and update a listing, and an authorized publisher can publish it without a mobile release.
6. Unpublished and internal customer records cannot be retrieved through public APIs.
7. Italian and English journeys pass content, layout and accessibility review.
8. Required analytics and reliability dashboards work without collecting raw precise location.
9. Security, privacy, store and restaurant-publication approvals are recorded.
10. The pilot team can report delivery effort, quality and autonomy outcomes for the AI/low-code experiment.

---

## 21. Immediate next steps

1. Hold a 90-minute scope workshop with Product, Marketing, IT/Data, Legal and Engineering.
2. Select a pilot geography and extract a representative sample of 100–300 candidate venues.
3. Measure completeness for public name, address, coordinates, image and publication permission.
4. Produce three experience prototypes: location granted, location denied/manual search and no-results recovery.
5. Run short proofs of concept for map provider, geo search and the publication workflow.
6. Record the decisions in Section 18 and convert the functional requirements into an estimated backlog.

The most important first deliverable is not mobile code. It is a reliable, legally publishable restaurant dataset and an agreed consumer journey. Once those are validated, the existing SmartBaking mobile and AWS experience provides a strong foundation for implementation.
