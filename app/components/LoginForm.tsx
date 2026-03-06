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

      const data = (await response
        .json()
        .catch(() => ({}))) as { error?: string; redirectTo?: string };

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
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="panel panel-dark grain relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute right-[-3rem] top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(255,200,137,0.18),_transparent_70%)]" />
        <div className="pointer-events-none absolute bottom-[-4rem] left-[-2rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(241,91,42,0.16),_transparent_72%)]" />

        <p className="eyebrow text-[rgba(240,226,204,0.52)]">Secure Entry</p>
        <h2 className="mt-5 max-w-2xl font-display text-5xl leading-[0.92] text-[var(--paper)] sm:text-6xl lg:text-7xl">
          进入你的影像
          <span className="text-[var(--accent-soft)]">控制台</span>
        </h2>
        <p className="mt-6 max-w-xl text-sm leading-8 text-[rgba(240,226,204,0.78)] sm:text-base">
          登录之后即可上传、预览压缩效果、浏览全部对象，并在图库里完成复制和批量清理。
          入口保持简单，但后面的工作流是完整的。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--line-inverse)] bg-[rgba(255,255,255,0.04)] p-5">
            <p className="eyebrow text-[rgba(240,226,204,0.48)]">Signed Cookie</p>
            <p className="mt-4 font-display text-4xl text-[var(--paper)]">Verified</p>
            <p className="mt-3 text-sm leading-7 text-[rgba(240,226,204,0.74)]">
              会话使用签名 cookie 校验，请求接口时会持续验证登录状态。
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--line-inverse)] bg-[rgba(255,255,255,0.04)] p-5">
            <p className="eyebrow text-[rgba(240,226,204,0.48)]">Archive Tools</p>
            <p className="mt-4 font-display text-4xl text-[var(--paper)]">Full Sweep</p>
            <p className="mt-3 text-sm leading-7 text-[rgba(240,226,204,0.74)]">
              图库支持分页和全量两种读取方式，适合日常处理也适合盘库。
            </p>
          </div>
        </div>
      </div>

      <div className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow text-[var(--muted)]">Operator Login</p>
            <h3 className="mt-4 font-display text-4xl text-[var(--ink)] sm:text-5xl">管理员登录</h3>
            <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--ink-soft)]">
              输入管理员密码后进入上传与图库工作区。登录成功会优先返回你原本要访问的页面。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="metric-card p-4">
              <p className="eyebrow text-[var(--muted)]">Uploads</p>
              <p className="mt-3 font-display text-3xl text-[var(--ink)]">Paste</p>
            </div>
            <div className="metric-card p-4">
              <p className="eyebrow text-[var(--muted)]">Preview</p>
              <p className="mt-3 font-display text-3xl text-[var(--accent)]">WebP</p>
            </div>
            <div className="metric-card p-4">
              <p className="eyebrow text-[var(--muted)]">Library</p>
              <p className="mt-3 font-display text-3xl text-[var(--ink)]">Batch</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="password" className="eyebrow text-[var(--muted)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-surface block w-full px-4 py-4 text-[15px] placeholder:text-[var(--muted-soft)]"
                placeholder="输入管理员密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error ? (
              <div className="rounded-[20px] border border-[rgba(207,80,58,0.18)] bg-[rgba(255,244,240,0.92)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '登录中...' : '进入工作台'}
            </button>
          </form>

          <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(255,255,255,0.62)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            这是单管理员入口，不做公开注册。登录后的所有上传、图库和删除接口都会继续检查认证状态。
          </div>
        </div>
      </div>
    </div>
  );
}
