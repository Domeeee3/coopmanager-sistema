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
 * Reparte un total (en centavos) en `parts` filas de forma uniforme usando
 * redondeo acumulado: la suma de las filas es exactamente el total y ninguna
 * fila queda negativa.
 */
function splitEvenly(totalCents: number, parts: number): number[] {
  const rows: number[] = [];
  let previous = 0;
  for (let index = 1; index <= parts; index++) {
    const cumulative = Math.round((totalCents * index) / parts);
    rows.push(cumulative - previous);
    previous = cumulative;
  }
  return rows;
}

/**
 * Calcula la tabla de pagos de un préstamo.
 *
 * - Capital: el monto prestado se reparte en partes iguales entre las cuotas
 *   y la columna suma exactamente el monto.
 * - Interés: tasa mensual sobre el capital prestado por cada mes del plazo,
 *   repartido en partes iguales.
 * - Transferencia: `transferFee` es el costo TOTAL de la transferencia del
 *   préstamo y se fracciona entre las cuotas (no se cobra en cada pago).
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

  const principalRows = splitEvenly(principalCents, months);
  const interestRows = splitEvenly(interestCents, months);
  const transferRows = splitEvenly(transferCents, months);

  const schedule: AmortizationEntry[] = [];
  const startDateObj = parseISO(startDate);
  let remainingCents = totalCents;

  for (let index = 0; index < months; index++) {
    const paymentCents = principalRows[index] + interestRows[index] + transferRows[index];
    remainingCents -= paymentCents;

    schedule.push({
      installmentNumber: index + 1,
      dueDate: format(addMonths(startDateObj, index + 1), 'yyyy-MM-dd'),
      principal: fromCents(principalRows[index]),
      interest: fromCents(interestRows[index]),
      transferFee: fromCents(transferRows[index]),
      payment: fromCents(paymentCents),
      // Saldo pendiente total (capital + interés + transferencia) tras esta cuota
      balance: fromCents(Math.max(0, remainingCents)),
      status: 'pending',
    });
  }

  return {
    monthlyPayment: fromCents(Math.round(totalCents / months)),
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
