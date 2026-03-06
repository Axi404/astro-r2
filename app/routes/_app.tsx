import { Outlet } from 'react-router';

import type { Route } from './+types/_app';
import AppShell from '~/components/AppShell';
import { requireAuthenticatedRequest } from '~/lib/session.server';

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuthenticatedRequest(request);
  return null;
}

export default function ProtectedAppLayout() {
  return (
    <AppShell authenticated>
      <Outlet />
    </AppShell>
  );
}
