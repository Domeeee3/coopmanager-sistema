import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../utils/formatters';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      dot = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center font-medium rounded-full
      transition-all duration-200
    `;

    const variants = {
      default: `
        bg-slate-100 text-slate-700
        dark:bg-slate-700 dark:text-slate-300
      `,
      primary: `
        bg-primary-100 text-primary-700
        dark:bg-primary-900/30 dark:text-primary-400
      `,
      success: `
        bg-emerald-100 text-emerald-700
        dark:bg-emerald-900/30 dark:text-emerald-400
      `,
      warning: `
        bg-amber-100 text-amber-700
        dark:bg-amber-900/30 dark:text-amber-400
      `,
      danger: `
        bg-red-100 text-red-700
        dark:bg-red-900/30 dark:text-red-400
      `,
      info: `
        bg-sky-100 text-sky-700
        dark:bg-sky-900/30 dark:text-sky-400
      `,
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-2.5 py-1 text-sm gap-1.5',
    };

    const dotColors = {
      default: 'bg-slate-400',
      primary: 'bg-primary-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
      info: 'bg-sky-500',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              dotColors[variant]
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ==================== STATUS BADGE ====================
interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function StatusBadge({ status, size = 'md', dot = true }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    // Member statuses
    active: { label: 'Activo', variant: 'success' },
    inactive: { label: 'Inactivo', variant: 'default' },
    suspended: { label: 'Suspendido', variant: 'warning' },
    // Contribution statuses
    pending: { label: 'Pendiente', variant: 'warning' },
    paid: { label: 'PAGADO', variant: 'success' },
    late: { label: 'Atrasado', variant: 'danger' },
    penalty: { label: 'Con Multa', variant: 'danger' },
    // Loan statuses
    refinanced: { label: 'Refinanciado', variant: 'info' },
    defaulted: { label: 'Moroso', variant: 'danger' },
    cancelled: { label: 'Cancelado', variant: 'default' },
    // Transaction types
    contribution: { label: 'Aporte', variant: 'success' },
    loan_payment: { label: 'Pago Préstamo', variant: 'primary' },
    penalty_fee: { label: 'Multa', variant: 'warning' },
    loan_disbursement: { label: 'Desembolso', variant: 'warning' },
    expense: { label: 'Gasto', variant: 'danger' },
    refund: { label: 'Reintegro', variant: 'info' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' as const };

  return (
    <Badge variant={config.variant} size={size} dot={dot}>
      {config.label}
    </Badge>
  );
}

export default Badge;
