import React, { forwardRef, InputHTMLAttributes, useId } from 'react';
import { cn } from '../../utils/formatters';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const id = useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            className={cn(
              `
                w-full rounded-lg border
                bg-white dark:bg-slate-800
                text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-0
              `,
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              'py-2.5',
              error
                ? `
                  border-danger-500 focus:border-danger-500 focus:ring-danger-200
                  dark:border-danger-500 dark:focus:ring-danger-200
                `
                : `
                  border-slate-200 dark:border-slate-600
                  focus:border-primary-500 focus:ring-primary-200
                  dark:focus:border-primary-500 dark:focus:ring-primary-900/20
                `,
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-1 mt-1.5 text-sm text-danger-500">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ==================== TEXTAREA ====================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, disabled, ...props }, ref) => {
    const id = useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          disabled={disabled}
          className={cn(
            `
              w-full rounded-lg border px-4 py-2.5
              bg-white dark:bg-slate-800
              text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-0
              resize-none
            `,
            error
              ? `
                  border-danger-500 focus:border-danger-500 focus:ring-danger-200
                  dark:border-danger-500 dark:focus:ring-danger-200
                `
              : `
                  border-slate-200 dark:border-slate-600
                  focus:border-primary-500 focus:ring-primary-200
                  dark:focus:border-primary-500 dark:focus:ring-primary-900/20
                `,
            disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700',
            className
          )}
          {...props}
        />
        {error && (
          <div className="flex items-center gap-1 mt-1.5 text-sm text-danger-500">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ==================== INPUT GROUP ====================
interface InputGroupProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function InputGroup({ label, children, className }: InputGroupProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

// ==================== INPUT SUFFIX/PREFIX ====================
interface InputWithSuffixProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix: string;
  error?: string;
  helperText?: string;
}

export const InputWithSuffix = forwardRef<HTMLInputElement, InputWithSuffixProps>(
  ({ className, label, suffix, error, helperText, disabled, ...props }, ref) => {
    const id = useId();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              `
                w-full rounded-lg border rounded-r-none
                bg-white dark:bg-slate-800
                text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-0
                pl-4 py-2.5
              `,
              error
                ? `
                    border-danger-500 focus:border-danger-500 focus:ring-danger-200
                    dark:border-danger-500 dark:focus:ring-danger-200
                  `
                : `
                    border-slate-200 dark:border-slate-600
                    focus:border-primary-500 focus:ring-primary-200
                    dark:focus:border-primary-500 dark:focus:ring-primary-900/20
                  `,
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700',
              className
            )}
            {...props}
          />
          <div className="absolute inset-y-0 right-0 px-3 flex items-center bg-slate-100 dark:bg-slate-700 border border-l-0 border-slate-200 dark:border-slate-600 rounded-lg rounded-l-none">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {suffix}
            </span>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-1 mt-1.5 text-sm text-danger-500">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

InputWithSuffix.displayName = 'InputWithSuffix';

export default Input;
export { Textarea };
