import React, { useState } from 'react';

interface LoginFormProps {
  nextPath?: string;
}

export default function LoginForm({ nextPath = '/' }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          next: nextPath,
        }),
      });

      const data = await response.json().catch(() => ({} as { error?: string; redirectTo?: string }));

      if (response.ok) {
        window.location.assign(data.redirectTo || nextPath || '/');
        return;
      } else {
        setError(data.error || '登录失败');
      }
    } catch (error) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <div className="relative overflow-hidden rounded-[34px] border border-[var(--line)] bg-[rgba(31,22,12,0.93)] px-6 py-8 text-[var(--paper)] shadow-[0_34px_80px_rgba(20,14,8,0.26)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-10 top-10 h-36 w-36 rounded-full border border-[rgba(244,236,223,0.12)] bg-[radial-gradient(circle,_rgba(224,187,134,0.24),_transparent_70%)]" />
        <p className="text-[11px] uppercase tracking-[0.4em] text-[rgba(244,236,223,0.62)]">
          Secure Entry
        </p>
        <h2 className="mt-5 font-display text-5xl leading-[0.96] text-[var(--paper)] sm:text-6xl">
          进入你的图像档案室
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[rgba(244,236,223,0.78)] sm:text-base">
          登录后可以上传、压缩预览、浏览全部已存在对象，并在图库中做批量整理。
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[22px] border border-[rgba(244,236,223,0.12)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(244,236,223,0.56)]">Session</p>
            <p className="mt-3 font-display text-3xl">Signed</p>
            <p className="mt-2 text-sm leading-6 text-[rgba(244,236,223,0.74)]">
              使用签名 cookie 校验，不再依赖“只要有 token 就算登录”。
            </p>
          </div>
          <div className="rounded-[22px] border border-[rgba(244,236,223,0.12)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(244,236,223,0.56)]">Archive</p>
            <p className="mt-3 font-display text-3xl">All View</p>
            <p className="mt-2 text-sm leading-6 text-[rgba(244,236,223,0.74)]">
              图库支持完整拉取现有内容，适合盘点和全量浏览。
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[34px] border border-[var(--line)] bg-[rgba(255,250,242,0.84)] p-6 shadow-[var(--shadow-soft)] backdrop-blur sm:p-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--muted)]">Operator Login</p>
          <h3 className="mt-4 font-display text-4xl text-[var(--ink)]">管理员登录</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
            输入管理员密码以进入上传与图库工作区。
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="block w-full rounded-[20px] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] px-4 py-4 text-[15px] text-[var(--ink)] outline-none transition-all duration-300 placeholder:text-[var(--muted-soft)] focus:border-[var(--accent)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(178,98,45,0.1)]"
              placeholder="输入管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error ? (
            <div className="rounded-[18px] border border-[rgba(138,47,47,0.18)] bg-[rgba(255,244,242,0.95)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-[var(--ink)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--paper)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '登录中...' : '进入工作台'}
          </button>
        </form>

        <div className="mt-6 rounded-[20px] border border-[var(--line)] bg-white/70 p-4 text-sm leading-7 text-[var(--muted)]">
          登录后会优先回到你原本想进入的页面。
        </div>
      </div>
    </div>
  );
}
