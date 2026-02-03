import React, { forwardRef, useId, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../utils/formatters';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      value,
      defaultValue,
      onChange,
      options,
      placeholder = 'Seleccionar...',
      error,
      helperText,
      disabled = false,
      required = false,
      className,
    },
    ref
  ) => {
    const id = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Actualizar estado cuando cambia la prop value
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;
      setSelectedValue(option.value);
      onChange?.(option.value);
      setIsOpen(false);
    };

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5',
              disabled && 'opacity-50'
            )}
          >
            {label}
            {required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            ref={ref}
            id={id}
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={cn(
              `
                w-full rounded-lg border bg-white dark:bg-slate-800
                text-left text-slate-900 dark:text-white
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-0
                py-2.5 pl-4 pr-10
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
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700'
            )}
          >
            <span className={cn(!selectedValue && 'text-slate-400 dark:text-slate-500')}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </span>
          </button>

          {/* Dropdown */}
          {isOpen && !disabled && (
            <div className="absolute z-50 w-full mt-2">
              <div
                className={cn(
                  `
                    bg-white dark:bg-slate-800
                    rounded-xl shadow-xl border border-slate-200 dark:border-slate-700
                    max-h-60 overflow-auto
                    animate-slide-down
                  `
                )}
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    className={cn(
                      `
                        w-full px-4 py-2.5 text-left text-sm
                        transition-colors duration-150
                        flex items-center justify-between gap-2
                      `,
                      option.disabled
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : option.value === selectedValue
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    )}
                  >
                    <span>{option.label}</span>
                    {option.value === selectedValue && (
                      <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-1 mt-1.5 text-sm text-danger-500">
            <X className="w-4 h-4" />
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

Select.displayName = 'Select';

// ==================== MULTISELECT ====================
interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const MultiSelect = forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      label,
      values,
      onChange,
      options,
      placeholder = 'Seleccionar...',
      error,
      disabled = false,
      className,
    },
    ref
  ) => {
    const id = useId();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOptions = options.filter((opt) => values.includes(opt.value));

    const toggleOption = (optionValue: string) => {
      if (values.includes(optionValue)) {
        onChange(values.filter((v) => v !== optionValue));
      } else {
        onChange([...values, optionValue]);
      }
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className={cn('w-full', className)}>
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
        <div className="relative" ref={dropdownRef}>
          <button
            ref={ref}
            id={id}
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={cn(
              `
                w-full rounded-lg border bg-white dark:bg-slate-800
                text-left text-slate-900 dark:text-white
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-0
                py-2 pl-4 pr-10 min-h-[42px]
                flex flex-wrap gap-1.5
              `,
              error
                ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-200'
                : 'border-slate-200 dark:border-slate-600 focus:border-primary-500 focus:ring-primary-200',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-700'
            )}
          >
            {selectedOptions.length === 0 ? (
              <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm"
                >
                  {opt.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(opt.value);
                    }}
                    className="hover:text-primary-900 dark:hover:text-primary-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
            <span className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </span>
          </button>

          {isOpen && !disabled && (
            <div className="absolute z-50 w-full mt-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-auto">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors',
                      option.disabled
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : values.includes(option.value)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center',
                        values.includes(option.value)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-slate-300 dark:border-slate-600'
                      )}
                    >
                      {values.includes(option.value) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-danger-500">{error}</p>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';

export default Select;
