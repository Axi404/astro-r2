import { createCookieSessionStorage, redirect } from 'react-router';

import { getLoginPath, sanitizeNextPath } from './auth';

export const SESSION_COOKIE_NAME = 'auth-token';
export const SESSION_DURATION_SECONDS = 24 * 60 * 60;

type AuthSessionData = {
  authenticated?: boolean;
};

function getAdminPassword(): string {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }

  return process.env.ADMIN_PASSWORD;
}

function createSessionStorage() {
  return createCookieSessionStorage<AuthSessionData>({
    cookie: {
      name: SESSION_COOKIE_NAME,
      httpOnly: true,
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
      sameSite: 'strict',
      secrets: [`admin-password:${getAdminPassword()}`],
      secure: !import.meta.env.DEV,
    },
  });
}

export async function getSession(request: Request) {
  const storage = createSessionStorage();
  return storage.getSession(request.headers.get('Cookie'));
}

export async function commitAuthenticatedSession() {
  const storage = createSessionStorage();
  const session = await storage.getSession();
  session.set('authenticated', true);
  return storage.commitSession(session);
}

export async function destroyAuthenticatedSession(request: Request) {
  const storage = createSessionStorage();
  const session = await storage.getSession(request.headers.get('Cookie'));
  return storage.destroySession(session);
}

export async function isAuthenticated(request: Request) {
  const session = await getSession(request);
  return session.get('authenticated') === true;
}

export async function requireAuthenticatedRequest(request: Request) {
  const authenticated = await isAuthenticated(request);

  if (!authenticated) {
    throw redirect(getLoginPath(new URL(request.url)));
  }
}

export async function ensureAuthenticatedApiRequest(request: Request) {
  const authenticated = await isAuthenticated(request);

  if (authenticated) {
    return null;
  }

  return Response.json(
    { error: 'Authentication required' },
    {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export function verifyPassword(password: string) {
  return password === getAdminPassword();
}

export function getSafeNextPath(value: string | null | undefined) {
  return sanitizeNextPath(value);
}
