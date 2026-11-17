# Shared PostgreSQL: four content tables

Target: the `morettihub-dev` logical database in the existing RDS instance. The development Hub configuration at `/morettiforni-ws-iot/dev/config` identifies the endpoint. The RDS instance name can contain `prod` even though the requested logical database is `morettihub-dev`; always check `current_database()` before changing anything.

## Fresh installation

Use the dedicated `road_to_smartbaking` schema. `src/server/db/shared-schema.sql` creates exactly four tables: `rtsm_shop`, `rtsm_story`, `rtsm_requests`, and `rtsm_reports`. It does not create OTP, session, draft, or migration-history tables. An installation fingerprint is stored in the schema comment.

Provision a dedicated, unprivileged runtime login `rtsm_app_dev` separately, with credentials kept in Secrets Manager. Use a different migration owner to run setup. Do not reuse Hub runtime credentials for the new application. Review role memberships and inherited/public permissions: grants within our schema cannot revoke access that a role already has elsewhere. Do not change shared PUBLIC permissions as part of this setup.

From a migration runner with private database access and validated TLS:

```sh
# Set RTSM_MIGRATION_DATABASE_URL securely outside the runtime deployment.
export RTSM_DB_SCHEMA=road_to_smartbaking
export RTSM_DB_RUNTIME_ROLE=rtsm_app_dev
npm run db:setup:shared              # plan only, no connection or writes
npm run db:setup:shared -- --apply   # explicit transactional setup
```

Setup refuses an existing schema with a different fingerprint and rolls back on failure. It changes only the new schema, its tables, and scoped runtime grants. It does not import data or change Hub tables. Repeated execution with the same fingerprint is a no-op. Subsequent schema changes need separately reviewed migrations; this bootstrap is not a general upgrade runner.

The runtime configuration must use:

```text
DATABASE_URL=<dedicated rtsm_app_dev connection to morettihub-dev with validated TLS>
RTSM_DB_SCHEMA=road_to_smartbaking
RTSM_AUTH_MODE=managed
```

`RTSM_DB_SCHEMA` scopes every connection's search path. Keep migration credentials outside Amplify. The application pool has a five-connection maximum per instance, timeouts, and an application name for monitoring. Amplify still needs a valid network path to RDS; adding an IAM role or secret does not create that path.

## Embedded drafts

Each shop row and each story/language row has live columns plus `draft_payload`, `draft_revision`, and `draft_saved_at`. The public API selects only live fields of published records. Saving edits leaves live content unchanged; publication copies the exact saved revision into the same row and clears its draft in one transaction. Revision checks reject stale saves/publication. New draft rows are private until published. A story batch rolls back both languages on any conflict.

Draft revisions are concurrency tokens, not an audit history. No automatic history is retained. Relationships stay within our schema to keep a future database move straightforward.

## Existing local installations

The legacy `npm run db:migrate` path remains for databases already using migrations 001–006. Migration 007 copies all draft payloads/revisions into the content rows and removes `rtsm_content_draft` transactionally. It preserves live IDs and publication fields; new unpublished draft-only content receives a row. Legacy OTP/session tables remain on this upgrade path until authentication migration is complete. Do not run this legacy migration chain for a fresh four-table shared installation.

## Authentication boundary

The current custom email OTP requires challenge/session storage. Four-table mode disables legacy OTP issuance and verification, ignores old session cookies, and denies staff access until the managed provider is integrated. It does not replace authentication with an insecure stateless OTP. Public reads, submissions and venue reports can work independently.

The existing Hub repository references Cognito, but its staff authorization/group policy has not been confirmed. Confirm the correct user pool, app client, staff group, and callback URLs before enabling Studio. Provider integration is a separate remaining step; this setup does not claim Studio login is production-ready.

## Data import and verification

Do not run the local demo seed against shared RDS. Prepare a reviewed import with explicit schema qualification and publication decisions after setup. Verify four tables, schema owner, runtime grants, rejection of cross-schema access, private request/report fields, draft isolation, publication conflicts and database connection counts before enabling public writes.

