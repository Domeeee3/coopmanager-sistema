import type { AmortizationEntry, Loan, Transaction } from '../types';

const roundCents = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

/** Estados en los que un préstamo sigue vigente (aún se le cobra). */
const OPEN_STATUSES: Loan['status'][] = ['active', 'pending_retention'];

/** Un préstamo está vigente si no fue cerrado y aún tiene saldo por cobrar. */
export function isLoanOpen(loan: Loan): boolean {
  return OPEN_STATUSES.includes(loan.status) && (Number(loan.remainingPrincipal) || 0) > 0.005;
}

export function getOpenLoans(loans: Loan[]): Loan[] {
  return loans.filter(isLoanOpen);
}

/** Saldo total pendiente por cobrar de los préstamos vigentes. */
export function getOutstandingBalance(loans: Loan[]): number {
  return roundCents(getOpenLoans(loans).reduce((sum, loan) => sum + (Number(loan.remainingPrincipal) || 0), 0));
}

export function isInstallmentPaid(entry: AmortizationEntry): boolean {
  return entry.status === 'paid';
}

/**
 * Devuelve la tabla del préstamo con el estado de cada cuota.
 * Préstamos antiguos sólo guardaban `paidInstallments` sin marcar las filas:
 * en ese caso se marcan como pagadas las primeras `paidInstallments` cuotas.
 */
export function getLoanSchedule(loan: Loan): AmortizationEntry[] {
  const schedule = loan.schedule || [];
  const hasMarkedRows = schedule.some(isInstallmentPaid);
  if (hasMarkedRows || !loan.paidInstallments) return schedule;
  return schedule.map((entry) =>
    entry.installmentNumber <= loan.paidInstallments ? { ...entry, status: 'paid' as const } : entry,
  );
}

/** Recalcula los totales derivados del préstamo a partir de su tabla. */
export function applySchedule(loan: Loan, schedule: AmortizationEntry[]): Loan {
  const paidRows = schedule.filter(isInstallmentPaid);
  const remaining = roundCents(schedule.filter((entry) => !isInstallmentPaid(entry)).reduce((sum, entry) => sum + entry.payment, 0));
  const collected = roundCents(paidRows.reduce((sum, entry) => sum + entry.payment, 0));
  const lastPaid = paidRows[paidRows.length - 1];
  const isFullyPaid = schedule.length > 0 && paidRows.length === schedule.length;

  let status = loan.status;
  if (isFullyPaid && OPEN_STATUSES.includes(status)) status = 'paid';
  if (!isFullyPaid && status === 'paid') status = loan.retentionAmount > 0 && !loan.retentionPaid ? 'pending_retention' : 'active';

  return {
    ...loan,
    schedule,
    paidInstallments: paidRows.length,
    paidPrincipal: collected,
    remainingPrincipal: isFullyPaid ? 0 : remaining,
    lastPaymentPenalty: lastPaid?.penaltyAmount ?? 0,
    status,
  };
}

/** Indica si el préstamo tiene pagos registrados (en su tabla o en caja). */
export function loanHasPayments(loan: Loan, transactions: Transaction[]): boolean {
  if (getLoanSchedule(loan).some(isInstallmentPaid) || loan.paidInstallments > 0) return true;
  return transactions.some((transaction) => transaction.type === 'loan_payment' && transaction.referenceId === loan.id);
}
