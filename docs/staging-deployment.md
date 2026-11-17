# Staging deployment runbook

This prepares a separate container staging environment. No new AWS resources or DNS records are created by these files. Keep the existing static Amplify main/dev branches unchanged. The app is now aligned to Next.js 15.5.29 for Amplify. See docs/amplify-setup.md for that hosting path; this document covers the alternative container deployment.

## Runtime and networking

Use a dedicated Linux host with Docker Compose and Node 22-based container images, separate from production. The included Compose setup stores staging PostgreSQL in its own volume and exposes no database port. The web port binds only to localhost. The optional Caddy proxy terminates HTTPS on ports 80/443; point the chosen staging DNS name at the host first. Do not expose port 5432 or 5174 publicly.

An AWS EC2 instance can run this setup. Give it only the SES sending permission below through an instance profile; use IMDSv2 and configure the metadata hop limit for Docker credential access as required by the host networking setup. Do not put AWS access keys into the Docker image. For Fargate/App Runner or managed RDS, adapt the runtime/secrets/network configuration to that service; those resources are not provisioned here.

## Configuration

1. Copy `deploy/staging.env.example` to `.env.staging` on the staging host.
2. Choose `STAGING_DOMAIN` and set `RTSM_APP_ORIGIN` to the exact HTTPS origin, without a trailing slash.
3. Generate separate hex secrets for `STAGING_DB_PASSWORD` and `RTSM_AUTH_SECRET` using `openssl rand -hex 32`.
4. Configure SES (`RTSM_MAIL_PROVIDER=ses`, `AWS_REGION`, `SES_FROM`) or SMTP. SES must permit sending to the intended staff recipients in the selected region; check account sandbox/production status. The Moretti eu-west-1 account had verified identities for `morettiforni.com` and `noreply-app@morettiforni.com` during preparation.
5. Never set `NEXT_PUBLIC_CATALOG_SOURCE=fixtures` or a development staff token in staging. Never reuse a production database URL or production secrets.

Example IAM permission for the runtime role (adjust account/region if deploying elsewhere):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": ["arn:aws:ses:eu-west-1:701749480077:identity/morettiforni.com", "arn:aws:ses:eu-west-1:701749480077:identity/noreply-app@morettiforni.com"],
    "Condition": {"StringEquals": {"ses:FromAddress": "noreply-app@morettiforni.com"}}
  }]
}
```

SES identity verification does not itself grant this role permission. Confirm the intended sender with the team before real delivery.

## Deploy

Validate your filled configuration with `node --env-file=.env.staging scripts/check-staging.mjs` before deployment.

```sh
docker compose --env-file .env.staging -f compose.staging.yaml --profile https up -d --build --wait
```

The migration service waits for PostgreSQL, applies pending migrations, and exits. The web service starts only when migrations succeed. Run deployment from a reviewed commit; record its SHA with the release. The database starts empty: import approved staging content separately or create it in Studio. The fixture seed command deliberately rejects remote databases.

For subsequent releases, explicitly rerun the migration job before replacing the web container; Compose may otherwise reuse a completed migration container:

```sh
docker compose --env-file .env.staging -f compose.staging.yaml build
docker compose --env-file .env.staging -f compose.staging.yaml run --rm migrate
docker compose --env-file .env.staging -f compose.staging.yaml --profile https up -d --wait web proxy
```

The named database volume survives container recreation. Do not use `down -v` unless deliberately deleting staging data.

## Verify

- Open `/api/v1/health` and confirm a healthy database response.
- Check migration output and confirm all files through `006-staff-email-auth.sql` applied.
- Request an access code using an approved test mailbox at `@morettiforni.com`; confirm delivery, sign-in, reload/session restoration and logout.
- Confirm other domains are rejected and invalid/expired codes fail.
- Check the browser cookie has HttpOnly, Secure, SameSite=Strict and no domain-wide scope.
- Confirm unauthenticated admin API access returns 401, and cross-origin writes return 403.
- Verify public pages and staff publication workflows against the staging database.
- Check server logs contain neither OTPs nor session tokens.

The application and HTTPS proxy retain noindex restrictions for staging.

## Database history, backups and rollback

Fresh databases use `scripts/migrate.mjs` with no baseline. Only the known legacy local database with manual migrations 001–005 should use the documented one-time baseline option. Checksums reject modified applied files. Never edit migration files after release.

Back up the staging database before releases that change data or schema. Test a restore into a separate database. Roll back application code only when compatible with the applied schema; otherwise restore the pre-release database or deploy a forward correction. There are deliberately no automatic destructive down-migrations.

## Local checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:postgres
npm run test:e2e
# Start local SMTP capture first: docker compose --profile mail up -d mailpit
npm run test:auth:browser
npm run build
```

The PostgreSQL integration suite creates and drops its own random schema. `TEST_DATABASE_URL` should reference an isolated test database; the local helper can use the dedicated development database with separate schemas. No test emails are sent to real staff by the integration suite.
