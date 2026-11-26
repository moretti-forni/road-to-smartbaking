# Production database and Amplify cutover

| Amplify branch | Deploy environment | PostgreSQL database | Schema                | Runtime login   |
| -------------- | ------------------ | ------------------- | --------------------- | --------------- |
| `dev`          | `dev`              | `morettihub-dev`    | `road_to_smartbaking` | `rtsm_app_dev`  |
| `main`         | `prod`             | `morettihub`        | `road_to_smartbaking` | `rtsm_app_prod` |

The current hosted sites use the dev data function. Provision and verify the production database and functions before changing `main`.

## Database and secret

1. From an authorized migration runner with verified RDS TLS, take a backup of the current project schema and determine which catalog, submissions, reports and drafts go to production. Plan a final sync or a write pause at cutover so submissions arriving during the transition are preserved.
2. Connect to `morettihub` as the migration owner and confirm the project schema is absent. Create the cluster-wide login `rtsm_app_prod` with no role memberships or elevated rights. Use your SQL client's private password prompt (in psql, `\password rtsm_app_prod`). Audit inherited PUBLIC grants on unrelated schemas and databases before giving the service credentials. PostgreSQL roles and PUBLIC privileges are shared infrastructure concerns. Coordinate any changes to existing grants with the Hub owner.
3. Set `RTSM_MIGRATION_DATABASE_URL` and `RTSM_DB_SSL_CA` privately in the runner. Run the content setup, then the auth setup if deploying Studio. Omit `--apply` to preview. Both scripts check the live database name before applying changes.

   ```sh
   export RTSM_DB_RUNTIME_ROLE=rtsm_app_prod
   node scripts/setup-shared-db.mjs --expected-database morettihub --apply
   node scripts/setup-shared-auth.mjs --expected-database morettihub --apply
   ```

4. Create the Secrets Manager secret `/road-to-smartbaking/prod/database` (or update its current value with `put-secret-value` if it already exists as a placeholder) with `DATABASE_URL` (production login and database), `RTSM_DB_SSL_CA`, and a new `RTSM_AUTH_SECRET` of at least 32 characters. Add separate `RTSM_STAFF_PASSWORD_HASHES` only for production Studio. Use an approved transfer for existing production records and reconcile counts before inviting staff to publish.

## Functions and branch routing

Build with `npm run data:build` and, for Studio, `npm run staff:build`. Upload the ZIPs to an approved private artifact bucket under unique keys. In `eu-west-1`, create a **new** `road-to-smartbaking-data-prod` CloudFormation stack from `deploy/amplify-data-access.json`. Supply `DeploymentEnvironment=prod`, `RuntimeSecretArn`, `CodeBucket`, and `CodeKey`. The stack outputs the data function ARN, dedicated compute role ARN, and VPC security group ID.

For Studio, create a new `road-to-smartbaking-staff-prod` stack from `deploy/staff-access.json`. Supply `DeploymentEnvironment=prod`, `RuntimeSecretArn`, `CodeBucket`, `CodeKey`, the production data stack's `SecurityGroupId`, and `AmplifyComputeRoleName=rtsm-amplify-ssr-prod`. Verify production data Lambda health via IAM invocation before attaching it to Amplify. Verify the restricted login's grants independently.

Pin the active dev data ARN and origin on the `dev` branch before replacing the app-level defaults. Set these overrides on both branches together with their appropriate compute role.

| Setting                   | `dev`                               | `main`                              |
| ------------------------- | ----------------------------------- | ----------------------------------- |
| `RTSM_DEPLOY_ENV`         | `dev`                               | `prod`                              |
| `RTSM_APP_ORIGIN`         | `https://dev.roadtosmartbaking.com` | `https://www.roadtosmartbaking.com` |
| `RTSM_DATA_FUNCTION_ARN`  | Active dev ARN                      | Production stack's data ARN         |
| `RTSM_STAFF_FUNCTION_ARN` | Active dev staff ARN                | Production staff ARN if enabled     |
| SSR compute role          | Existing `rtsm-amplify-ssr-main`    | `rtsm-amplify-ssr-prod`             |

Remove inherited routing settings once both branches have explicit values. Keep the database secret on the Lambda side. Deploy the reviewed commit to dev first, then to main after the production data transfer. Verify both health endpoints, catalog and form routing, and Studio where enabled. A successful health check alone does not prove environment isolation.

Before cutover, record the last known-good deployment, role, and settings. If rollback would send writes to the old database, pause submissions, reconcile writes made since cutover, and restore the prior code and routing together. An older build is needed to restore the old shared routing if the new build's environment validation would reject it.
