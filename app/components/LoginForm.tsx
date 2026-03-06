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
    <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
      <section className="panel panel-light overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-8">
          <div>
            <p className="eyebrow text-[var(--muted)]">Private Access</p>
            <h2 className="mt-4 font-display text-5xl leading-[0.96] text-[var(--ink)] sm:text-6xl">
              入口保持克制，
              <br />
              只留必要验证。
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
              输入管理员密码后进入工作区。整个应用不提供公开注册，也不会在匿名状态下暴露上传和内容接口。
            </p>
          </div>

          <div className="grid gap-3">
            <article className="metric-card p-5 text-sm leading-7 text-[var(--ink-soft)]">
              单管理员入口，适合个人或极小团队的私有使用场景。
            </article>
            <article className="metric-card p-5 text-sm leading-7 text-[var(--ink-soft)]">
              登录成功后优先返回你原本要访问的页面，不打断当前流程。
            </article>
            <article className="metric-card p-5 text-sm leading-7 text-[var(--ink-soft)]">
              上传、图库、删除和验证接口都会继续检查认证状态。
            </article>
          </div>
        </div>
      </section>

      <section className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-7">
          <div>
            <p className="eyebrow text-[var(--muted)]">Login</p>
            <h3 className="mt-4 font-display text-4xl text-[var(--ink)] sm:text-5xl">进入工作区</h3>
            <p className="mt-3 max-w-lg text-sm leading-8 text-[var(--ink-soft)]">
              输入密码即可继续。界面不会保存明文密码，只建立当前会话所需的认证状态。
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="password" className="eyebrow text-[var(--muted)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-surface block w-full px-5 py-4 text-[15px] placeholder:text-[var(--muted-soft)]"
                placeholder="输入管理员密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error ? (
              <div className="rounded-[22px] border border-[rgba(167,96,82,0.2)] bg-[rgba(255,246,242,0.92)] px-4 py-3 text-sm text-[var(--danger)]">
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

          <div className="metric-card p-5 text-sm leading-7 text-[var(--ink-soft)]">
            如果你是从受保护页面跳转过来，登录后会自动回到那个地址。
          </div>
        </div>
      </section>
    </div>
  );
}
