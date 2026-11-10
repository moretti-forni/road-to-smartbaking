# RoadToSmartBaking — web and mobile

A React/TypeScript consumer frontend with Moretti colours and typography, using the local Blogzine reference for editorial composition and carousel/card behaviour. Separate from the Marketing Studio and Remote Master Hub.

## Run locally

Use Node 22.13+ (the web tooling supports Node 22.13+ on the 22.x line and Node 24+).

```sh
npm ci --include=dev
npm run dev
```

Open `http://127.0.0.1:5173/it` or `/en`. The root links/redirects to Italian. The development server proxies `/api/v1` to the local backend on port 3001. Start PostgreSQL and the backend before opening the consumer pages. `npm run build` creates pre-rendered output under `build/client`; `npm run preview` serves it locally.

## Local PostgreSQL

With Docker running, start the database from this directory.

```sh
docker compose up -d --wait db
docker compose exec db psql -U rtsm -d rtsm -c '\dt rtsm_*'
```

For a local SQL client, use host `127.0.0.1`, port `5433`, database and
user `rtsm`, and the local-only password `rtsm_local_only`. Set
`RTSM_DB_PORT` or `RTSM_DB_PASSWORD` in `.env` before the first start to
override these defaults. Changing the Compose password after initialization does
not change the existing database role's password.

A fresh database starts empty. To load the current frontend catalog for local
testing, see [Import the frontend catalog locally](backend/README.md#import-the-frontend-catalog-locally). `rtsm_shop` stores approved venues, including their
publication and suspension timestamps. `rtsm_story` stores language variants
and structured content blocks. `rtsm_requests` stores private submissions and
links approved requests to the associated shop. A request approval and its shop
write should happen in one transaction. API writers should maintain `updated_at`
on edits.

`docker compose down` stops the service and preserves its named volume.
`db/001-initial-schema.sql` runs only when initializing an empty volume. Apply
later schema changes as separate migrations to preserve existing data.

Start the [local backend](backend/README.md) in another terminal with
`npm --prefix backend start`. Explore, Stories, Saved, and listing requests
use the public API in development. Open `/admin` and enter the staff token from
`backend/.env` to edit shops and stories, review listing requests, and control
consumer visibility.

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

The development catalog comes from PostgreSQL. Shops retain their source map
notes and approximate pins. Stories retain their original language and dates.
The English interface uses published English versions where available and
otherwise displays the Italian version. Approval timestamps on seeded
records are for local testing.

For a live production build, set `VITE_PUBLIC_API_BASE_URL` to the API's
`/api/v1` URL and configure the host to serve `__spa-fallback.html` for
dynamic consumer detail routes. These routes fetch current published data at
runtime, including after a venue or story has been withdrawn. Builds without
the variable use the bundled, pre-rendered demo catalog. For a demo-only
development run, explicitly set `VITE_PUBLIC_API_BASE_URL=`.

The map defaults to OpenStreetMap for local evaluation. Set `VITE_CARTO_BASEMAP_KEY` to use CARTO Voyager for a cleaner, familiar road-map style, or supply an approved `VITE_MAP_TILE_URL`. Production needs an approved tile/geocoding provider, visible attribution and usage-policy review. Search filters the loaded catalog; live address autocomplete, clustering and production pagination are future integration work.

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
