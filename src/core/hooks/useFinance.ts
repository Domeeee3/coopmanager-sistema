import { useCallback } from 'react';
import { addMonths, format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { AmortizationEntry, AmortizationSchedule, Loan } from '../types';

// ==================== FÓRMULA FRANCESA DE AMORTIZACIÓN ====================
// Cuota Fija = Capital * (i * (1 + i)^n) / ((1 + i)^n - 1)
// Donde: i = tasa mensual (en decimal), n = número de cuotas
// NOTA: La tasa que se pasa ya es mensual, NO dividir entre 12

interface CalculateLoanParams {
  amount: number;
  monthlyInterestRate: number;  // Porcentaje mensual directo (ej. 1 para 1%)
  termMonths: number;
  startDate: string;
  transferFee?: number;          // Cargo fijo por transferencia
}

interface LoanCalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  totalTransferFees: number;
  totalAmount: number;
  schedule: AmortizationEntry[];
}

const toCents = (value: number) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents: number) => cents / 100;

/**
 * Reparte un total (en centavos) en partes iguales; los centavos sobrantes
 * van en la última fila (ej. $100 en 3 → 33,33 / 33,33 / 33,34).
 */
function splitWithRemainderLast(totalCents: number, parts: number): number[] {
  const base = Math.floor(totalCents / parts);
  return Array.from({ length: parts }, (_, index) =>
    index === parts - 1 ? totalCents - base * (parts - 1) : base,
  );
}

/**
 * Reparte la transferencia para que todas las cuotas (salvo la última, que
 * ajusta los centavos) tengan el mismo valor. Si no es posible sin dejar
 * filas negativas, la reparte en partes iguales con el sobrante en la última.
 */
function splitTransfer(transferCents: number, totalCents: number, principalRows: number[], interestRows: number[]): number[] {
  const parts = principalRows.length;
  const payment = Math.round(totalCents / parts);
  const rows = principalRows.map((principal, index) => payment - principal - interestRows[index]);
  rows[parts - 1] = transferCents - rows.slice(0, -1).reduce((sum, value) => sum + value, 0);
  return rows.every((value) => value >= 0) ? rows : splitWithRemainderLast(transferCents, parts);
}

export interface InstallmentRowCents {
  principal: number;
  interest: number;
  transferFee: number;
  payment: number;
}

/**
 * Reparte capital, interés y transferencia (en centavos) en `count` cuotas:
 * capital e interés en partes iguales con el sobrante en la última, y la
 * transferencia ajustada para que todas las cuotas salvo la última sean iguales.
 */
export function buildInstallmentRows(principalCents: number, interestCents: number, transferCents: number, count: number): InstallmentRowCents[] {
  const parts = Math.max(1, Math.floor(count) || 1);
  const totalCents = principalCents + interestCents + transferCents;
  const principalRows = splitWithRemainderLast(principalCents, parts);
  const interestRows = splitWithRemainderLast(interestCents, parts);
  const transferRows = splitTransfer(transferCents, totalCents, principalRows, interestRows);
  return principalRows.map((principal, index) => ({
    principal,
    interest: interestRows[index],
    transferFee: transferRows[index],
    payment: principal + interestRows[index] + transferRows[index],
  }));
}

/**
 * Calcula la tabla de pagos de un préstamo.
 *
 * - Capital: el monto prestado se reparte en partes iguales entre las cuotas;
 *   el centavo sobrante va en la última y la columna suma exactamente el monto.
 * - Interés: tasa mensual sobre el capital prestado por cada mes del plazo,
 *   repartido en partes iguales (sobrante en la última cuota).
 * - Transferencia: `transferFee` es el costo TOTAL de la transferencia del
 *   préstamo y se fracciona entre las cuotas (no se cobra en cada pago),
 *   ajustada para que la cuota mensual sea fija.
 * - La retención por suministros es opcional y no forma parte del total.
 *
 * Ejemplo: $100 a 3 meses al 1% con transferencia de $0,41 → total $103,41 y
 * cuota mensual de $34,47.
 */
