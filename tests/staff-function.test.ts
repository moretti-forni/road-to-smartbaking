// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  read: vi.fn(),
  revoke: vi.fn(),
  request: vi.fn(),
  verify: vi.fn(),
  api: vi.fn(),
}));
vi.mock('../src/server/data/database.mjs', () => ({ database: mocks.db }));
vi.mock('../src/server/auth/session.mjs', async (original) => ({
  ...(await original<object>()),
  readSession: mocks.read,
  revokeSession: mocks.revoke,
  requestCode: mocks.request,
  verifyCode: mocks.verify,
}));
vi.mock('../src/server/services/api.mjs', async (original) => ({
  ...(await original<object>()),
  handleApi: mocks.api,
}));
import { handler } from '../src/server/staff/handler.mjs';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RTSM_AUTH_MODE', 'email-otp');
  mocks.db.mockResolvedValue({});
  mocks.read.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());
it('rejects identity assertions, SQL and public routes before database access', async () => {
  for (const input of [
    { method: 'GET', url: '/api/v1/admin/shops', staffEmail: 'fake@morettiforni.com' },
    { method: 'GET', url: '/api/v1/shops' },
    { sql: 'SELECT 1' },
  ])
    expect((await handler(input)).status).toBe(400);
  expect(mocks.db).not.toHaveBeenCalled();
});
it('requires explicit email OTP configuration', async () => {
  vi.stubEnv('RTSM_AUTH_MODE', 'managed');
  expect((await handler({ method: 'GET', url: '/api/v1/auth/session' })).status).toBe(503);
  expect(mocks.db).not.toHaveBeenCalled();
});
it('rejects expired sessions and never dispatches admin writes', async () => {
  expect(
    (
      await handler({
        method: 'PUT',
        url: '/api/v1/admin/shops/test',
        token: 'a'.repeat(64),
        body: {},
      })
    ).status,
  ).toBe(401);
  expect(mocks.api).not.toHaveBeenCalled();
});
it('uses only the database-verified identity for admin dispatch', async () => {
  mocks.read.mockResolvedValue({ email: 'staff@morettiforni.com' });
  mocks.api.mockResolvedValue({ body: { items: [] } });
  expect(
    (await handler({ method: 'GET', url: '/api/v1/admin/shops', token: 'a'.repeat(64) })).status,
  ).toBe(200);
  expect(mocks.read.mock.calls[0][1].headers.get('cookie')).toBe(
    `rtsm_staff_session=${'a'.repeat(64)}`,
  );
  expect(mocks.api.mock.calls[0][1].staffEmail).toBe('staff@morettiforni.com');
});
it('keeps image processing outside the private database function', async () => {
  expect((await handler({ method: 'POST', url: '/api/v1/admin/media/uploads' })).status).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
});
it('does not leak internal errors', async () => {
  mocks.db.mockRejectedValueOnce(new Error('secret connection URL'));
  const result = await handler({ method: 'GET', url: '/api/v1/auth/session' });
  expect(result.status).toBe(503);
  expect(JSON.stringify(result)).not.toContain('secret');
});
