import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { z } from 'zod';
const secretSchema = z.object({
  DATABASE_URL: z.string().url(),
  RTSM_DB_SSL_CA: z.string().min(1).optional(),
  RTSM_AUTH_SECRET: z.string().min(32),
  RTSM_STAFF_PASSWORD_HASHES: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});
let pending;
export async function loadRuntimeSecrets() {
  const arn = process.env.RTSM_RUNTIME_SECRET_ARN;
  if (!arn) return;
  if (!pending) {
    pending = (async () => {
      const client = new SecretsManagerClient({
        region: process.env.RTSM_AWS_REGION || process.env.AWS_REGION,
      });
      try {
        const result = await client.send(new GetSecretValueCommand({ SecretId: arn }));
        if (!result.SecretString) throw new Error('Runtime configuration unavailable');
        const values = secretSchema.parse(JSON.parse(result.SecretString));
        Object.assign(process.env, values);
      } finally {
        client.destroy();
      }
    })().catch(() => {
      pending = undefined;
      throw new Error('Runtime configuration unavailable');
    });
  }
  return pending;
}
