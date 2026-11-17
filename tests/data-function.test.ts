// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { query, load } = vi.hoisted(() => ({ query: vi.fn(), load: vi.fn() }));
vi.mock('pg', () => ({
  default: {
    Pool: class {
      query = query;
      on() {}
    },
  },
}));
vi.mock('../src/server/config/runtime.mjs', () => ({ loadRuntimeSecrets: load }));
import { handler } from '../src/server/data/handler.mjs';
beforeEach(() => {
  query.mockReset();
  load.mockReset();
  vi.stubEnv('DATABASE_URL', 'postgresql://test');
  vi.stubEnv('RTSM_DB_SSL_CA', 'test-ca');
  vi.stubEnv('RTSM_DB_SCHEMA', 'road_to_smartbaking');
});
afterEach(() => vi.unstubAllEnvs());
describe('private data function boundary', () => {
  it('serves the existing public contracts', async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await handler({ method: 'GET', url: '/api/v1/health' })).toEqual({
      status: 200,
      body: { status: 'ok' },
    });
    expect(await handler({ method: 'GET', url: '/api/v1/shops' })).toEqual({
      status: 200,
      body: { items: [] },
    });
  });
  it('rejects admin, arbitrary SQL and identity assertions before loading credentials', async () => {
    expect((await handler({ method: 'POST', url: '/api/v1/admin/shops', body: {} })).status).toBe(
      403,
    );
    expect(
      (
        await handler({
          method: 'POST',
          url: '/api/v1/requests',
          sql: 'SELECT * FROM public.users',
        })
      ).status,
    ).toBe(400);
    expect(
      (await handler({ method: 'GET', url: '/api/v1/shops', staffEmail: 'admin@morettiforni.com' }))
        .status,
    ).toBe(400);
    expect(load).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
  it('validates public writes and rejects oversized requests', async () => {
    expect((await handler({ method: 'POST', url: '/api/v1/requests', body: {} })).status).toBe(400);
    expect(
      (
        await handler({
          method: 'POST',
          url: '/api/v1/reports',
          body: { details: 'x'.repeat(512 * 1024) },
        })
      ).status,
    ).toBe(413);
    expect(query).not.toHaveBeenCalled();
  });
  it('does not leak database failure details', async () => {
    query.mockRejectedValue(Object.assign(new Error('private SQL'), { code: 'ECONNREFUSED' }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await handler({ method: 'GET', url: '/api/v1/health' })).toEqual({
      status: 503,
      body: { error: 'Database unavailable' },
    });
    error.mockRestore();
  });
});
