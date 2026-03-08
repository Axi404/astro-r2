import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import LogoutButton from './LogoutButton';

interface AppShellProps {
  authenticated?: boolean;
  children: ReactNode;
}

function getNavClass(active: boolean) {
  return [
    'rounded-[12px] border px-4 py-3 text-[13px] font-semibold transition-all duration-200',
    active
      ? 'border-[rgba(34,47,62,0.24)] bg-[linear-gradient(165deg,rgba(255,255,255,0.9),rgba(243,236,225,0.84))] text-[var(--ink)] shadow-[0_10px_22px_rgba(17,27,39,0.1)]'
      : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-[rgba(255,255,255,0.58)] hover:text-[var(--ink)]',
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
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(247,240,231,0.72)] shadow-[0_14px_32px_rgba(24,32,44,0.08)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8">
          <div className="flex items-start gap-4 sm:gap-5">
            <Link to="/" className="brand-mark">
              <span>LF</span>
            </Link>

            <div className="min-w-0">
              <p className="eyebrow text-[var(--muted)]">私有图床工作台</p>
              <h1 className="mt-2 font-display text-[2rem] leading-none text-[var(--ink)] sm:text-[2.3rem]">
                Lightframe Archive
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
                上传、管理和复制链接都在一个界面完成，流程更短，操作更清晰。
              </p>
            </div>
          </div>

          {authenticated ? (
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="hidden items-center gap-3 text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] lg:flex">
                <span className="h-px w-10 bg-[var(--line-strong)]" />
                已登录
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <nav className="flex flex-wrap gap-2 rounded-[16px] border border-[var(--line)] bg-[rgba(249,244,236,0.74)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <Link to="/" className={getNavClass(currentPath === '/')}>
                    上传图片
                  </Link>
                  <Link to="/gallery" className={getNavClass(currentPath === '/gallery')}>
                    图库管理
                  </Link>
                  <Link to="/about" className={getNavClass(currentPath === '/about')}>
                    使用说明
                  </Link>
                </nav>
                <LogoutButton />
              </div>
            </div>
          ) : (
            <div className="status-pill text-[var(--ink-soft)]">未登录</div>
          )}
        </div>
      </header>

      <main className="px-4 pb-20 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>

      <footer className="border-t border-[var(--line)] bg-[linear-gradient(180deg,rgba(250,246,240,0.46),rgba(245,238,230,0.62))]">
        <div className="mx-auto grid max-w-[1180px] gap-4 px-4 py-6 text-sm text-[var(--muted)] sm:px-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:px-8">
          <div className="flex items-center gap-3 text-[var(--ink-soft)]">
            <span className="h-px w-8 bg-[var(--accent)]" />
            <span className="font-medium">Lightframe Archive</span>
          </div>

          <p className="max-w-2xl leading-7">
            私有图片托管后台，支持上传、归档、复制链接和安全访问控制。
          </p>

          {authenticated ? (
            <Link to="/about" className="justify-self-start transition-colors hover:text-[var(--ink)] lg:justify-self-end">
              查看帮助
            </Link>
          ) : (
            <div className="justify-self-start lg:justify-self-end">仅限授权访问</div>
          )}
        </div>
      </footer>
    </div>
  );
}
