import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/formatters';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-primary-600 text-white
        hover:bg-primary-700 active:bg-primary-800
        focus:ring-primary-500
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-slate-100 text-slate-900
        hover:bg-slate-200 active:bg-slate-300
        focus:ring-slate-500
        dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600
      `,
      outline: `
        border-2 border-primary-600 text-primary-600
        hover:bg-primary-50 active:bg-primary-100
        focus:ring-primary-500
        dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20
      `,
      ghost: `
        text-slate-600 hover:bg-slate-100 active:bg-slate-200
        focus:ring-slate-500
        dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600
      `,
      danger: `
        bg-danger-500 text-white
        hover:bg-danger-600 active:bg-danger-500
        focus:ring-danger-500
        shadow-sm hover:shadow-md
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
