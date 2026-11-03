import { addMonths, format, parseISO } from 'date-fns';
import type { AmortizationEntry, Loan, Transaction } from '../types';
import { buildInstallmentRows, calculateFrenchAmortization } from '../hooks/useFinance';

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

const sumUnpaid = (schedule: AmortizationEntry[]) =>
  roundCents(schedule.filter((entry) => !isInstallmentPaid(entry)).reduce((sum, entry) => sum + entry.payment, 0));

const sumCreditApplied = (schedule: AmortizationEntry[]) =>
  roundCents(schedule.filter(isInstallmentPaid).reduce((sum, entry) => sum + (Number(entry.creditApplied) || 0), 0));

/** Monto que entra a caja por una cuota: nunca más que el saldo pendiente. */
export function getInstallmentCharge(loan: Loan, entry: AmortizationEntry): number {
  if (isInstallmentPaid(entry)) return roundCents(entry.payment - (Number(entry.creditApplied) || 0));
  return roundCents(Math.min(entry.payment, Math.max(0, Number(loan.remainingPrincipal) || 0)));
}

/**
 * Recalcula los totales derivados del préstamo a partir de su tabla.
 * Préstamos antiguos pudieron recibir abonos libres que sólo descontaban
 * `remainingPrincipal`: esa diferencia con las cuotas pendientes se conserva.
 */
