import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function createSession(): string {
  const payload = JSON.stringify({ exp: Date.now() + MAX_AGE_MS });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const [b64, sig] = token.split('.');
  if (!b64 || !sig) return false;

  const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString());
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function checkPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash || !password) return false;
  return bcrypt.compare(password, hash);
}
