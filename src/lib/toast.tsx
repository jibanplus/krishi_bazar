import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; message: string; emoji: string };

const ToastContext = createContext<{ show: (type: ToastType, message: string, emoji?: string) => void }>({
  show: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: ToastType, message: string, emoji = '') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message, emoji }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed inset-x-0 top-[60%] z-[99] flex flex-col items-center space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`float-up flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg max-w-sm pointer-events-auto ${
              t.type === 'success'
                ? 'bg-emerald/20 border border-emerald/40 backdrop-blur'
                : t.type === 'error'
                ? 'bg-crimson/20 border border-crimson/40 backdrop-blur'
                : 'bg-ink-700/80 border border-ink-600 backdrop-blur'
            }`}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span
              className={`text-sm font-medium ${
                t.type === 'success'
                  ? 'text-emerald-light'
                  : t.type === 'error'
                  ? 'text-crimson-light'
                  : 'text-ink-100'
              }`}
            >
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
