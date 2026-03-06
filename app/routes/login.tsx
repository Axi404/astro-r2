import { redirect } from 'react-router';

import type { Route } from './+types/login';
import AppShell from '~/components/AppShell';
import LoginForm from '~/components/LoginForm';
import { getSafeNextPath, isAuthenticated } from '~/lib/session.server';

export const meta: Route.MetaFunction = () => [{ title: '登录 - Lightframe Archive' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const nextPath = getSafeNextPath(url.searchParams.get('next'));

  if (await isAuthenticated(request, context)) {
    throw redirect(nextPath);
  }

  return { nextPath };
}

export default function LoginRoute({ loaderData }: Route.ComponentProps) {
  return (
    <AppShell>
      <div className="py-6 sm:py-10">
        <LoginForm nextPath={loaderData.nextPath} />
      </div>
    </AppShell>
  );
}