export function applySchedule(loan: Loan, schedule: AmortizationEntry[]): Loan {
  const paidRows = schedule.filter(isInstallmentPaid);
  // Crédito total por abonos antiguos = el aún no aplicado + el ya aplicado en cuotas pagadas
  const previousSchedule = getLoanSchedule(loan);
  const legacyCredit = roundCents(sumUnpaid(previousSchedule) - (Number(loan.remainingPrincipal) || 0) + sumCreditApplied(previousSchedule));
  const remaining = Math.max(0, roundCents(sumUnpaid(schedule) - legacyCredit + sumCreditApplied(schedule)));
  const lastPaid = paidRows[paidRows.length - 1];
  const isFullyPaid = schedule.length > 0 && (paidRows.length === schedule.length || remaining <= 0.005);
  const collected = Math.max(0, roundCents((Number(loan.totalAmount) || 0) - remaining));

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

/** Préstamos cerrados (pagados, refinanciados, cancelados) no admiten cambios de montos. */
export function canEditLoanTerms(loan: Loan, transactions: Transaction[]): boolean {
  return OPEN_STATUSES.includes(loan.status) && !loanHasPayments(loan, transactions);
}

/** Indica si el préstamo tiene pagos registrados (en su tabla o en caja). */
export function loanHasPayments(loan: Loan, transactions: Transaction[]): boolean {
  if (getLoanSchedule(loan).some(isInstallmentPaid) || loan.paidInstallments > 0) return true;
  return transactions.some((transaction) => transaction.type === 'loan_payment' && transaction.referenceId === loan.id);
}

/**
 * Préstamos creados antes del cambio de fórmula: la cuota no es la suma de
 * capital + interés + transferencia, o el total no coincide con las cuotas.
 */
export function hasLegacySchedule(loan: Loan): boolean {
  const schedule = loan.schedule || [];
  if (schedule.length === 0) return false;
  const cents = (value: number) => Math.round((Number(value) || 0) * 100);
  const rowsMismatch = schedule.some((entry) => cents(entry.principal) + cents(entry.interest) + cents(entry.transferFee || 0) !== cents(entry.payment));
  const totalMismatch = schedule.reduce((sum, entry) => sum + cents(entry.payment), 0) !== cents(loan.totalAmount);
  return rowsMismatch || totalMismatch;
}

/**
 * Recalcula con la fórmula actual los préstamos antiguos vigentes que aún no
 * tienen pagos (los que tienen pagos se conservan tal cual). La transferencia
 * guardada pasa a ser el costo total fraccionado entre las cuotas.
 * Devuelve el mismo arreglo si no hubo cambios.
 */
export function migrateLegacyLoans(loans: Loan[], transactions: Transaction[]): Loan[] {
  let changed = false;
  const migrated = loans.map((loan) => {
    if (!OPEN_STATUSES.includes(loan.status) || !hasLegacySchedule(loan) || loanHasPayments(loan, transactions)) return loan;
    const months = loan.termMonths || loan.schedule.length;
    const calc = calculateFrenchAmortization(loan.amount, loan.monthlyInterestRate, months, loan.startDate, loan.transferFee);
    changed = true;
    return {
      ...loan,
      termMonths: months,
      totalInstallments: months,
      monthlyPayment: calc.monthlyPayment,
      totalInterest: calc.totalInterest,
      totalAmount: calc.totalAmount,
      paidPrincipal: 0,
      remainingPrincipal: calc.totalAmount,
      paidInstallments: 0,
      lastPaymentPenalty: 0,
      endDate: calc.schedule[calc.schedule.length - 1].dueDate,
      schedule: calc.schedule,
    };
  });
  return changed ? migrated : loans;
}

export interface RefinancePlan {
  currentPendingInstallments: number;
  newPendingInstallments: number;
  addedMonths: number;
  pendingCapital: number;
  extraInterest: number;
  currentBalance: number;
  newBalance: number;
  monthlyPayment: number;
  endDate: string;
  loan: Loan;
}

export function getPendingInstallmentCount(loan: Loan): number {
  return getLoanSchedule(loan).filter((entry) => !isInstallmentPaid(entry)).length;
}

/**
 * Refinanciar = alargar el plazo del mismo préstamo. Las cuotas pagadas se
 * conservan; el saldo pendiente se reparte en `newPendingInstallments` cuotas
 * y se suma interés sólo por los meses agregados, sobre el capital pendiente.
 * Devuelve null si el préstamo no está vigente o el nuevo plazo no es mayor.
 */
export function buildRefinancePlan(loan: Loan, newPendingInstallments: number): RefinancePlan | null {
  const schedule = getLoanSchedule(loan);
  const pending = schedule.filter((entry) => !isInstallmentPaid(entry));
  const count = Math.floor(Number(newPendingInstallments) || 0);
  if (!isLoanOpen(loan) || pending.length === 0 || count <= pending.length) return null;

  const cents = (value: number) => Math.round((Number(value) || 0) * 100);
  const addedMonths = count - pending.length;
  // El saldo de las cuotas pendientes manda. En préstamos antiguos la
  // transferencia se cobraba aparte y no forma parte de la cuota.
  const pendingTotal = pending.reduce((sum, entry) => sum + cents(entry.payment), 0);
  const pendingCapital = Math.min(pendingTotal, pending.reduce((sum, entry) => sum + cents(entry.principal), 0));
  const componentsTransfer = pending.reduce((sum, entry) => sum + cents(entry.transferFee || 0), 0);
  const componentsMatch = pending.reduce((sum, entry) => sum + cents(entry.principal) + cents(entry.interest) + cents(entry.transferFee || 0), 0) === pendingTotal;
  const pendingTransfer = componentsMatch ? componentsTransfer : 0;
  const pendingInterest = pendingTotal - pendingCapital - pendingTransfer;
  const extraInterest = Math.round(pendingCapital * (Number(loan.monthlyInterestRate) || 0) / 100 * addedMonths);
  const rows = buildInstallmentRows(pendingCapital, pendingInterest + extraInterest, pendingTransfer, count);

  // Números y fechas: se reutilizan los de las cuotas pendientes y se agregan meses al final
  const lastNumber = Math.max(...schedule.map((entry) => entry.installmentNumber));
  const lastDueDate = schedule.reduce((latest, entry) => (entry.dueDate > latest ? entry.dueDate : latest), schedule[0].dueDate);
  const slots = [
    ...pending.map((entry) => ({ installmentNumber: entry.installmentNumber, dueDate: entry.dueDate })),
    ...Array.from({ length: addedMonths }, (_, index) => ({
      installmentNumber: lastNumber + index + 1,
      dueDate: format(addMonths(parseISO(lastDueDate), index + 1), 'yyyy-MM-dd'),
    })),
  ];

  const newPending: AmortizationEntry[] = rows.map((row, index) => ({
    installmentNumber: slots[index].installmentNumber,
    dueDate: slots[index].dueDate,
    principal: row.principal / 100,
    interest: row.interest / 100,
    transferFee: row.transferFee / 100,
    payment: row.payment / 100,
    balance: 0,
    status: 'pending',
  }));

  const merged = [...schedule.filter(isInstallmentPaid), ...newPending].sort((a, b) => a.installmentNumber - b.installmentNumber);
  let running = merged.reduce((sum, entry) => sum + cents(entry.payment), 0);
  const withBalances = merged.map((entry) => {
    running -= cents(entry.payment);
    return { ...entry, balance: Math.max(0, running) / 100 };
  });

  const extra = extraInterest / 100;
  const endDate = slots[slots.length - 1].dueDate;
  const updated = applySchedule({ ...loan, totalAmount: roundCents(loan.totalAmount + extra) }, withBalances);
  const refinanced: Loan = {
    ...updated,
    termMonths: withBalances.length,
    totalInstallments: withBalances.length,
    totalInterest: roundCents(loan.totalInterest + extra),
    totalAmount: roundCents(loan.totalAmount + extra),
    monthlyPayment: newPending[0].payment,
    endDate,
  };

  return {
    currentPendingInstallments: pending.length,
    newPendingInstallments: count,
    addedMonths,
    pendingCapital: pendingCapital / 100,
    extraInterest: extra,
    currentBalance: roundCents(loan.remainingPrincipal),
    newBalance: refinanced.remainingPrincipal,
    monthlyPayment: refinanced.monthlyPayment,
    endDate,
    loan: refinanced,
  };
}
