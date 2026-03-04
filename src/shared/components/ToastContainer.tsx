import React from 'react';
import { useApp } from '@/core/store/AppContext';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export function ToastContainer() {
  const { toasts, toasts: allToasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 pointer-events-none w-80">
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
      bg: 'bg-background border-success',
      icon: 'text-success',
      title: 'text-success',
      message: 'text-success',
    },
    error: {
      bg: 'bg-background border-destructive',
      icon: 'text-destructive',
      title: 'text-destructive',
      message: 'text-destructive',
    },
    warning: {
      bg: 'bg-background border-warning',
      icon: 'text-warning',
      title: 'text-warning',
      message: 'text-warning',
    },
    info: {
      bg: 'bg-background border-border',
      icon: 'text-foreground',
      title: 'text-foreground',
      message: 'text-muted-foreground',
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
          w-80 p-4 rounded-lg border
          animate-slide-down
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
          'hover:bg-muted'
        )}
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ToastContainer;
