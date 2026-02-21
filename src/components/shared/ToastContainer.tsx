import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils/formatters';

export function ToastContainer() {
  const { toasts, toasts: allToasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {allToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  };
}

function ToastItem({ toast }: ToastItemProps) {
  const { removeToast } = useApp();

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-500 dark:text-emerald-400',
      title: 'text-emerald-800 dark:text-emerald-300',
      message: 'text-emerald-600 dark:text-emerald-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-500 dark:text-red-400',
      title: 'text-red-800 dark:text-red-300',
      message: 'text-red-600 dark:text-red-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      icon: 'text-amber-500 dark:text-amber-400',
      title: 'text-amber-800 dark:text-amber-300',
      message: 'text-amber-600 dark:text-amber-400',
    },
    info: {
      bg: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800',
      icon: 'text-sky-500 dark:text-sky-400',
      title: 'text-sky-800 dark:text-sky-300',
      message: 'text-sky-600 dark:text-sky-400',
    },
  };

  const Icon = icons[toast.type];
  const colorTheme = colors[toast.type];

  return (
    <div
      className={cn(
        `
          pointer-events-auto
          flex items-start gap-3
          w-80 p-4 rounded-xl border shadow-lg
          animate-slide-up
        `,
        colorTheme.bg
      )}
      role="alert"
    >
      <div className={cn('flex-shrink-0', colorTheme.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', colorTheme.title)}>
          {toast.title}
        </p>
        {toast.message && (
          <p className={cn('mt-0.5 text-sm', colorTheme.message)}>
            {toast.message}
          </p>
        )}
      </div>
      
      <button
        onClick={() => removeToast(toast.id)}
        className={cn(
          'flex-shrink-0 p-1 rounded-lg transition-colors',
          colorTheme.icon,
          'hover:bg-white/50 dark:hover:bg-black/20'
        )}
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastContainer;
