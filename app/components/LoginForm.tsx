import { type FormEvent, useState } from 'react';

interface LoginFormProps {
  nextPath?: string;
}

const notes = [
  {
    title: '1. 输入管理员密码',
    body: '这是唯一登录入口，不需要注册账号。',
  },
  {
    title: '2. 自动回到刚才页面',
    body: '如果你是从上传页或图库跳转过来，登录后会自动返回。',
  },
  {
    title: '3. 会话全程校验',
    body: '上传、读取和删除接口都会继续检查你的登录状态。',
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
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="max-w-xl">
          <p className="eyebrow text-[var(--muted)]">登录说明</p>
          <h2 className="mt-4 font-display text-5xl leading-[0.94] text-[var(--ink)] sm:text-6xl">
            先登录，
            <br />
            再进入工作区。
          </h2>
          <p className="mt-5 text-sm leading-8 text-[var(--ink-soft)] sm:text-base">
            只需要输入管理员密码即可。登录后会自动跳回你原本访问的页面，继续当前操作。
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          {notes.map((note) => (
            <article key={note.title} className="metric-card p-4">
              <h3 className="text-base font-semibold text-[var(--ink)]">{note.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{note.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel-light px-6 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-lg">
          <div className="status-pill text-[var(--ink-soft)]">安全登录</div>
          <h3 className="mt-5 font-display text-4xl text-[var(--ink)] sm:text-5xl">输入密码继续</h3>
          <p className="mt-3 text-sm leading-8 text-[var(--ink-soft)]">
            登录状态只保存在当前浏览器，会持续保护上传与图库接口。
          </p>

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <label htmlFor="password" className="text-sm font-semibold text-[var(--ink)]">
                管理员密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-surface block w-full px-5 py-4 text-base placeholder:text-[var(--muted-soft)]"
                placeholder="请输入管理员密码"
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
              {loading ? '登录中...' : '进入上传与图库'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
