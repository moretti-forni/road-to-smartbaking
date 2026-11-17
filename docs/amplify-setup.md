# Amplify staging, SES and media setup

Prepared only: these instructions do not provision AWS resources or change the existing live app.

## 1. Application compatibility

The repository uses Next.js 15.5.29, pinned to the latest stable 15.x patch available when prepared. Locale handling uses `src/middleware.ts`, not the Next.js 16 proxy convention. A compatible PostCSS 8.5.33 override addresses dependency advisories. Keep the lockfile and run audit/checks when updating.

## 2. Connect the staging branch

1. Commit/review the prepared changes and push the intended branch. The local migration branch is `feat/next.js`; uncommitted files are not available to Amplify.
2. In AWS Console, select Ireland (`eu-west-1`) and open Amplify → `road-to-smartbaking`.
3. Use the branch connection action to connect the reviewed branch. Do not replace `main` or reuse its database/settings for staging.
4. Confirm the platform is `WEB_COMPUTE` and the branch framework is Next.js SSR, with `.next` as its build artifact. The previously inspected existing app used `WEB` (static hosting). Changing the app platform is an app-level change: if you need zero impact on existing branches, create a separate Amplify staging app linked to this same repository instead. Do not copy the old SPA catch-all rewrite to `index.html` into an SSR deployment.
5. Configure the branch settings below and its SSR compute role. The build requires a secret ARN and the exact HTTPS branch origin. Obtain the branch hostname from Amplify, then set that origin without a trailing slash.
6. Build/deploy only after the chosen database connection path and migration job are ready. A successful frontend build alone does not demonstrate database connectivity.
7. Verify `/api/v1/health`, `/it`, `/en`, staff OTP login, uploads, draft preview and publication. Keep noindex enabled for staging.

The existing app ID observed during preparation was `d39rjisb2mzg1i`. If you deliberately convert that app, AWS documents the `update-app --platform WEB_COMPUTE` operation; review the effect on all its branches before executing it. Nothing in this change executes it.

## 3. Runtime settings and secrets

Create a Secrets Manager secret for staging in the selected region, using a customer-managed KMS key only if the runtime role also gets decrypt permission. Store JSON such as:

```json
{
  "DATABASE_URL": "postgresql://USER:PASSWORD@CHOSEN_ENDPOINT:5432/DB",
  "RTSM_AUTH_SECRET": "A_SEPARATE_RANDOM_32_PLUS_CHARACTER_VALUE"
}
```

This example assumes the existing direct PostgreSQL adapter has a valid network path. It does not make a private RDS endpoint reachable from Amplify. Do not publish a database to unrestricted Internet traffic just to bypass that requirement. A VPC data-access service/Lambda needs its own adapter/deployment before using private RDS here.

Configure these **non-secret** Amplify branch environment variables:

| Variable | Value |
|---|---|
| `RTSM_RUNTIME_SECRET_ARN` | ARN of the staging JSON secret |
| `RTSM_AWS_REGION` | `eu-west-1` |
| `RTSM_APP_ORIGIN` | Exact HTTPS staging origin |
| `RTSM_MAIL_PROVIDER` | `ses` |
| `SES_FROM` | Approved sender, e.g. `noreply-app@morettiforni.com` |
| `S3_MEDIA_BUCKET` | Media stack output |
| `MEDIA_PUBLIC_BASE_URL` | Media stack CloudFront URL |

Optional map settings are listed in `.env.example`. Do not set fixture mode or a development staff token. Do not put `DATABASE_URL`, OTP secrets, SMTP passwords or AWS keys into `NEXT_PUBLIC_*` variables or build artifacts.

`amplify.yml` invokes `scripts/prepare-amplify-env.mjs`, which writes only an explicit non-secret allowlist into `.env.production`. At request time the server loads the JSON secret through the compute role. Failed loads can retry; successful values are cached for the process lifetime. Redeploy after secret rotation to refresh existing database connections.

For a migration runner with a valid database network path and an IAM role, `npm run db:migrate:runtime` loads the same secret before applying SQL. Run this as a separate deployment job; do not give the public web process responsibility for schema changes.

## 4. SES and the compute role

