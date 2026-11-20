// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import {
  hashPassword,
  checkPassword,
  passwordLogin,
  staffAccounts,
} from '../src/server/auth/password.mjs';
import { readSession } from '../src/server/auth/session.mjs';
afterEach(() => vi.unstubAllEnvs());
it('uses unique salted password hashes and checks the password', async () => {
  const first = await hashPassword('test-password-with-length');
  const second = await hashPassword('test-password-with-length');
  expect(first).not.toBe(second);
  expect(first).not.toContain('test-password');
  expect(await checkPassword('test-password-with-length', first)).toBe(true);
  expect(await checkPassword('incorrect-password', first)).toBe(false);
});
it('requires strong passwords at setup and bounded login input', async () => {
  await expect(hashPassword('short')).rejects.toThrow();
  await expect(hashPassword('a'.repeat(129))).rejects.toThrow();
});
it('fails closed before connecting when passwords are unconfigured', async () => {
  vi.stubEnv('RTSM_AUTH_MODE', 'password');
  vi.stubEnv('RTSM_STAFF_PASSWORD_HASHES', '{}');
  const db = { connect: vi.fn() };
  await expect(
    passwordLogin(db, { email: staffAccounts[0], password: 'test-password' }),
  ).rejects.toMatchObject({ status: 503 });
  expect(db.connect).not.toHaveBeenCalled();
});
it('rejects sessions outside the two approved accounts in password mode', async () => {
  vi.stubEnv('RTSM_AUTH_MODE', 'password');
  const db = { query: vi.fn().mockResolvedValue({ rows: [{ email: 'other@morettiforni.com' }] }) };
  const request = new Request('https://app.test', {
    headers: { cookie: `rtsm_staff_session=${'a'.repeat(64)}` },
  });
  expect(await readSession(db, request)).toBeUndefined();
  expect(staffAccounts).toEqual(['noreply-app@morettiforni.com', 'app@morettiforni.com']);
});
