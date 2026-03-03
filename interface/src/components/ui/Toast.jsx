import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

const ToastContext = createContext(null);

const variants = {
  success: {
    icon: CheckCircle2,
    className: 'border-success/30 bg-app-elevated text-green-200',
  },
  error: {
    icon: AlertCircle,
    className: 'border-danger/30 bg-app-elevated text-red-200',
  },
  info: {
    icon: Info,
    className: 'border-brand/30 bg-app-elevated text-cyan-200',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message, type = 'info', duration = 2400) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value = useMemo(() => ({
    toast: {
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    },
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((item) => {
            const variant = variants[item.type] || variants.info;
            const Icon = variant.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                className={cn(
                  'pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-elevated',
                  variant.className,
                )}
                role="status"
                aria-live="polite"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.message}</span>
                <button
                  type="button"
                  className="ml-auto text-xs opacity-80 transition-opacity hover:opacity-100"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                >
                  Dismiss
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context.toast;
}

export default ToastProvider;
