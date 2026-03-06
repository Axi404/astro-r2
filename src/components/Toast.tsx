import { useEffect, useState } from 'react';

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
        return 'border-[rgba(39,100,90,0.24)] bg-[rgba(248,253,250,0.95)] text-[var(--ink)]';
      case 'error':
        return 'border-[rgba(138,47,47,0.22)] bg-[rgba(255,246,245,0.96)] text-[var(--ink)]';
      case 'info':
        return 'border-[rgba(178,98,45,0.24)] bg-[rgba(255,250,244,0.96)] text-[var(--ink)]';
      default:
        return 'border-[rgba(39,100,90,0.24)] bg-[rgba(248,253,250,0.95)] text-[var(--ink)]';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 min-w-[280px] rounded-[22px] border px-5 py-4 shadow-[0_24px_60px_rgba(33,25,16,0.18)] backdrop-blur transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      } ${getTypeStyles()}`}
    >
      <div className="flex items-center space-x-3">
        {type === 'success' && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(39,100,90,0.12)] text-[var(--success)]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {type === 'error' && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(138,47,47,0.1)] text-[var(--danger)]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        {type === 'info' && (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(178,98,45,0.11)] text-[var(--accent)]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <span className="text-sm font-medium leading-6">{message}</span>
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
  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ top: `${1.4 + index * 5}rem` }}
          className="fixed right-4 z-50"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
}
