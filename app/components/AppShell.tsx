import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import LogoutButton from './LogoutButton';

interface AppShellProps {
  authenticated?: boolean;
  children: ReactNode;
}

function getNavClass(active: boolean) {
  return [
    'rounded-[12px] border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-200',
    active
      ? 'border-[var(--line-strong)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-[0_8px_18px_rgba(24,28,24,0.06)]'
      : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-[rgba(255,255,255,0.52)] hover:text-[var(--ink)]',
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
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(246,241,232,0.9)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8">
          <div className="flex items-start gap-4 sm:gap-5">
            <Link to="/" className="brand-mark">
              <span>LF</span>
            </Link>

            <div className="min-w-0">
              <p className="eyebrow text-[var(--muted)]">Quiet Image Archive</p>
              <h1 className="mt-2 font-display text-[2rem] leading-none text-[var(--ink)] sm:text-[2.45rem]">
                Lightframe Archive
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                上传、整理与私有归档放在同一张更安静的工作台上。
              </p>
            </div>
          </div>

          {authenticated ? (
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="hidden items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)] lg:flex">
                <span className="h-px w-10 bg-[var(--line-strong)]" />
                private workspace
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <nav className="flex flex-wrap gap-2 rounded-[16px] border border-[var(--line)] bg-[rgba(249,246,240,0.82)] p-1.5">
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
            <div className="status-pill text-[var(--ink-soft)]">Private Access</div>
          )}
        </div>
      </header>

      <main className="px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>

      <footer className="border-t border-[var(--line)] bg-[rgba(250,247,241,0.42)]">
        <div className="mx-auto grid max-w-[1180px] gap-4 px-4 py-6 text-sm text-[var(--muted)] sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:px-8">
          <div className="flex items-center gap-3 text-[var(--ink-soft)]">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span className="font-medium">Lightframe Archive</span>
          </div>

          <p className="max-w-2xl leading-7">
            一套偏向秩序与留白的私有图床界面，运行在 Vercel 与 Cloudflare R2 上。
          </p>

          {authenticated ? (
            <Link to="/about" className="justify-self-start transition-colors hover:text-[var(--ink)] lg:justify-self-end">
              查看说明
            </Link>
          ) : (
            <div className="justify-self-start lg:justify-self-end">Private workspace</div>
          )}
        </div>
      </footer>
    </div>
  );
}
