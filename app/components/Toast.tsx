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
        return 'border-[rgba(5,150,105,0.3)] bg-[rgba(236,253,245,0.96)] text-[var(--ink)]';
      case 'error':
        return 'border-[rgba(220,38,38,0.3)] bg-[rgba(254,242,242,0.96)] text-[var(--ink)]';
      case 'info':
        return 'border-[rgba(59,130,246,0.28)] bg-[rgba(239,246,255,0.96)] text-[var(--ink)]';
      default:
        return 'border-[rgba(5,150,105,0.3)] bg-[rgba(236,253,245,0.96)] text-[var(--ink)]';
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium shadow-[0_10px_28px_rgba(15,23,42,0.14)] backdrop-blur transition-all duration-200 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      } ${getTypeStyles()}`}
    >
      <p className="truncate leading-6">{message}</p>
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
