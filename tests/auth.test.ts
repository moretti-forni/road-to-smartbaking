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
