// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SES: {},
  SecretsManagerClient: class {
    send = send;
    destroy() {}
  },
  GetSecretValueCommand: class {
    constructor(public input: unknown) {}
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  send.mockReset();
});
describe('runtime secret loading', () => {
  it('loads only server credential fields and caches concurrent requests', async () => {
    vi.stubEnv('RTSM_RUNTIME_SECRET_ARN', 'arn:test');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('RTSM_AUTH_SECRET', '');
    send.mockResolvedValue({
      SecretString: JSON.stringify({
        DATABASE_URL: 'postgresql://test@db/test',
        RTSM_AUTH_SECRET: 'a'.repeat(32),
        NEXT_PUBLIC_PASSWORD: 'must-not-load',
      }),
    });
    const { loadRuntimeSecrets } = await import('../src/server/config/runtime.mjs');
    await Promise.all([loadRuntimeSecrets(), loadRuntimeSecrets()]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(process.env.DATABASE_URL).toBe('postgresql://test@db/test');
    expect(process.env.NEXT_PUBLIC_PASSWORD).toBeUndefined();
  });
  it('does not expose provider errors and retries a failed load', async () => {
    vi.stubEnv('RTSM_RUNTIME_SECRET_ARN', 'arn:test');
    send
      .mockRejectedValueOnce(new Error('sensitive provider details'))
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          DATABASE_URL: 'postgresql://test@db/test',
          RTSM_AUTH_SECRET: 'a'.repeat(32),
        }),
      });
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('RTSM_AUTH_SECRET', '');
    const { loadRuntimeSecrets } = await import('../src/server/config/runtime.mjs');
    await expect(loadRuntimeSecrets()).rejects.toThrow('Runtime configuration unavailable');
    await loadRuntimeSecrets();
    expect(send).toHaveBeenCalledTimes(2);
  });
});
