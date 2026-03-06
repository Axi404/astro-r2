import { createCookieSessionStorage, redirect } from 'react-router';

import { getLoginPath, sanitizeNextPath } from './auth';

export const SESSION_COOKIE_NAME = 'auth-token';
export const SESSION_DURATION_SECONDS = 24 * 60 * 60;

type AuthSessionData = {
  authenticated?: boolean;
};

function getAdminPassword(env: Env): string {
  if (!env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }

  return env.ADMIN_PASSWORD;
}

function createSessionStorage(env: Env) {
  return createCookieSessionStorage<AuthSessionData>({
    cookie: {
      name: SESSION_COOKIE_NAME,
      httpOnly: true,
      maxAge: SESSION_DURATION_SECONDS,
      path: '/',
      sameSite: 'strict',
      secrets: [`admin-password:${getAdminPassword(env)}`],
      secure: !import.meta.env.DEV,
    },
  });
}

export async function getSession(request: Request, context: { cloudflare: { env: Env } }) {
  const storage = createSessionStorage(context.cloudflare.env);
  return storage.getSession(request.headers.get('Cookie'));
}

export async function commitAuthenticatedSession(context: { cloudflare: { env: Env } }) {
  const storage = createSessionStorage(context.cloudflare.env);
  const session = await storage.getSession();
  session.set('authenticated', true);
  return storage.commitSession(session);
}

export async function destroyAuthenticatedSession(
  request: Request,
  context: { cloudflare: { env: Env } }
) {
  const storage = createSessionStorage(context.cloudflare.env);
  const session = await storage.getSession(request.headers.get('Cookie'));
  return storage.destroySession(session);
}

export async function isAuthenticated(
  request: Request,
  context: { cloudflare: { env: Env } }
) {
  const session = await getSession(request, context);
  return session.get('authenticated') === true;
}

export async function requireAuthenticatedRequest(
  request: Request,
  context: { cloudflare: { env: Env } }
) {
  const authenticated = await isAuthenticated(request, context);

  if (!authenticated) {
    throw redirect(getLoginPath(new URL(request.url)));
  }
}

export async function ensureAuthenticatedApiRequest(
  request: Request,
  context: { cloudflare: { env: Env } }
) {
  const authenticated = await isAuthenticated(request, context);

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

export function verifyPassword(password: string, context: { cloudflare: { env: Env } }) {
  return password === getAdminPassword(context.cloudflare.env);
}

export function getSafeNextPath(value: string | null | undefined) {
  return sanitizeNextPath(value);
}
