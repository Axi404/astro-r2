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
      }

      setError(data.error || '登录失败');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <section className="panel panel-light px-6 py-7 sm:px-7">
        <h2 className="text-lg font-semibold text-[var(--ink)]">管理员登录</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">输入密码后继续</p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-[var(--ink)]">
              密码
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="input-surface block w-full px-4 py-3 text-sm placeholder:text-[var(--muted-soft)]"
              placeholder="请输入管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-[rgba(220,38,38,0.24)] bg-[rgba(254,242,242,0.9)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </section>
    </div>
  );
}
