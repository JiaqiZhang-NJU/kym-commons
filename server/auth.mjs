import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';

export function hashToken(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function constantEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createPasswordHash(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Administrator password must contain at least 12 characters.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

export function loadPasswordVerifier(passwordFile) {
  if (!passwordFile) throw new Error('KYM_ADMIN_PASSWORD_FILE is required.');
  const metadata = fs.statSync(passwordFile);
  if (!metadata.isFile()) throw new Error('Administrator password file must be a regular file.');
  if (process.platform !== 'win32' && (metadata.mode & 0o077)) throw new Error('Administrator password file must be private (chmod 600).');
  const encoded = fs.readFileSync(passwordFile, 'utf8').trim();
  if (!encoded || encoded.length > 4096) throw new Error('Administrator password file is invalid.');
  if (encoded.startsWith('scrypt$')) {
    const [, salt, expected, extra] = encoded.split('$');
    if (extra || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(expected ?? '')) throw new Error('Invalid scrypt password file.');
    return (password) => typeof password === 'string' && password.length <= 1024 && constantEqual(scryptSync(password, salt, 64).toString('hex'), expected);
  }
  if (encoded.length < 12) throw new Error('Administrator bootstrap password must contain at least 12 characters.');
  const expected = hashToken(encoded);
  return (password) => typeof password === 'string' && password.length <= 1024 && constantEqual(hashToken(password), expected);
}

export function createAuth({ passwordFile, verifyPassword, secure = true, cookiePath = '/', sessionMs = 8 * 60 * 60 * 1000 } = {}) {
  const verify = verifyPassword ?? loadPasswordVerifier(passwordFile);
  const sessions = new Map();
  const cookieName = 'kym_admin';
  function cookie(value, maxAge) {
    return `${cookieName}=${value}; Path=${cookiePath}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  }
  function getSession(request) {
    const token = String(request.headers.cookie ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const session = sessions.get(hashToken(token ?? ''));
    if (!session) return null;
    if (session.expiresAt <= Date.now()) { sessions.delete(hashToken(token)); return null; }
    return { ...session, token };
  }
  return {
    getSession,
    login(password) {
      if (!verify(password)) return null;
      for (const [key, session] of sessions) if (session.expiresAt <= Date.now()) sessions.delete(key);
      const token = randomBytes(32).toString('base64url');
      const session = { csrfToken: randomBytes(24).toString('base64url'), expiresAt: Date.now() + sessionMs };
      sessions.set(hashToken(token), session);
      return { ...session, cookie: cookie(token, Math.floor(sessionMs / 1000)) };
    },
    logout(request) {
      const session = getSession(request);
      if (session) sessions.delete(hashToken(session.token));
      return cookie('', 0);
    },
    acceptsMutation(request, session, origin) {
      const providedOrigin = request.headers.origin;
      if (providedOrigin) return constantEqual(providedOrigin, origin);
      return Boolean(session && constantEqual(request.headers['x-kym-csrf'] ?? '', session.csrfToken));
    },
  };
}
