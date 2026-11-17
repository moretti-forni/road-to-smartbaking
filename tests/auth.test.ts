// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { staffEmail, sessionHeader, cookieToken } from '../src/server/auth/session.mjs';
import { isStaff } from '../src/server/auth/staff.mjs';
afterEach(() => vi.unstubAllEnvs());
describe('staff email access policy', () => {
  it('accepts only exact company mailboxes and normalizes case', () => {
    expect(staffEmail.parse('Staff@MorettiForni.com')).toBe('staff@morettiforni.com');
    for (const email of [
      'staff@gmail.com',
      'staff@morettiforni.com.evil.test',
      'staff@sub.morettiforni.com',
      'staff@morettiforni.com@evil.test',
    ])
      expect(staffEmail.safeParse(email).success).toBe(false);
  });
  it('never accepts development tokens in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isStaff('Bearer known-secret', 'known-secret')).toBe(false);
    expect(sessionHeader('token')).toContain('HttpOnly; SameSite=Strict');
    expect(sessionHeader('token')).toContain('; Secure');
    expect(sessionHeader('')).toContain('Max-Age=0');
  });
  it('only reads well-formed opaque session tokens', () => {
    expect(
      cookieToken(
        new Request('http://localhost', {
          headers: { cookie: `other=value; rtsm_staff_session=${'a'.repeat(64)}` },
        }),
      ),
    ).toBe('a'.repeat(64));
    expect(
      cookieToken(
        new Request('http://localhost', { headers: { cookie: 'rtsm_staff_session=broken' } }),
      ),
    ).toBeUndefined();
  });
});

describe('four-table managed authentication boundary', () => {
  it('ignores legacy session cookies without accessing removed auth tables', async () => {
    vi.stubEnv('RTSM_AUTH_MODE', 'managed');
    const { requestCode, verifyCode, readSession, revokeSession } =
      await import('../src/server/auth/session.mjs');
    const db = { query: vi.fn(), connect: vi.fn() };
    await expect(requestCode(db, { email: 'staff@morettiforni.com' })).rejects.toMatchObject({
      status: 503,
    });
    await expect(verifyCode(db, {})).rejects.toMatchObject({ status: 503 });
    const request = new Request('http://localhost', {
      headers: { cookie: `rtsm_staff_session=${'a'.repeat(64)}` },
    });
    expect(await readSession(db, request)).toBeUndefined();
    await revokeSession(db, request);
    expect(db.query).not.toHaveBeenCalled();
    expect(db.connect).not.toHaveBeenCalled();
  });
});
