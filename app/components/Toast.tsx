import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // 等待淡出动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'border-[rgba(63,122,97,0.35)] bg-[rgba(248,255,251,0.98)] text-[var(--ink)]';
      case 'error':
        return 'border-[rgba(178,79,68,0.38)] bg-[rgba(255,246,242,0.98)] text-[var(--ink)]';
      case 'info':
        return 'border-[rgba(74,119,143,0.36)] bg-[rgba(246,251,255,0.98)] text-[var(--ink)]';
      default:
        return 'border-[rgba(63,122,97,0.35)] bg-[rgba(248,255,251,0.98)] text-[var(--ink)]';
    }
  };

  const getTypeLabel = () => {
    if (type === 'success') {
      return '操作成功';
    }

    if (type === 'error') {
      return '操作失败';
    }

    return '提示';
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full rounded-[16px] border px-5 py-4 shadow-[0_20px_44px_rgba(24,30,24,0.2)] backdrop-blur transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } ${getTypeStyles()}`}
    >
      <div className="flex items-start space-x-3">
        {type === 'success' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(94,125,102,0.14)] text-[var(--success)]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {type === 'error' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(167,96,82,0.14)] text-[var(--danger)]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {type === 'info' && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(86,109,90,0.14)] text-[var(--accent)]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--muted)]">{getTypeLabel()}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{message}</p>
        </div>
      </div>
    </div>
  );
}

// Toast 管理器
export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastManagerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export function ToastManager({ toasts, removeToast }: ToastManagerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-3 px-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-[460px]">
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}
