// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../src/server/db/pool', () => ({ getDb: () => ({ query }) }));
import { serveApi } from '../src/server/http/api';
const request = (path: string, options?: RequestInit) =>
  new Request(`http://localhost/api/v1/${path}`, options);
beforeEach(() => {
  query.mockReset();
  vi.stubEnv('RTSM_STAFF_TOKEN', 'test-staff-token');
  vi.stubEnv('DATABASE_URL', 'postgresql://test');
});
afterEach(() => vi.unstubAllEnvs());
describe('Next.js API adapter', () => {
  it('serves existing health and catalog contracts without caching', async () => {
    query.mockResolvedValue({ rows: [] });
    const health = await serveApi(request('health'));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });
    expect(health.headers.get('cache-control')).toBe('no-store');
    const shops = await serveApi(request('shops'));
    expect(await shops.json()).toEqual({ items: [] });
  });
  it('rejects unauthorized staff requests before querying', async () => {
    expect((await serveApi(request('admin/shops'))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
  it('retains JSON validation, content type, and body size limits', async () => {
    const post = (body: string, headers = { 'content-type': 'application/json' }) =>
      serveApi(request('requests', { method: 'POST', body, headers }));
    expect((await post('{}')).status).toBe(400);
    expect((await post('{')).status).toBe(400);
    expect((await post('{}', { 'content-type': 'text/plain' })).status).toBe(415);
    expect((await post('x'.repeat(512 * 1024 + 1))).status).toBe(413);
    expect(query).not.toHaveBeenCalled();
  });
  it('restricts cross-origin access and allows explicitly configured mobile origins', async () => {
    expect(
      (await serveApi(request('shops', { headers: { origin: 'https://other.test' } }))).status,
    ).toBe(403);
    vi.stubEnv('RTSM_ALLOWED_ORIGINS', 'capacitor://localhost');
    const response = await serveApi(
      request('shops', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
  });
  it('maps database conflicts without exposing SQL details', async () => {
    query.mockRejectedValue(Object.assign(new Error('private SQL'), { code: '23505' }));
    const response = await serveApi(request('shops'));
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain('private SQL');
  });
});
