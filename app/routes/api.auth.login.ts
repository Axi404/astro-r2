import type { Route } from './+types/api.auth.login';

import { commitAuthenticatedSession, getSafeNextPath, verifyPassword } from '~/lib/session.server';

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { password?: unknown; next?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    const nextPath = getSafeNextPath(typeof body.next === 'string' ? body.next : null);

    if (!password.trim()) {
      return Response.json(
        { error: 'Password is required' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    if (!verifyPassword(password)) {
      return Response.json(
        { error: 'Invalid password' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    const cookie = await commitAuthenticatedSession();

    return Response.json(
      {
        success: true,
        redirectTo: nextPath,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Set-Cookie': cookie,
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
