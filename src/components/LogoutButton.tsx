import { useState } from 'react';

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      window.location.assign('/login');
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-full border border-[var(--line)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[var(--ink)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--paper-strong)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? '退出中...' : '退出登录'}
    </button>
  );
}
