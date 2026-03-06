import type { Route } from './+types/api.auth.verify';

import { isAuthenticated } from '~/lib/session.server';

export async function loader({ request }: Route.LoaderArgs) {
  const authenticated = await isAuthenticated(request);

  return Response.json(
    { authenticated },
    {
      status: authenticated ? 200 : 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
