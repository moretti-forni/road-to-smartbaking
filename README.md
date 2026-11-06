# RoadToSmartBaking — web and mobile

A React/TypeScript consumer frontend with Moretti colours and typography, using the local Blogzine reference for editorial composition and carousel/card behaviour. Separate from the Marketing Studio and Remote Master Hub.

## Run locally

Use Node 22.13+ (the web tooling supports Node 22.13+ on the 22.x line and Node 24+).

```sh
npm ci --include=dev
npm run dev
```

Open `http://127.0.0.1:5173/it` or `/en`. The root links/redirects to Italian. No backend credentials are required. `npm run build` creates pre-rendered output under `build/client`; `npm run preview` serves it locally.

## Mobile development

Capacitor 8 packages the same pre-rendered `build/client` output in the iOS and Android apps. The bundle ID is `com.morettiforni.roadtosmartbaking`. iOS uses Swift Package Manager and requires Xcode 26+. Android requires Android Studio 2025.2.1+ and Android SDK 36.

```sh
npm run mobile:sync     # Build and sync both wrappers
npm run mobile:ios      # Build, sync, and run on an iOS target
npm run mobile:android  # Build, sync, and run on an Android target
```

After syncing, use `npx cap open ios` or `npx cap open android` to work in the native IDE. Track the native projects in source control. Each wrapper's ignore rules exclude copied web assets and local build files.

The web manifest supports standalone installation where the browser offers it. The website needs connectivity to fetch its pages. Native apps package the local site assets, while map tiles and external links still depend on connectivity.

For release, confirm the bundle ID and signing accounts, replace the scaffold icons and splash screens, and test on real devices. Native geolocation, directions, sharing, push notifications, and verified App Links / Universal Links are separate integration work.

## Implemented

- Discovery: lazy-loaded Leaflet map above cards, city/name search, category and map-area filtering, explicit geolocation, distance sorting, highlighted selection and empty-state recovery.
- Restaurant detail: editorial image, description, illustrative oven relationship, share/save and practical-information panel.
- Stories: manual swipe/scroll-snap carousel with previous/next/dots, category filters, search and progressive loading.
- Articles: original body, source links, metadata, related stories and sharing/clipboard fallback.
- Saved places: local browser storage, failure handling and cross-tab updates.
- Italian/English interface, responsive navigation, reduced motion, visible focus and skip link.
- Article and sample restaurant routes pre-rendered in both interface languages.

## Data and release boundaries

**This is a local working frontend preview, not a production service.** Six restaurants, oven assignments and coordinates are demonstration data. Editorial images do not depict the sample venues. No opening hours, phone numbers or verified-address claims are invented. Directions remain disabled until verified destinations are connected.

The 63 Italian articles/images come from the mobile project's imported Moretti archive. The English interface labels Italian editorial content; translations are not fabricated. Publication/image rights still need review.

Discovery uses the fixture repository in `app/services/discovery.ts`. `app/services/http.ts` prepares a public Axios boundary, but **no live restaurant API is wired**. Setting `VITE_PUBLIC_API_BASE_URL` alone does not enable a live mode. Do not connect the hub's private endpoints or credentials.

The map defaults to OpenStreetMap for local evaluation. Set `VITE_CARTO_BASEMAP_KEY` to use CARTO Voyager for a cleaner, familiar road-map style, or supply an approved `VITE_MAP_TILE_URL`. Production needs an approved tile/geocoding provider, visible attribution and usage-policy review. Search filters sample records; live address autocomplete, clustering and production pagination are future integration work.

Preview pages are intentionally `noindex,nofollow`. Before launch: connect verified data, implement publication/rebuild/CDN withdrawal handling, approve legal text and imagery, configure canonical/social metadata, and verify real HTTP 404 behaviour on the host. No deployment or AWS resources are created here.

## Content and assets

`app/data/stories.snapshot.json` is the source archive. `npm run content:index` generates a lightweight index without article bodies; `prebuild` runs it automatically. Full bodies travel as route data rather than entering the listing bundle. `public/media` and `public/fonts` are runtime copies; retain font OFL licenses. Design boards stay outside runtime output in `assets/references`.

The template at `/Users/k.puthussery/Documents/blogzine_v1.3.2/template` is untouched. Its Bootstrap/tiny-slider/global scripts are not dependencies. Template package metadata alone does not establish reuse rights.

## Checks

```sh
npm run lint
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
npm run format:check
npm run build
```

Browser tests cover discovery/recovery, saved persistence, details, carousel/search, article deep links, language switching, invalid routes and desktop/mobile overflow. Traces/screenshots go to ignored `test-results`.

`minimatch` is overridden to patched 11.x for the lint dependency tree; revalidate when upgrading tooling. Dependencies are locked in `package-lock.json`.

See `docs/technology-architecture.md`, `docs/web-app-plan.md` and `assets/README.md` for rationale and provenance. `amplify.yml` is a proposed static build configuration only; host rewrites/publication policy still need deployment validation.
