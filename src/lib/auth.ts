import type { APIContext } from 'astro';
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'auth-token';
export const SESSION_DURATION_SECONDS = 24 * 60 * 60;

interface SessionPayload {
  exp: number;
}

function getEnvValue(key: string): string | undefined {
  return import.meta.env[key] || process.env[key];
}

export function getAdminPassword(): string {
  const adminPassword = getEnvValue('ADMIN_PASSWORD');

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }

  return adminPassword;
}

export function getSessionSecret(): string {
  const sessionSecret = getEnvValue('SESSION_SECRET');

  if (sessionSecret) {
    return sessionSecret;
  }

  if (import.meta.env.PROD) {
    throw new Error('SESSION_SECRET is required in production');
  }

  return `dev-session-secret:${getEnvValue('ADMIN_PASSWORD') || 'astro-r2'}`;
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(payload: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

function signPayload(payload: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('base64url');
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken(
  expiresAt: number = Date.now() + SESSION_DURATION_SECONDS * 1000
): string {
  const payload = encodePayload({ exp: expiresAt });
  const signature = signPayload(payload);

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) {
    return false;
  }

  const [payload, signature, ...rest] = token.split('.');
  if (!payload || !signature || rest.length > 0) {
    return false;
  }

  const expectedSignature = signPayload(payload);
  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  const sessionPayload = decodePayload(payload);
  return Boolean(sessionPayload && Number.isFinite(sessionPayload.exp) && sessionPayload.exp > Date.now());
}

export function setSessionCookie(cookies: APIContext['cookies']): void {
  cookies.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie(cookies: APIContext['cookies']): void {
  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
  });
}

export function isAuthenticated(context: Pick<APIContext, 'cookies'>): boolean {
  return verifySessionToken(context.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function requireAuth(context: APIContext): Response | null {
  if (isAuthenticated(context)) {
    return null;
  }

  return new Response(
    JSON.stringify({
      error: 'Authentication required',
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
}

export function sanitizeNextPath(nextPath: string | null | undefined): string {
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return '/';
  }

  return nextPath;
}

export function getLoginPath(url: URL): string {
  const nextPath = sanitizeNextPath(`${url.pathname}${url.search}`);
  return nextPath === '/' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;
}
