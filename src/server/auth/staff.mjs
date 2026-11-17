import { timingSafeEqual } from 'node:crypto';

export function isStaff(authorization, token) {
  if (process.env.NODE_ENV === 'production') return false;
  if (!token || !authorization?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
