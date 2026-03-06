import type { ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+SC:wght@400;500;600;700;800&family=Noto+Serif+SC:wght@500;600;700;900&display=swap',
  },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

export const meta: Route.MetaFunction = () => [
  { title: 'Lightframe Archive' },
  { name: 'description', content: 'A React Router image host built for fast uploads and careful archive work.' },
  { name: 'theme-color', content: '#ede2d3' },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = '应用出错';
  let details = '发生了未预期的错误。';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '页面不存在' : `错误 ${error.status}`;
    details = error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-[920px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="panel panel-light p-8 sm:p-10">
        <p className="eyebrow text-[var(--muted)]">Application Error</p>
        <h1 className="mt-4 font-display text-5xl text-[var(--ink)]">{message}</h1>
        <p className="mt-4 text-base leading-8 text-[var(--ink-soft)]">{details}</p>
        {stack ? (
          <pre className="mt-6 overflow-x-auto rounded-[16px] border border-[var(--line)] bg-[rgba(255,255,255,0.62)] p-4 text-sm text-[var(--ink-soft)]">
            <code>{stack}</code>
          </pre>
        ) : null}
      </div>
    </main>
  );
}