1. Open SES in `eu-west-1`. Check the approved domain/sender identity, DKIM status, sending enabled status and account sandbox restrictions. Verification was previously observed for `morettiforni.com` and `noreply-app@morettiforni.com`; verify current status before use.
2. Use an approved sender. If sandbox restrictions affect intended recipients, verify them or request SES production access. Domain-restricted application login does not itself configure SES recipient permissions.
3. In IAM, create a dedicated staging **SSR compute role**, separate from Amplify's build/service role. Its trust policy allows `amplify.amazonaws.com` to assume the role.
4. Grant only:
   - `secretsmanager:GetSecretValue` on the staging secret ARN.
   - `ses:SendEmail` on the approved sender/domain identity ARNs, constrained by `ses:FromAddress` to the approved sender.
   - `s3:PutObject` on `incoming/*` and `media/*` in the media bucket.
   - `s3:GetObject` and `s3:DeleteObject` on `incoming/*` in that bucket.
   - `kms:Decrypt` on the specific KMS key only when using a customer-managed key for the secret.
5. Attach the role to the staging app/branch through Amplify's SSR compute role setting. A build role alone is insufficient; no hardcoded AWS access keys are needed.
6. Request an OTP from an approved test company mailbox, verify login/reload/logout, then check CloudWatch logs for delivery failures. Never log codes or session tokens.

All verified `@morettiforni.com` mailboxes currently receive the same Studio access under the requested policy.

## 5. S3 and CloudFront

The code and `deploy/media-storage.yaml` are prepared. Creating this CloudFormation stack creates billable S3/CloudFront resources; it has not been executed.

1. Open CloudFormation → Create stack → Upload template → `deploy/media-storage.yaml`.
2. Choose a staging-specific stack name and set `AllowedOrigin` to the exact HTTPS staging origin.
3. Review and create the stack. Use its bucket and CloudFront outputs for the branch settings above.
4. Add the restricted S3 permissions to the SSR compute role.
5. In Studio, use **Upload image** for a venue, story cover or story image block. Add alt text and save the draft. Publishing remains a separate explicit action.

The bucket stays private. CloudFront's origin access control can read only `media/*`; temporary `incoming/*` uploads are not publicly readable. CORS allows signed POST uploads only from the configured origin. A five-minute form policy restricts the object key, MIME type and exact file size. The server decodes the original, rejects unsupported/animated content, caps dimensions/pixels, strips metadata by re-encoding and produces WebP up to 2400 pixels. Temporary originals are removed after processing, with a one-day lifecycle fallback. Published URLs are public media URLs; never upload private staff documents here.

Supported input: JPEG, PNG, WebP and AVIF, up to 10 MB. The public app receives a permanent CloudFront URL, not AWS credentials. Uploaded but unused processed images are retained; automatic orphan cleanup is future work. No bucket or real AWS upload has been tested/provisioned in this preparation-only task.

## 6. Database choice: PostgreSQL or SQLite

S3 is object storage, not a database server or ordinary writable disk. Downloading a SQLite file into each Amplify instance and uploading it after edits creates separate competing copies and can lose changes. Do not implement that design.

A viable SQLite design is:

```text
Amplify Next.js → HTTPS data API on a persistent server
                         ↓
                    SQLite on local EBS disk
                         ↓
                 consistent backups to S3
```

Use a persistent EC2/Lightsail-style server, keep database access local to that server, authenticate server-to-server requests, and manage patching, backups and recovery. SQLite recommends API-based access rather than sharing its database file over a network filesystem. Avoid mounting one writable SQLite database into several serverless instances. Create backups through SQLite's backup mechanism rather than copying an active WAL database inconsistently.

This is feasible for a modest workload, but the current repositories, schema and OTP/migration locking are PostgreSQL-specific and need adapting. Another small-server option is to run **PostgreSQL behind the data API**, which preserves more existing code. Managed RDS PostgreSQL reduces database operations work but adds a separate service and requires a deliberate private-network access design. No database engine change is part of this task.

## References

- [AWS Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
- [Amplify SSR compute roles](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html)
- [Amplify runtime settings](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html)
- [SES sandbox and production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [SQLite over a network](https://www.sqlite.org/useovernet.html)
- [S3 object storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