export function calculateFrenchAmortization(
  amount: number,
  monthlyInterestRate: number,  // Tasa mensual en porcentaje (1% = 1)
  termMonths: number,
  startDate: string,
  transferFee: number = 0.41    // Costo total de transferencia del préstamo
): LoanCalculationResult {
  const months = Math.max(1, Math.floor(termMonths) || 1);
  const principalCents = toCents(amount);
  const interestCents = Math.round(principalCents * (Number(monthlyInterestRate) || 0) / 100 * months);
  const transferCents = Math.max(0, toCents(transferFee));
  const totalCents = principalCents + interestCents + transferCents;

  const rows = buildInstallmentRows(principalCents, interestCents, transferCents, months);
  const startDateObj = parseISO(startDate);
  let remainingCents = totalCents;

  const schedule: AmortizationEntry[] = rows.map((row, index) => {
    remainingCents -= row.payment;
    return {
      installmentNumber: index + 1,
      dueDate: format(addMonths(startDateObj, index + 1), 'yyyy-MM-dd'),
      principal: fromCents(row.principal),
      interest: fromCents(row.interest),
      transferFee: fromCents(row.transferFee),
      payment: fromCents(row.payment),
      // Saldo pendiente total (capital + interés + transferencia) tras esta cuota
      balance: fromCents(Math.max(0, remainingCents)),
      status: 'pending',
    };
  });

  return {
    // Cuota fija = valor de las cuotas (la última sólo ajusta centavos)
    monthlyPayment: schedule[0].payment,
    totalInterest: fromCents(interestCents),
    totalTransferFees: fromCents(transferCents),
    totalAmount: fromCents(totalCents),
    schedule,
  };
}

/**
 * Hook personalizado para cálculos financieros
 */
