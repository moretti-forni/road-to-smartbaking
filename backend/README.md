# RoadToSmartBaking API

The local HTTP server uses PostgreSQL from the Compose project in the parent
directory. The backend and seed command support Node 20.19+ and the server
binds to `127.0.0.1:3001` by default. Run these commands from the project root.

```sh
docker compose up -d --wait db
npm --prefix backend ci
cp backend/.env.example backend/.env
npm --prefix backend start
```

Set a random `RTSM_STAFF_TOKEN` in `backend/.env` before starting if you want
to use staff endpoints. Pass it as `Authorization: Bearer <token>`. Public
endpoints work without a token. This shared token is for local development.
Open the frontend at `/admin` and enter that token to use the Studio. The token is kept in memory for the current page. Production staff access needs user identity and role checks. Keep the token and
database URL on the server side and out of frontend builds. Adjust
`DATABASE_URL` if you override the Docker database port or password.
`RTSM_ALLOWED_ORIGINS` controls which browser origins can call the local API.

```sh
curl http://127.0.0.1:3001/api/v1/health
curl 'http://127.0.0.1:3001/api/v1/shops?category=pizza'
curl 'http://127.0.0.1:3001/api/v1/stories?language=it'
```

If you are already inside `backend/`, run `npm start` or
`npm run seed:frontend -- --local-demo` directly. If port 3001 is already
in use, check `/api/v1/health` with the command above. A healthy response
means you can keep using the existing server. To run on another port, set
`RTSM_API_PORT` in `backend/.env`.

## Import the frontend catalog locally

With Docker PostgreSQL running, install both the frontend and backend
dependencies before running:

```sh
npm --prefix backend run seed:frontend -- --local-demo
```

The importer reads the frontend shop fixtures and story snapshot directly,
applies the fixture-metadata migration, and inserts missing rows in one
transaction. Shop slugs and story slug/language pairs prevent duplicates.
Rerunning the import preserves existing rows and publication decisions.

Fixture visibility is copied into the local database for testing. Import
verification and approval timestamps are local demo values. Original story
dates are stored separately from local publication timestamps, and the
bundled images are referenced by their frontend paths. The script requires a
loopback database URL and leaves listing requests alone.

## Routes

All paths below start with `/api/v1`. Collection responses are
`{ "items": [...] }` and accept `limit` and `offset`. JSON writes require
`Content-Type: application/json`. Field definitions live in
[validation.mjs](validation.mjs).

| Method and path | Behavior |
| --- | --- |
| GET `/health` | Check the PostgreSQL connection. |
| GET `/shops`, `/shops/:slug` | Read public shops. The list accepts `q` and `category`. |
| GET `/stories`, `/stories/:language/:slug` | Read published stories. The list defaults to Italian. Details include the structured body. |
| POST `/requests` | Save a listing request. Respond with its ID and status. |
| GET `/admin/requests`, `/admin/requests/:id` | Read the private staff inbox. |
| PATCH `/admin/requests/:id` | Update review status and notes, with optional corrected submission details. |
| POST `/admin/requests/:id/approve` | Create an approved shop from the supplied shop fields and link it to the request in one transaction. Optional request corrections are saved in the same transaction. Retrying returns the linked shop. |
| GET, POST `/admin/shops` | List staff shop records or create an already verified and approved shop. |
| PUT `/admin/shops/:slug` | Save shop details and visibility together. |
| POST `/admin/shops/:slug/publish`, `/admin/shops/:slug/suspend` | Set public visibility. Publish also restores a suspended shop. |
| GET `/admin/story-groups/:slug` | Read both language versions for one story. |
| POST `/admin/story-groups`, PUT `/admin/story-groups/:slug` | Save the supplied Italian and English versions in one transaction. An omitted language is preserved. |
| GET `/admin/stories`, `/admin/stories/:language/:slug` | Read draft and public stories. |
| POST `/admin/stories` | Create a story with a slug, language, and initial visibility. |
| PUT `/admin/stories/:language/:slug` | Save an existing story and set `visible` to publish or hide it. |
| POST `/admin/stories/:language/:slug/withdraw` | Remove the story from public responses and keep its content as a draft. |

The Studio displays `Visible · 1` or `Hidden · 0` using the existing publication
timestamps. The Studio saves content edits to private drafts. A change becomes visible
through the public API after publication. A listing request stays private and is retained as a review
record when its linked shop is created. Shop creation and request
approval assume a staff member has already verified the supplied venue details.
The consumer React routes use these public endpoints in development. An empty
database returns empty lists until records are created and published.

## AWS boundary

`server.mjs` handles local HTTP, JSON parsing, CORS, and the connection pool.
`api.mjs` dispatches requests and `data.mjs` contains parameterized PostgreSQL
queries and transactions. An API Gateway/Lambda adapter can call the same
workflow functions with a server-side pool and authenticated staff identity.
The local server creates no AWS resources.

The Marketing Studio uses private draft storage for Save, Preview, and Publish.
On an existing local Docker volume, apply the additive migration once from
the project root.

```sh
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U rtsm -d rtsm < db/003-content-drafts.sql
```

Staff can read or save a shop draft at `/admin/drafts/shop/:slug/shared`.
Story drafts are saved together at `PUT /admin/story-drafts/:slug` and read
individually at `/admin/drafts/story/:slug/:language`. Posting a saved revision
to its individual draft endpoint publishes that exact revision and consumes
the draft. The public catalog continues to read the live shop and story tables.
