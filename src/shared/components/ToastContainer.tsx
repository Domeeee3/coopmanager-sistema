import React, { useEffect, useState } from 'react';
import { Alert } from '@heroui/react';
import { useApp } from '@/core/store/AppContext';

type Toast = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
};

type RenderedToast = Toast & { isLeaving: boolean };

const TOAST_EXIT_DURATION = 240;

export function ToastContainer() {
  const { toasts } = useApp();
  const [renderedToasts, setRenderedToasts] = useState<RenderedToast[]>([]);

  useEffect(() => {
    const activeToastIds = new Set(toasts.map((toast) => toast.id));

    setRenderedToasts((current) => {
      const currentById = new Map(current.map((toast) => [toast.id, toast]));
      const next = current.map((toast) => {
        const activeToast = toasts.find((item) => item.id === toast.id);

        return activeToast
          ? { ...activeToast, isLeaving: false }
          : { ...toast, isLeaving: !activeToastIds.has(toast.id) };
      });

      toasts.forEach((toast) => {
        if (!currentById.has(toast.id)) {
          next.push({ ...toast, isLeaving: false });
        }
      });

      return next;
    });
  }, [toasts]);

  useEffect(() => {
    const leavingToastIds = renderedToasts
      .filter((toast) => toast.isLeaving)
      .map((toast) => toast.id);

    if (leavingToastIds.length === 0) return;

    const timeout = window.setTimeout(() => {
      setRenderedToasts((current) => current.filter((toast) => !leavingToastIds.includes(toast.id)));
    }, TOAST_EXIT_DURATION);

    return () => window.clearTimeout(timeout);
  }, [renderedToasts]);

  if (renderedToasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-[1000] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 space-y-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {renderedToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: RenderedToast;
}

function ToastItem({ toast }: ToastItemProps) {
  const status = {
    success: 'success',
    error: 'danger',
    warning: 'warning',
    info: 'accent',
  } as const;

  return (
    <Alert
      status={status[toast.type]}
      role="alert"
      className={`pointer-events-auto w-full rounded-[var(--radius)] border border-border bg-overlay text-foreground shadow-[var(--overlay-shadow)] ${toast.isLeaving ? 'animate-toast-exit-up' : 'animate-toast-enter-down'}`}
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{toast.title}</Alert.Title>
        {toast.message ? <Alert.Description className="mt-1 block text-muted-foreground">{toast.message}</Alert.Description> : null}
      </Alert.Content>
    </Alert>
  );
}

export default ToastContainer;
