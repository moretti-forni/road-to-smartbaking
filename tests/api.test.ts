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

describe('venue report submissions', () => {
  const report = (body: unknown) =>
    serveApi(
      request('reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  it('validates reports before saving and restricts staff access', async () => {
    expect((await report({ shop: 'fico', reason: 'incorrect', details: ' ' })).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
    expect((await serveApi(request('admin/reports'))).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
  it('persists reports for published venues and rejects missing venues', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'receipt' }] });
    const response = await report({
      shop: 'fico',
      reason: 'incorrect',
      details: 'Address has changed',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'receipt' });
    expect(query.mock.calls[0][1]).toEqual(['fico', 'incorrect', 'Address has changed']);
    query.mockResolvedValueOnce({ rows: [] });
    expect((await report({ shop: 'missing', reason: 'closed', details: 'Closed' })).status).toBe(
      404,
    );
  });
});

describe('staff media endpoint routing', () => {
  const upload = (path: string, body: unknown, authenticated = true) =>
    serveApi(
      request(path, {
        method: 'POST',
        headers: {
          origin: 'http://localhost',
          'content-type': 'application/json',
          ...(authenticated ? { authorization: 'Bearer test-staff-token' } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  it('requires staff authentication before upload access', async () => {
    expect((await upload('admin/media/uploads', {}, false)).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });
  it('routes initiation and completion through schema validation and fails clearly without storage configuration', async () => {
    expect((await upload('admin/media/uploads', {})).status).toBe(400);
    expect((await upload('admin/media/complete', { key: '../private' })).status).toBe(400);
    vi.stubEnv('S3_MEDIA_BUCKET', '');
    vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '');
    expect(
      (await upload('admin/media/uploads', { size: 100, contentType: 'image/jpeg' })).status,
    ).toBe(503);
  });
});
