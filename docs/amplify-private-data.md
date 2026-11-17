# Amplify SSR and private database access

The website keeps its `/api/v1` contract. When `RTSM_DATA_FUNCTION_ARN` is configured, public API requests and server-rendered shop/story reads use synchronous IAM-authenticated Lambda Invoke. The data Lambda runs in the existing Hub VPC and connects to `morettihub-dev.road_to_smartbaking` using validated TLS and the restricted `rtsm_app_dev` database identity.

There is no Function URL, API Gateway, raw SQL endpoint, or public database ingress rule. The Lambda accepts only the existing public catalog/health reads and listing-request/report submissions. Input validation and publication filtering run inside the function. Identity assertions, admin routes and arbitrary event keys are rejected. The SSR role can invoke this exact function; only the data Lambda role reads the database secret. Amplify does not need access to the database credentials.

## Resources

- Amplify app: `d39rjisb2mzg1i`, `road-to-smartbaking`, `eu-west-1`.
- Stack: `road-to-smartbaking-data-dev`, template `deploy/amplify-data-access.json`.
- Lambda: `road-to-smartbaking-data-dev`, Node 22, 256 MB, 20-second timeout.
- Lambda execution role: `rtsm-private-data-dev`.
- SSR compute role: `rtsm-amplify-ssr-main`, restricted to Lambda Invoke.
- Hosting service role: `rtsm-amplify-hosting-service`, for Amplify logging. This role does not provision other application backends.
- Data credentials: existing Secrets Manager `/road-to-smartbaking/dev/database`.
- Existing subnet: `subnet-01e88ce6a9284c0a6`, with an available NAT route for Secrets Manager. No new NAT gateway or database instance is created.
- Dedicated Lambda security group: outbound PostgreSQL to the VPC and HTTPS via the existing NAT; no inbound rules.
- RDS security group: one additive port-5432 rule from the dedicated Lambda security group. Existing rules are unchanged.

Reserved concurrency is three and each execution environment has a one-connection pool. The database role additionally has a ten-connection limit. At saturation Lambda throttles; Next.js returns a safe 503. The SDK does not retry synchronous calls automatically, avoiding automatic duplicate submission writes on transport failures. Public submission abuse prevention beyond these limits remains release work.

## Code deployment

Build and deploy from the repository root with an authorized operator profile:

```sh
npm run data:build
aws lambda update-function-code --profile Moretti --region eu-west-1 \
  --function-name road-to-smartbaking-data-dev \
  --zip-file fileb://build/data-function.zip
```

The CloudFormation template creates a safe unavailable placeholder handler. Upload the tested bundle after stack creation/update; the artifact is ignored under `build/`. Lambda code deployment is separate from an Amplify Git push. Native modules are excluded: the data function reuses the public workflows and PostgreSQL repository, rather than bundling Studio image processing.

## Amplify configuration

Set platform `WEB_COMPUTE`, main branch framework `Next.js - SSR`, attach the hosting and SSR roles, and use the repository `amplify.yml` with `.next` output and Node 22. Preserve existing variables and add:

```text
RTSM_DATA_FUNCTION_ARN=arn:aws:lambda:eu-west-1:701749480077:function:road-to-smartbaking-data-dev
RTSM_DB_SCHEMA=road_to_smartbaking
RTSM_AUTH_MODE=managed
RTSM_AWS_REGION=eu-west-1
RTSM_APP_ORIGIN=https://www.roadtosmartbaking.com
```

The existing runtime-secret ARN may remain in settings for migration tooling, but the web transport does not load it in Lambda mode. Never give Amplify the owner database secret. No local database URL, password or AWS access keys belong in Amplify variables.

The user is removing the old `/<*> → /index.html` SPA rewrite manually. Preserve the apex-to-www redirect. Do not push/deploy until that rewrite is removed. Configuration updates do not by themselves validate a hosted Next.js deployment; after pushing, check `/api/v1/health`, `/it`, `/en`, story and venue deep links, and bundled images.

## Staff and media boundary

Managed staff identity is not integrated yet. In Lambda transport mode the website denies admin requests, reports an unauthenticated session, disables OTP issuance, and permits logout without accessing nonexistent authentication tables. Studio is unavailable until a reviewed managed-auth integration and separate staff data operations are implemented. Existing local direct-PostgreSQL development workflows remain available when the function ARN is absent.

S3 uploads, SES email, and public staff editing are not enabled by this infrastructure. Bundled catalog images remain available from the deployed public assets. No table migrations or catalog writes are part of deploying this data function.

## Applied AWS configuration — November 17, 2026

The stack completed successfully, the tested Lambda bundle was uploaded, and its TLS database health check returned 200. Amplify is now `WEB_COMPUTE`; `main` is `Next.js - SSR`; both dedicated roles and `RTSM_DATA_FUNCTION_ARN` are attached. The old console build override was replaced with the repository `amplify.yml` (.next output, Node 22, allowlisted runtime configuration).

The SPA rewrite still existed at the final inspection and is left to the user to remove. No Git push or Amplify production build was started. New source changes must be reviewed/committed and pushed before the running website uses this transport.

Verification after deployment: IAM-only Lambda reads returned health 200, 42 public shops, 63 Italian stories, hidden-shop 404 and admin 403. A temporary local production Next.js server using the real Lambda transport passed API health, venue/story server rendering, bundled image delivery and blocked staff session checks. All 48 tests, lint, types and the production build passed. This is not a verification of a hosted Amplify deployment.
