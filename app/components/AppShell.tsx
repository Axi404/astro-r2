import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import LogoutButton from './LogoutButton';

interface AppShellProps {
  authenticated?: boolean;
  children: ReactNode;
}

function getNavClass(active: boolean) {
  return [
    'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition-colors duration-200',
    active
      ? 'bg-[var(--ink)] text-[var(--paper)]'
      : 'text-[var(--ink-soft)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)]',
  ].join(' ');
}

export default function AppShell({ authenticated = false, children }: AppShellProps) {
  const location = useLocation();
  const currentPath =
    location.pathname === '/gallery' || location.pathname === '/about'
      ? location.pathname
      : '/';

  return (
    <div className="site-shell">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(246,243,237,0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="brand-mark">
              <span className="text-sm font-semibold tracking-[0.2em]">LA</span>
            </Link>
            <div>
              <p className="eyebrow text-[var(--muted)]">Private Image Workspace</p>
              <div>
                <h1 className="mt-1 font-display text-2xl tracking-[0.02em] text-[var(--ink)]">
                  Lightframe Archive
                </h1>
              </div>
            </div>
          </div>

          {authenticated ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <nav className="flex flex-wrap gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1.5">
                <Link to="/" className={getNavClass(currentPath === '/')}>
                  上传
                </Link>
                <Link to="/gallery" className={getNavClass(currentPath === '/gallery')}>
                  图库
                </Link>
                <Link to="/about" className={getNavClass(currentPath === '/about')}>
                  About
                </Link>
              </nav>
              <LogoutButton />
            </div>
          ) : (
            <div className="status-pill border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-[var(--ink-soft)]">
              Private Access
            </div>
          )}
        </div>
      </header>

      <main className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>

      <footer className="border-t border-[var(--line)] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <div>Lightframe Archive</div>
          {authenticated ? (
            <div className="flex flex-wrap gap-4">
              <Link to="/about" className="transition-colors hover:text-[var(--ink)]">
                About
              </Link>
              <span>Vercel + Cloudflare R2</span>
            </div>
          ) : (
            <div>Private workspace</div>
          )}
        </div>
      </footer>
    </div>
  );
}
