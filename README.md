# RoadToSmartBaking

One Next.js application serves the bilingual public website, Marketing Studio, and `/api/v1` API. PostgreSQL stores shops, bilingual stories, listing requests, and saved editorial drafts. The existing database is not required.

## Local development

Use Node **22.13+** (also required by Capacitor 8) and Docker Desktop.

```sh
npm ci
cp .env.example .env.local
# Set a random RTSM_STAFF_TOKEN in .env.local for local Studio access.
docker compose --env-file .env.local up -d --wait db
npm run db:seed
npm run dev
```

Open [Italian](http://127.0.0.1:5173/it), [English](http://127.0.0.1:5173/en), or [Studio](http://127.0.0.1:5173/admin). Website and API run on port 5173 in the same process. There is no separate backend installation or API server.

The isolated Compose project is `roadtosmartbaking-next`, with its own `rtsm_next_postgres` volume and port **5434**. It initializes all three SQL migrations on a fresh volume. Do not point `DATABASE_URL` at an existing production database. Keep `.env.local` private. Compose overrides must be supplied using `--env-file .env.local`.

The seed command requires `--local-demo` (provided by the npm script) and a loopback database URL. It preserves existing records and publication decisions. An empty database produces empty public lists until content is imported or published.

For UI exploration without PostgreSQL, set `NEXT_PUBLIC_CATALOG_SOURCE=fixtures` in `.env.local` and restart the server. This explicitly uses the bundled catalog; listing submissions are disabled. API endpoints still require PostgreSQL. Never enable fixture mode for a live editorial deployment.

## Structure

```text
src/
  app/
    [locale]/                 Public pages, with Italian/English validation
    admin/                    Marketing Studio
    api/v1/[...path]/          Next.js HTTP entrypoint
  components/                 Shared UI and providers
  screens/                    Interactive page content
  features/catalog/           Shared validation and response mapping
  server/
    auth/                     Staff authorization
    http/                     JSON, CORS, size limits, error responses
    services/                 API workflows, drafts, public server reads
    repositories/             Parameterized PostgreSQL queries
    db/                       Connection pool and SQL migrations
  data/                       Bundled preview catalog and source archive
  services/                   Browser API clients and discovery logic
  lib/                        Navigation utilities
  styles/                     Global styles
```

Routes handle HTTP concerns; services preserve approval and draft/publish workflows; repositories own SQL. Public detail pages read the same workflows on the server, without making HTTP calls back into their own API. Server credentials stay outside the client bundle. API responses use `no-store` and detail pages render on demand, so this migration does not introduce stale publication caches.

Story source content lives in `src/data/stories.snapshot.json`. `npm run content:index` rebuilds its lightweight listing index and runs before production builds. Public images, fonts, and oven assets remain in `public/`; retain their license files.

## API and Studio

Existing `/api/v1` paths and response contracts are preserved: public shops/stories, listing submissions, staff request review/approval, shop editing, bilingual story editing, and saved revision publication. Collection responses use `{ "items": [...] }`, with `limit`/`offset`. JSON writes require `Content-Type: application/json` and have a 512 KiB limit.

```sh
curl http://127.0.0.1:5173/api/v1/health
curl 'http://127.0.0.1:5173/api/v1/shops?category=pizza'
curl 'http://127.0.0.1:5173/api/v1/stories?language=it'
```

For local Studio access, enter `RTSM_STAFF_TOKEN`; it is retained in memory. This shared token is development authentication. Before a production release, replace it with individual staff identity and role checks. Public submissions also need deployment-level abuse controls. Private drafts and listing contact details remain behind staff authorization.

## Checks and production build

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm start
```

Playwright launches the app in explicit fixture mode for deterministic browser journeys. Do not reuse a running API-backed dev server for those tests. API adapter tests use a mocked database; real PostgreSQL integration should additionally verify submissions, approval transactions, and revision-conflict publishing against the isolated local database.

Deploy to a Next.js-capable Node/container or managed SSR host. `amplify.yml` now outputs `.next`; the old Pages workflow has been replaced with validation because GitHub Pages cannot host the API. Deployment credentials and platform provisioning are not included. A standalone container must also copy `public/` and `.next/static/` alongside `.next/standalone/`.

Configure a dedicated PostgreSQL instance/service for production, with its own credentials and backups. S3 media uploads are a future integration; images currently use existing bundled paths or stored URLs. No AWS resources are created by this migration.

## iOS and Android

Capacitor still needs a static browser bundle; a Next.js server cannot run inside the native app. `npm run mobile:build` generates a React Router SPA using shared UI/data/services and small adapters in `mobile-source/`. The generated `mobile/` directory is ignored. The temporary route adapters for story and restaurant details must stay aligned with the web detail UI.

Set `NEXT_PUBLIC_API_BASE_URL` to the hosted **HTTPS** `/api/v1` endpoint in `.env.local`, then:

```sh
npm run mobile:sync
npm run mobile:ios
npm run mobile:android
```

Add the actual native origins to server-side `RTSM_ALLOWED_ORIGINS`, for example `capacitor://localhost,http://localhost`. Native apps call the same API; they never connect directly to PostgreSQL. The mobile output remains `build/client`. Native device packaging requires Node 22+, Xcode/Android SDK, and the existing platform projects.

Older designs under `docs/references/` describe prior architecture decisions; this README and `docs/technology-architecture.md` describe the current branch.
