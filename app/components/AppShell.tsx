import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import LogoutButton from './LogoutButton';

interface AppShellProps {
  authenticated?: boolean;
  children: ReactNode;
}

function getNavClass(active: boolean) {
  return [
    'rounded-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.24em] transition-all duration-200',
    active
      ? 'bg-[var(--night)] text-[var(--paper-strong)] shadow-[0_10px_24px_rgba(31,38,34,0.12)]'
      : 'text-[var(--ink-soft)] hover:bg-[rgba(255,255,255,0.8)] hover:text-[var(--ink)]',
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
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(247,244,237,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="brand-mark">
              <span className="text-sm font-semibold tracking-[0.2em]">LA</span>
            </Link>
            <div className="min-w-0">
              <p className="eyebrow text-[var(--muted)]">Quiet Image Archive</p>
              <h1 className="mt-1 font-display text-[1.9rem] tracking-[0.01em] text-[var(--ink)]">
                Lightframe Archive
              </h1>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">
                保持简单的上传、整理与私有归档。
              </p>
            </div>
          </div>

          {authenticated ? (
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="hidden text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--muted)] lg:block">
                private workspace
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <nav className="flex flex-wrap gap-2 rounded-full border border-[var(--line)] bg-[rgba(248,245,239,0.82)] p-1.5">
                  <Link to="/" className={getNavClass(currentPath === '/')}>
                    上传
                  </Link>
                  <Link to="/gallery" className={getNavClass(currentPath === '/gallery')}>
                    图库
                  </Link>
                  <Link to="/about" className={getNavClass(currentPath === '/about')}>
                    关于
                  </Link>
                </nav>
                <LogoutButton />
              </div>
            </div>
          ) : (
            <div className="status-pill px-4 py-2.5 text-[var(--ink-soft)]">
              Private Access
            </div>
          )}
        </div>
      </header>

      <main className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1240px]">{children}</div>
      </main>

      <footer className="border-t border-[var(--line)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[rgba(86,109,90,0.28)]" />
            <span>Lightframe Archive</span>
          </div>
          {authenticated ? (
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/about" className="transition-colors hover:text-[var(--ink)]">
                关于
              </Link>
              <span>Quiet archive on Vercel + Cloudflare R2</span>
            </div>
          ) : (
            <div>Private workspace</div>
          )}
        </div>
      </footer>
    </div>
  );
}
