import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ==================== FORMATEO DE MONEDA ====================
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'es-ES'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(
  amount: number,
  currency: string = 'USD'
): string {
  if (Math.abs(amount) >= 1000000) {
    return `${formatCurrency(amount / 1000000, currency)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${formatCurrency(amount / 1000, currency)}K`;
  }
  return formatCurrency(amount, currency);
}

// ==================== FORMATEO DE FECHAS ====================
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha inválida';
  return format(dateObj, formatStr);
}

export function formatDateLong(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha inválida';
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha inválida';
  return format(dateObj, 'dd/MM/yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Fecha inválida';
  return formatDistanceToNow(dateObj, { locale: es, addSuffix: true });
}

// ==================== FORMATEO DE PORCENTAJES ====================
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatPercentageCompact(value: number): string {
  if (value >= 100) return `${Math.round(value)}%`;
  if (value >= 10) return `${value.toFixed(1)}%`;
  return value.toFixed(2) + '%';
}

// ==================== FORMATEO DE NÚMEROS ====================
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPhone(phone: string): string {
  // Formato: (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// ==================== FORMATEO DE ESTADOS ====================
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Member statuses
    member_active: 'Activo',
    member_inactive: 'Inactivo',
    member_suspended: 'Suspendido',
    // Contribution statuses
    contribution_pending: 'Pendiente',
    contribution_paid: 'Pagado',
    contribution_late: 'Atrasado',
    contribution_penalty: 'Con Multa',
    // Loan statuses
    loan_active: 'Activo',
    loan_paid: 'Pagado',
    loan_refinanced: 'Refinanciado',
    loan_defaulted: 'Moroso',
    loan_cancelled: 'Cancelado',
    // Transaction types
    transaction_contribution: 'Aporte',
    transaction_loan_payment: 'Pago de Préstamo',
    transaction_penalty: 'Multa',
    transaction_loan_disbursement: 'Desembolso',
    transaction_expense: 'Gasto',
    transaction_refund: 'Reintegro',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'success',
    paid: 'success',
    inactive: 'gray',
    suspended: 'warning',
    pending: 'warning',
    late: 'danger',
    penalty: 'danger',
    refinanced: 'info',
    defaulted: 'danger',
    cancelled: 'gray',
    contribution: 'success',
    loan_payment: 'primary',
    expense: 'danger',
    loan_disbursement: 'warning',
  };
  return colors[status] || 'gray';
}

// ==================== UTILIDADES DE CLASES ====================
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ==================== FORMATEO DE DOCUMENTOS ====================
export function formatID(id: string): string {
  // Formato: XXXX-XXXX-XXXX
  const cleaned = id.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    return cleaned.match(/.{1,4}/g)?.join('-') || id;
  }
  return id;
}

// ==================== UTILIDADES DE TEXTO ====================
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
