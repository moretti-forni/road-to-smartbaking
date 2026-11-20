# Staff password authentication

Studio accepts only `noreply-app@morettiforni.com` and `app@morettiforni.com`. Each account has its own password. There is no public registration, email delivery or password reset email. Password changes require the authorized operator to replace the stored hashes; do not send passwords in chat, Git or command-line arguments.

Passwords use salted scrypt (N=32768, r=8, p=1). The runtime secret stores hashes, never plaintext. Login failures use a generic error. Database-backed throttling allows ten attempts per account and fifty total per fifteen minutes, including successful attempts. Unknown accounts share a separate attempt counter and cannot sign in. Auth tables store hashed opaque session tokens with an eight-hour lifetime. Cookies are HttpOnly, Secure in production and SameSite=Strict. Logout revokes the session. The two accounts have the same Studio permissions.

## Set the passwords privately

Run `node scripts/setup-staff-passwords.mjs` in your terminal. Enter and confirm a separate password for each account (12–128 characters). Input is hidden. The command writes `.staff-passwords.json`, ignored by Git, with restrictive file permissions and refuses to overwrite an existing file.

For local development, use `node scripts/setup-staff-passwords.mjs --local` instead: this also updates `.env.local` safely, preserving database settings and escaping the hashes for Next.js dotenv expansion. Restart the local server. No email service is needed.

For AWS, merge the file's field into the **existing project runtime secret** in Secrets Manager, preserving `DATABASE_URL`, `RTSM_DB_SSL_CA`, and any other fields. Do not replace the entire secret with this one field. Never make this a `NEXT_PUBLIC_` variable. Rotating passwords does not revoke existing sessions: delete the affected account's rows from `rtsm_staff_session` when immediate revocation is required.

## Activate the private AWS service

1. Install the two authentication tables in the existing project schema using `scripts/setup-shared-auth.mjs`. First review its dry-run, then use `--apply` from the trusted migration runner with `RTSM_MIGRATION_DATABASE_URL`, `RTSM_DB_SSL_CA` and `RTSM_DB_RUNTIME_ROLE`. This requires a separate migration owner, checks the project's content-schema fingerprint and installs only the two auth tables. It reuses the challenge table for login attempt counters. Do not apply the full local migration chain to the shared content schema.
2. Build with `npm run staff:build` and upload `build/staff-function.zip` to a private deployment-artifact S3 bucket under a unique versioned key, outside the public CloudFront media path.
3. Deploy `deploy/staff-access.json` with IAM capability. Supply `CodeBucket`, `CodeKey`, the project's `RuntimeSecretArn`, the existing data Lambda `SecurityGroupId`, and private `SubnetId`. `AmplifyComputeRoleName` defaults to `rtsm-amplify-ssr-main`. The template grants the staff function access to the project secret and Amplify permission to invoke that function. It requires no SES identity or email permission. The function sets `RTSM_AUTH_MODE=password`.
4. Set the **dev branch** runtime variable `RTSM_STAFF_FUNCTION_ARN` to the stack output; keep its existing public data function ARN and exact dev `RTSM_APP_ORIGIN`. Redeploy dev and verify both accounts, wrong credentials, blocked third accounts, session restoration, logout, draft editing and S3 uploads. The public data Lambda remains public-route-only. Do not activate production until dev is verified.

Without the staff ARN, the hosted private-data configuration continues to deny staff access. The public website still operates. Deployment of the website does not automatically install tables or deploy Lambda code.

## Verification

`npm test`, `npm run test:postgres`, `npm run test:auth:browser`, lint, type checks, and Lambda/Next builds cover password restrictions, throttling, sessions and browser login. Run database tests only against an isolated local/test database. The browser test uses test-only password hashes; those are never production credentials.

The old OTP helper remains for compatibility with historical local migration tests, but OTP routes are no longer exposed by either HTTP adapter. Staff access uses the two fixed password accounts.
