import type { Route } from './+types/api.auth.logout';

import { destroyAuthenticatedSession } from '~/lib/session.server';

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const cookie = await destroyAuthenticatedSession(request);

  return Response.json(
    {
      success: true,
      redirectTo: '/login',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Set-Cookie': cookie,
      },
    }
  );
}
