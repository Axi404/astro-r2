import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import LogoutButton from './LogoutButton';

interface AppShellProps {
  authenticated?: boolean;
  children: ReactNode;
}

function getNavClass(active: boolean) {
  return [
    'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] transition-all duration-300',
    active
      ? 'bg-[var(--accent)] text-[var(--night)] shadow-[0_18px_32px_rgba(241,91,42,0.28)]'
      : 'text-[rgba(240,226,204,0.72)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--paper)]',
  ].join(' ');
}

export default function AppShell({ authenticated = false, children }: AppShellProps) {
  const location = useLocation();
  const currentPath = location.pathname === '/gallery' ? '/gallery' : '/';

  return (
    <div className="site-shell">
      <div className="site-glow site-glow-a"></div>
      <div className="site-glow site-glow-b"></div>
      <div className="site-grid"></div>

      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="shell-bar mx-auto max-w-[1280px] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="brand-mark">
                <span className="text-lg font-semibold tracking-[0.24em]">R2</span>
              </div>
              <div>
                <p className="eyebrow text-[rgba(240,226,204,0.5)]">Contact Sheet Control Deck</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl tracking-[0.03em] text-[var(--paper)] sm:text-3xl">
                    Lightframe Archive
                  </h1>
                  <span className="status-pill bg-[rgba(255,255,255,0.08)] text-[rgba(240,226,204,0.72)]">
                    Upload + Library
                  </span>
                </div>
              </div>
            </div>

            {authenticated ? (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <nav className="flex flex-wrap gap-2 rounded-full border border-[rgba(255,232,198,0.12)] bg-[rgba(255,255,255,0.04)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <Link to="/" className={getNavClass(currentPath === '/')}>
                    上传工作台
                  </Link>
                  <Link to="/gallery" className={getNavClass(currentPath === '/gallery')}>
                    内容档案
                  </Link>
                </nav>
                <LogoutButton />
              </div>
            ) : (
              <div className="status-pill border border-[rgba(255,232,198,0.12)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-[rgba(240,226,204,0.7)]">
                Secure Session
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>

      <footer className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="shell-footer mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl tracking-[0.04em] text-[var(--paper)]">
              Built for fast image dispatch and careful archive work
            </p>
            <p className="text-sm text-[rgba(240,226,204,0.58)]">
              React Router + Cloudflare Workers + R2 object storage
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.28em] text-[rgba(240,226,204,0.44)]">
            Paste. Review. Ship.
          </div>
        </div>
      </footer>
    </div>
  );
}