export function useFinance() {
  /**
   * Recalcula la amortización después de un pago extra
   * Ajusta intereses basados en el capital restante real
   */
  const recalculateAmortizationAfterExtraPayment = useCallback((
    originalSchedule: AmortizationEntry[],
    remainingPrincipal: number,
    monthlyInterestRate: number,
    remainingInstallments: number,
    startDate: string
  ): AmortizationEntry[] => {
    if (remainingPrincipal <= 0 || remainingInstallments <= 0) {
      return [];
    }

    const monthlyRate = monthlyInterestRate / 100;
    
    // Recalcular cuota para el capital restante
    const newMonthlyPayment = remainingPrincipal * 
      (monthlyRate * Math.pow(1 + monthlyRate, remainingInstallments)) / 
      (Math.pow(1 + monthlyRate, remainingInstallments) - 1);
    
    const basePayment = Math.round(newMonthlyPayment * 100) / 100;
    
    // Generar nueva tabla para las cuotas restantes
    const newSchedule: AmortizationEntry[] = [];
    let currentBalance = remainingPrincipal;
    const startDateObj = parseISO(startDate);
    
    for (let i = 1; i <= remainingInstallments; i++) {
      // Interés sobre saldo REAL actual
      const interestPayment = Math.round(currentBalance * monthlyRate * 100) / 100;
      
      // Capital a pagar
      const principalPayment = Math.round((basePayment - interestPayment) * 100) / 100;
      
      // Actualizar balance
      currentBalance = Math.round((currentBalance - principalPayment) * 100) / 100;
      
      // Última cuota llega exactamente a 0
      if (i === remainingInstallments) {
        currentBalance = 0;
      }
      
      // Fecha de vencimiento
      const dueDate = addMonths(startDateObj, i);
      
      newSchedule.push({
        installmentNumber: originalSchedule.length - remainingInstallments + i,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        principal: principalPayment,
        interest: interestPayment,
        transferFee: 0, // Se cobra por pago real
        payment: basePayment,
        balance: Math.max(0, currentBalance),
        status: 'pending',
      });
    }
    
    return newSchedule;
  }, []);
  /**
   * Calcula la cuota mensual para un préstamo
   */
  const calculateMonthlyPayment = useCallback((
    amount: number,
    monthlyInterestRate: number,
    termMonths: number
  ): number => {
    const monthlyRate = monthlyInterestRate / 100;
    if (monthlyRate === 0) return amount / termMonths;
    
    const payment = amount * 
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return Math.round(payment * 100) / 100;
  }, []);
  
  /**
   * Genera la tabla de amortización completa
   */
  const generateAmortizationSchedule = useCallback((
    loan: Pick<Loan, 'amount' | 'monthlyInterestRate' | 'termMonths' | 'startDate'>
  ): AmortizationSchedule => {
    // Validar que el objeto loan existe y tiene las propiedades necesarias
    if (!loan || typeof loan.amount !== 'number' || typeof loan.monthlyInterestRate !== 'number' || 
        typeof loan.termMonths !== 'number' || typeof loan.startDate !== 'string') {
      throw new Error('Objeto loan inválido o incompleto');
    }

    const result = calculateFrenchAmortization(
      loan.amount,
      loan.monthlyInterestRate,
      loan.termMonths,
      loan.startDate
    );
    
    return {
      loanId: loan.amount.toString(), // Placeholder, se reemplaza con ID real
      entries: result.schedule,
      totalPrincipal: loan.amount,
      totalInterest: result.totalInterest,
      totalPayment: result.totalAmount,
    };
  }, []);
  
  /**
   * Calcula las cuotas pagadas y pendientes
   */
  const calculateLoanProgress = useCallback((
    schedule: AmortizationEntry[],
    paidInstallments: number
  ): { paid: number; pending: number; percentage: number } => {
    const total = schedule.length;
    const paid = Math.min(paidInstallments, total);
    const pending = total - paid;
    const percentage = total > 0 ? (paid / total) * 100 : 0;
    
    return { paid, pending, percentage };
  }, []);
  
  /**
   * Determina si una cuota está vencida
   */
  const isInstallmentLate = useCallback((
    dueDate: string,
    penaltyDayThreshold: number = 3
  ): boolean => {
    const today = new Date();
    const dueDateObj = parseISO(dueDate);
    
    // El vencimiento se considera tarde después del día threshold del mes siguiente
    const thresholdDate = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), penaltyDayThreshold + 1);
    
    return isAfter(today, thresholdDate);
  }, []);
  
  /**
   * Calcula la multa para una cuota vencida
   */
  const calculatePenalty = useCallback((
    payment: number,
    penaltyAmount: number,
    isLate: boolean
  ): number => {
    if (!isLate) return 0;
    return penaltyAmount;
  }, []);
  
  /**
   * Calcula el capital pendiente de un préstamo
   */
  const calculateRemainingPrincipal = useCallback((
    totalPrincipal: number,
    paidPrincipal: number
  ): number => {
    const remaining = totalPrincipal - paidPrincipal;
    return Math.max(0, remaining);
  }, []);
  
  /**
   * Genera cuotas para pagos adelantados
   */
  const calculatePrepaidInstallments = useCallback((
    schedule: AmortizationEntry[],
    currentInstallment: number,
    monthsToPay: number
  ): AmortizationEntry[] => {
    const result: AmortizationEntry[] = [];
    for (let i = 0; i < monthsToPay; i++) {
      const installmentNum = currentInstallment + i;
      if (installmentNum < schedule.length) {
        result.push(schedule[installmentNum]);
      }
    }
    return result;
  }, []);
  
  /**
   * Calcula los intereses ganados hasta una fecha
   */
  const calculateInterestEarned = useCallback((
    schedule: AmortizationEntry[],
    paidInstallments: number
  ): number => {
    let totalInterest = 0;
    for (let i = 0; i < Math.min(paidInstallments, schedule.length); i++) {
      totalInterest += schedule[i].interest;
    }
    return totalInterest;
  }, []);
  
  return {
    calculateMonthlyPayment,
    generateAmortizationSchedule,
    calculateLoanProgress,
    isInstallmentLate,
    calculatePenalty,
    calculateRemainingPrincipal,
    calculatePrepaidInstallments,
    calculateInterestEarned,
    calculateFrenchAmortization,
  };
}

export default useFinance;
