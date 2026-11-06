# RoadToSmartBaking — consumer web app plan

## Scope clarification — November 2, 2026

The user clarified that this frontend is the consumer-facing companion to the mobile app. The earlier Marketing Studio interpretation is superseded for this frontend. Its previous plan is preserved in docs/references/previous-marketing-studio-plan.md as separate future backoffice context, not the implementation brief.

Build four primary page types: restaurant discovery home, restaurant detail, Stories home and individual story. Supporting Saved places, language/privacy controls and recovery states adapt the already discussed mobile features to the web. Italian and English from the start; no mandatory consumer account for discovery.

## Reference boundary

User-specified references:
- Stories listing: https://blogzine.webestica.com/index-2.html
- Article detail: https://blogzine.webestica.com/post-single-2.html

Blogzine is ONLY a reference for editorial layout, carousel/card composition, proportions, spacing and motion. Moretti is the sole source for identity, colour, fonts, voice and approved photography. Do not inherit Blogzine logos, demo articles, ads, memberships, comments, ratings or unrelated navigation. Reuse of template code/assets requires checking its license; visual inspiration alone does not authorize copying the template wholesale.

The live reference pages were fetched for structural inspection. UPDATE: The local project has now been located at /Users/k.puthussery/Documents/blogzine_v1.3.2/template and its two HTML pages and carousel initialization source inspected. See technology-architecture.md for verified findings. The following earlier requirements still apply: Before implementation, finish visual inspection of the located template, including computed CSS dimensions and responsive behavior. The source default carousel speed is verified at 500 ms; proposed consumer dimensions below are not yet approved pixel matches.

## Shared consumer shell

Moretti-branded header with Explore, Stories, Saved and Italian/English controls; responsive navigation on narrow screens. Warm light canvas with photographic editorial content, not an admin sidebar. Footer provides Moretti relationship context, privacy/legal and appropriate external links. Active navigation uses Moretti Red. Saved places remain local-first for the initial release; synchronized accounts are not implied.

## 1. Discovery home — /

1. Concise discovery heading, location search and explicit Use my location control.
2. Wide horizontal interactive map as the dominant discovery surface; restaurant results BELOW it, not a permanent desktop map/list split.
3. Filter/sort bar with applied filters, clear action and result count for the current query.
4. Responsive restaurant-card grid with photography, restaurant name, city/address context, cuisine, Moretti relationship, saved state and distance only when a reference location exists. Opening status only when supported by reliable hours/timezone data.
5. Pagination or explicit Load more rather than requiring the browser to download the entire catalogue.

Map and cards represent the same active geographic query and filters. Marker selection highlights its corresponding card; card focus/selection highlights its marker. Provide Search this area after map movement. Keep manual search usable when geolocation is denied. Offer an accessible list alternative and useful loading, empty, network-error and permission-denied states. Use server-side geographic filtering and published records only. Avoid fabricated counts or locations.

Proposed layout: map around 420–520 px high on desktop and 280–360 px on phones; 3 restaurant columns on wide screens, 2 on tablets, 1 on phones. These are design starting points pending reference and viewport review.

## 2. Restaurant detail — /restaurants/:slug

Create a dedicated restaurant experience, not an article with renamed fields:
- Breadcrumb/back-to-results context and large authentic hero or gallery.
- Name, city, cuisine and factual Moretti relationship.
- Prominent Directions action; Save and Share as supporting actions.
- Description, location/address, opening-hours text when available, telephone, website and relevant social links.
- Oven model/Moretti relationship section only with verified data and approved imagery.
- Location map, associated stories and related nearby venues when available.

Use an editorial main column plus a compact practical-information panel on desktop, stacked naturally on mobile. Optional sticky practical actions must not obscure content or keyboard focus. Directions hands off to an external maps service. Hide unavailable contacts instead of creating dead actions. No booking/payment/review system or food-quality certification claims.

## 3. Stories home — /stories

Use index-2.html as the layout/motion reference: a featured-story carousel first, then editorial article cards below. Translate its hierarchy into Moretti content rather than reproducing demo sections.

