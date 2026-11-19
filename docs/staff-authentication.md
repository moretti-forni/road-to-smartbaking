# Staff email-code authentication

Staff enter their `@morettiforni.com` email in Studio and receive a six-digit code. Any mailbox in that exact domain can sign in; there is no separate staff allowlist. Codes expire in ten minutes, allow five attempts and are single-use. Resends are limited to one per minute, five per address per hour, and 100 total per ten minutes. Sessions expire after eight hours and logout revokes them server-side.

Amplify stores the opaque session token in a Secure, HttpOnly, SameSite=Strict cookie. Tokens never appear in browser JSON or local storage. Only token hashes are stored in PostgreSQL. The private staff Lambda verifies the session on every admin operation. The public data Lambda remains restricted to public routes. Image processing stays on Amplify compute, after a private staff-session check, with uploads sent to S3.

## Prepare and deploy the AWS service

These steps activate real authentication; local implementation does not deploy it automatically.

1. SES **eu-west-1** already has production sending enabled, and both `morettiforni.com` and `noreply-app@morettiforni.com` are verified. Use `noreply-app@morettiforni.com` as `SenderEmail` and its SES identity ARN as `SesIdentityArn`, unless a different approved sender is preferred. Configure bounce/complaint monitoring on the identity.
2. Ensure the project's Secrets Manager JSON includes `DATABASE_URL`, the RDS `RTSM_DB_SSL_CA`, and a unique random `RTSM_AUTH_SECRET` of at least 32 characters. Preserve existing values and never put credentials in Git or Amplify public variables. The staff function gets only this project secret. For the existing four-content-table deployment, run `node --env-file-if-exists=.env.local scripts/setup-shared-auth.mjs` to review the plan, then add `--apply` from the trusted migration runner with `RTSM_MIGRATION_DATABASE_URL`, `RTSM_DB_SSL_CA`, and `RTSM_DB_RUNTIME_ROLE` configured. This installs only the two auth tables from `src/server/db/migrations/006-staff-email-auth.sql`, checks the existing project schema fingerprint, and grants scoped runtime access. Do not run the full local migration sequence against this shared schema. Do not run a fresh database setup against shared production data.
3. Build with `npm run staff:build`. Upload `build/staff-function.zip` to a private deployment-artifact S3 bucket in eu-west-1 under a unique versioned key. Do not use the CloudFront media path for code artifacts.
4. Deploy `deploy/staff-access.json` as a separate CloudFormation stack with IAM capability. Parameters: `CodeBucket` and `CodeKey` from step 3; the existing project's `RuntimeSecretArn`; `SubnetId` defaults to the existing private subnet; `SecurityGroupId` must be the existing data Lambda's security group (already allowed into RDS); `SesIdentityArn` is the approved SES domain/address identity ARN; `SenderEmail` is the verified bare email address; `AmplifyComputeRoleName` defaults to `rtsm-amplify-ssr-main`. This adds permission to invoke only the new staff function and send only from that SES identity to `@morettiforni.com` recipients.
5. Set the Amplify server runtime variable `RTSM_STAFF_FUNCTION_ARN` to the stack output. Keep `RTSM_DATA_FUNCTION_ARN` and set `RTSM_APP_ORIGIN=https://roadtosmartbaking.com`. The runtime forwarding script already allowlists the new ARN; it is configuration, not a credential. Redeploy the application only when ready to enable staff access.
6. Verify an actual staff mailbox receives a code, incorrect/reused codes fail, login creates the secure cookie, Studio loads drafts, an image uploads to S3, and logout prevents further admin requests. Check that requests without a cookie fail and public pages continue to work. Do not log codes, cookies, Lambda event payloads or SES message contents.

The existing subnet was checked to have NAT egress, and SES production access is enabled. The staff function uses that existing route, without provisioning another NAT gateway. Availability still depends on the shared network, database, verified SES identity and IAM permissions. New Lambda execution/logging and email usage incur AWS charges.

## Local verification

`npm test`, `npm run typecheck`, `npm run lint`, `npm run staff:build` and `npm run data:build` validate the adapters and packages. `npm run test:postgres` validates real OTP transactions against a **dedicated local/test database**. `npm run test:auth:browser` exercises the browser flow with the local mail catcher. Never point these test commands at the shared production database.

For rollback, remove `RTSM_STAFF_FUNCTION_ARN` from runtime configuration and redeploy: the existing private-data configuration disables staff login/admin routes by default. Do not delete the database or its authentication tables.