A later move can export/restore this schema, pause writes for final cutover, and update the runtime connection secret. Monitor reads as well as writes; shared compute and connection limits still apply.

## Provisioned development resources

Created in `eu-west-1` on November 17, 2026:

- RDS instance: `rmh-prod`; logical database: **`morettihub-dev`**.
- Schema: `road_to_smartbaking`; owner: existing migration identity `moretti-postgres`.
- Runtime login: `rtsm_app_dev`, with a ten-connection role limit, no role/database creation rights, and no table creation permission in our schema.
- Runtime secret: `/road-to-smartbaking/dev/database`.
- ARN: `arn:aws:secretsmanager:eu-west-1:701749480077:secret:/road-to-smartbaking/dev/database-CtScQr`.
- Secret contains `DATABASE_URL`, `RTSM_DB_SSL_CA` (public RDS trust chain), and the legacy-compatible signing secret. No credentials are committed.

The four tables were initially empty; the controlled catalog import below populated shops and stories. Existing tables and their grants were not modified. An effective-access check found no SELECT/INSERT/UPDATE/DELETE privileges on unrelated base tables for the new runtime role. Shared PUBLIC schema/default permissions remain a database-owner concern; the schema boundary is not compute isolation.

For Amplify set `RTSM_RUNTIME_SECRET_ARN` to this ARN, `RTSM_AWS_REGION=eu-west-1`, `RTSM_DB_SCHEMA=road_to_smartbaking`, and `RTSM_AUTH_MODE=managed`. Grant its SSR compute role GetSecretValue on this secret only. These settings are documented, not applied to an Amplify app. Confirm networking and the managed staff provider before switching the running deployment. Do not use the owner secret in Amplify.

Staff identity configuration and Amplify deployment changes remain pending. The catalog was imported separately after database provisioning.

## Controlled catalog import

`npm run db:import:catalog` validates the source and all bundled image references without connecting to the database. The explicit `--apply` mode requires `--expected-database`, uses only schema-qualified INSERT statements with ON CONFLICT DO NOTHING, and compares inserted content to the source before committing. It does not update existing records, drafts, publication decisions, requests, or reports. Original editorial dates are preserved in `source_published_at`; imported approval/publication timestamps record this import rather than claiming historical staff verification dates.

```sh
# Configure AWS_PROFILE and the restricted runtime secret ARN in the command environment.
# Do not place credentials in command arguments.
npm run db:import:catalog
npm run db:import:catalog -- --apply --expected-database morettihub-dev --schema road_to_smartbaking --report /tmp/catalog-import-report.json
npm run db:verify:catalog -- --expected-database morettihub-dev --schema road_to_smartbaking
```

The verification command uses a read-only transaction. It checks complete content equality, public visibility, date preservation, structured story blocks, language coverage, and the Italian fallback used when an English article does not exist. A staff edit after import will be reported as a difference; never overwrite it automatically.

The current archive has 43 shops (42 public; `desdott` hidden), bilingual shop descriptions, and 63 Italian stories. There are no English story translations in the archive. Images remain bundled under `/shops`, `/shops-webp`, and `/media`; import verifies 192 referenced local files, including optimized shop variants. These paths require deploying the same `public/` assets. This import does not upload images to S3 or validate a not-yet-deployed domain.

The default database unit tests skip real PostgreSQL integration. `npm run test:postgres` includes a temporary-schema import suite covering original content, repeat-run preservation, and rollback without touching RDS.

### Development import completed

On November 17, 2026, the restricted runtime login imported 43 shops and 63 Italian stories into `morettihub-dev.road_to_smartbaking`. All 106 records matched the source before transaction commit. There are 42 public shops and one hidden shop (`desdott`); all 63 original stories are public. Both shop description languages were retained, while English article routes use the existing Italian fallback. Requests and reports remained empty and unchanged. No Hub tables were touched.

The [import report](imports/2026-11-17-catalog-import.json) records source digest, counts, source comparison, and inserted public catalog IDs. It contains no credentials. Runtime configuration and deployment must still be switched separately to display this RDS catalog in the website.
