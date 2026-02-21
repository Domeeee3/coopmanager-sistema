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

/**
 * Calcula la tabla de amortización simple para un préstamo
 * Lógica: Suma directa de capital + retención (1%) + interés total + transferencia, dividido en cuotas iguales redondeadas hacia arriba
 */
export function calculateFrenchAmortization(
  amount: number,
  monthlyInterestRate: number,  // Tasa mensual en porcentaje (1% = 1)
  termMonths: number,
  startDate: string,
  transferFee: number = 0.41    // Cargo fijo por transferencia
): LoanCalculationResult {
  // Retención: 1% del capital
  const retention = amount * 0.01;
  
  // Monto base con retención
  const baseWithRetention = amount + retention;
  
  // Interés total: 1% mensual sobre el capital por número de meses
  const totalInterest = (amount * (monthlyInterestRate / 100)) * termMonths;
  
  // Total antes de transferencia
  const totalBeforeTransfer = baseWithRetention + totalInterest;
  
  // Total final incluyendo transferencia
  const totalAmount = totalBeforeTransfer + transferFee;
  
  // Cuota mensual: dividir total entre meses y redondear hacia arriba al centavo
  const rawMonthlyPayment = totalAmount / termMonths;
  const monthlyPayment = Math.ceil(rawMonthlyPayment * 100) / 100;
  
  // Generar tabla de amortización con cuotas iguales
  const schedule: AmortizationEntry[] = [];
  let remainingBalance = amount; // Solo el capital restante
  const startDateObj = parseISO(startDate);
  const monthlyRate = monthlyInterestRate / 100;
  
  for (let installment = 1; installment <= termMonths; installment++) {
    // Interés sobre el saldo pendiente real
    const interestPayment = Math.round(remainingBalance * monthlyRate * 100) / 100;
    
    // Transferencia: 0.41 en cada fila
    const transferFeeForThis = transferFee;
    
    // Principal: cuota menos interés (transferencia no afecta el cálculo del principal)
    const principalPayment = Math.round((monthlyPayment - interestPayment) * 100) / 100;
    
    // Actualizar balance
    remainingBalance = Math.round((remainingBalance - principalPayment) * 100) / 100;
    
    // Para la última cuota, asegurar que llegue exactamente a 0
    if (installment === termMonths) {
      remainingBalance = 0;
    }
    
    // Fecha de vencimiento: primera cuota 30 días después del inicio
    const dueDate = addMonths(startDateObj, installment);
    
    schedule.push({
      installmentNumber: installment,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      principal: principalPayment,
      interest: interestPayment,
      transferFee: transferFeeForThis,
      payment: monthlyPayment,
      balance: Math.max(0, remainingBalance),
      status: 'pending',
    });
  }
  
  return {
    monthlyPayment: monthlyPayment,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalTransferFees: transferFee,
    totalAmount: Math.round(totalAmount * 100) / 100,
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