- Page title and short editorial introduction.
- Wide photographic featured carousel with category, title, concise excerpt and Read story action; useful previous/next and position controls.
- Story category filters/search and result count when supported by the data contract.
- Responsive article grid with deliberate image ratios, title, excerpt, category, date and reading time only where available or derived honestly from actual article text.
- Load more/pagination and proper empty/loading/error states.

Carousel should be manually operable by default. If autoplay is later approved, provide pause, pause on hover/focus and stop automatic movement for reduced motion. Do not hide the rest of the article list behind carousel navigation. No invented total-story counts, author identities, readership numbers or social proof.

## 4. Individual article — /stories/:slug

Use post-single-2.html as an editorial hierarchy/proportion reference:
- Category, expressive Moretti serif title, optional introduction and real author/date/reading metadata.
- Large hero, accessible alt text and captions/credits where available.
- Comfortable reading column, structured headings, paragraphs, inline photography and editorial quotations.
- Share controls with a fallback where native browser sharing is unavailable.
- Related restaurant card where a real association exists; related stories and a return-to-Stories path.

Proposed body measure: about 65–75 characters, 17–18 px body text with comfortable line height; adapt to narrow screens without horizontal overflow. Optional reading progress is a design enhancement, not a required mobile feature. No comments, ratings, membership prompts or ads merely because the template has them.

## Moretti theme — unchanged

| Token | Value | Consumer use |
| --- | --- | --- |
| Moretti Red | #D62839 | Primary CTA, active links, selected markers |
| Red Dark | #A91F2D | Pressed/emphasis |
| Graphite | #20201E | Dark text/selected dark surfaces |
| Ink | #171715 | Main text |
| Warm Cream | #F7F4EE | Page background |
| Warm White | #FFFEFB | Cards and surfaces |
| Stone | #DEDAD3 | Borders/dividers |
| Muted | #6F6B65 | Secondary copy |
| Success | #168A4A | Success with text |
| Warning | #C98512 | Attention with text |
| Information | #2563B8 | Information with text |
| Error | #B3261E | Errors with recovery copy |

DM Serif Display for editorial headings; Inter for interface and readable body text. Shared spacing scale: 4/8/12/16/24/32/48 px. Proposed consumer cards: 16–20 px radius, fine borders and restrained shadows, pending comparison with the local template. The desired relationship is Blogzine-inspired composition inside the established Moretti design system, not a wholesale Blogzine skin.

Photography constraints remain: authentic places/people/craft, Neapolis for restaurant/pizzeria contexts, Serie S/X for appropriate bakery/training/production contexts. Check publication rights and image quality; reference mockups and the restaurant composite are not individual production venue photos.

## Motion and accessibility

Proposed motion: subtle image zoom within a clipped card and small lift on hover; 180–240 ms interface feedback and 280–360 ms panels. Verify carousel motion against the local reference before choosing its duration. Mirror hover affordances with focus states, avoid hover-only information, respect reduced motion and reserve image dimensions to prevent layout shifts. Avoid excessive entrance animations or moving map content while reading cards. Test contrast, keyboard access, touch targets and image descriptions.

## Delivery sequence

1. Local Blogzine source located and inspected; next visually review and approve these four page compositions.
2. Inspect mobile data structures and backend public API contracts; identify fixture versus published content.
3. Follow docs/technology-architecture.md: React + TypeScript + Vite with React Router Framework Mode, custom Moretti CSS, public API repositories, client-side Leaflet map and proposed separate AWS Amplify static hosting. Map tile/geocoding vendor remains to be selected.
4. Implement shared Moretti shell/tokens, then Stories home and article detail to establish the editorial style.
5. Implement map-first discovery and restaurant detail; connect map/card/query state.
6. Add Saved, Italian/English, real API integration, SEO/share metadata and recovery states.
7. Run frontend lint/typecheck and appropriate interaction, responsive and accessibility checks before delivery.

## Status

The initial React frontend is implemented locally with all four page types, saved places and Italian/English interface. See README.md for commands and the distinction between real imported articles and illustrative restaurants. No live backend or deployment is enabled. The reference carousel disables autoplay and has a 500 ms default speed; this React implementation uses manual native scroll-snap and reduced-motion-aware controls rather than template scripts.
