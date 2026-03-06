import { type FormEvent, useState } from 'react';

interface LoginFormProps {
  nextPath?: string;
}

const notes = [
  {
    title: '单入口',
    body: '只保留管理员密码验证，不提供公开注册，也不展示多余入口。',
  },
  {
    title: '回到原处',
    body: '如果你是从受保护页面跳转过来，登录后会优先回到原本的地址。',
  },
  {
    title: '认证继续生效',
    body: '上传、图库、删除和验证接口都会继续检查当前会话状态。',
  },
];

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
      }

      setError(data.error || '登录失败');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="max-w-2xl">
          <p className="eyebrow text-[var(--muted)]">Private Access</p>
          <h2 className="mt-4 font-display text-5xl leading-[0.94] text-[var(--ink)] sm:text-6xl">
            入口收窄，
            <br />
            只留下必要验证。
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
            输入管理员密码后进入工作区。匿名状态不会暴露上传或内容接口，界面也不会保留任何明文密码。
          </p>
        </div>

        <div className="mt-8 border-t border-[var(--line)] pt-4">
          {notes.map((note, index) => (
            <article
              key={note.title}
              className="flex gap-4 border-b border-[var(--line)] py-4 last:border-b-0"
            >
              <span className="page-note-index pt-1">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="font-display text-[1.55rem] text-[var(--ink)]">{note.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{note.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-7">
          <div>
            <div className="status-pill text-[var(--ink-soft)]">Session Gate</div>
            <h3 className="mt-5 font-display text-4xl text-[var(--ink)] sm:text-5xl">进入工作区</h3>
            <p className="mt-3 max-w-lg text-sm leading-8 text-[var(--ink-soft)]">
              输入密码即可继续。登录成功后优先回到你刚才请求的页面。
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
              <div className="rounded-[14px] border border-[rgba(159,97,83,0.2)] bg-[rgba(255,246,242,0.92)] px-4 py-3 text-sm text-[var(--danger)]">
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
            会话建立后，当前浏览器才能读取上传、图库和删除接口。
          </div>
        </div>
      </section>
    </div>
  );
}
