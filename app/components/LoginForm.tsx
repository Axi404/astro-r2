import { type FormEvent, useState } from 'react';

interface LoginFormProps {
  nextPath?: string;
}

export default function LoginForm({ nextPath = '/' }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
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
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <p className="eyebrow text-[var(--muted)]">Private Access</p>
        <h2 className="mt-3 font-display text-4xl text-[var(--ink)] sm:text-5xl">管理员登录</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
          输入管理员密码进入上传和图库工作区。
        </p>

        <div className="mt-8 grid gap-3">
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
            单管理员入口，不开放公开注册。
          </div>
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
            登录成功后会优先返回你原本要访问的页面。
          </div>
          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
            说明文档已经移到应用内的 About 页面。
          </div>
        </div>
      </div>

      <div className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow text-[var(--muted)]">Login</p>
            <h3 className="mt-4 font-display text-4xl text-[var(--ink)] sm:text-5xl">进入工作区</h3>
            <p className="mt-3 max-w-lg text-sm leading-7 text-[var(--ink-soft)]">
              输入密码即可进入主界面。
            </p>
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

          <div className="rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--ink-soft)]">
            所有上传、图库和删除接口都会继续检查认证状态。
          </div>
        </div>
      </div>
    </div>
  );
}
