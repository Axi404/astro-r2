import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import LogoutButton from './LogoutButton';

interface AppShellProps {
  authenticated?: boolean;
  children: ReactNode;
}

function getNavClass(active: boolean) {
  return [
    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'border-[var(--line-strong)] bg-white text-[var(--ink)]'
      : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-white hover:text-[var(--ink)]',
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
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-bold tracking-[0.08em] text-[var(--ink)]">
              LF
            </span>
            <span className="text-sm font-semibold text-[var(--ink)]">Lightframe</span>
          </Link>

          {authenticated ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
                <Link to="/" className={getNavClass(currentPath === '/')}>
                  上传
                </Link>
                <Link to="/gallery" className={getNavClass(currentPath === '/gallery')}>
                  图库
                </Link>
                <Link to="/about" className={getNavClass(currentPath === '/about')}>
                  说明
                </Link>
              </nav>
              <LogoutButton />
            </div>
          ) : (
            <span className="text-sm text-[var(--muted)]">未登录</span>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
