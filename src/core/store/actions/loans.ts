import { v4 as uuidv4 } from 'uuid';
import { Loan, LoanFormData, LoanPaymentData, Transaction } from '../../types';
import { ActionHelpers } from '../types';
import { calculateFrenchAmortization } from '../../hooks/useFinance';
import { applySchedule, getLoanSchedule, isInstallmentPaid, loanHasPayments } from '../../lib/loans';
import { formatCurrency } from '../../lib/formatters';

const roundCents = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function createLoanActions(
  helpers: ActionHelpers,
  deps: {
    addLoanRef: { current: ((data: LoanFormData, options?: { notify?: boolean }) => Loan) | null };
    updateMember: (id: string, data: any) => void;
  }
) {
  const { dispatch, getState, showToast, logActivity, addTransaction } = helpers;

  const money = (value: number) => formatCurrency(value, getState().config.currencyCode);

  const findTransaction = (predicate: (transaction: Transaction) => boolean) =>
    getState().transactions.find(predicate);

  /** Construye los datos financieros del préstamo a partir del formulario. */
  const buildLoanTerms = (data: LoanFormData) => {
    const state = getState();
    const member = state.members.find(m => m.id === data.memberId);
    const transferFee = roundCents(data.transferFee ?? state.config.transferFee);
    const chargeRetention = data.chargeRetention === true;
    const retentionAmount = chargeRetention ? roundCents(data.amount * (Number(state.config.retentionRate) || 0) / 100) : 0;
    const amortization = calculateFrenchAmortization(
      data.amount,
      data.monthlyInterestRate,
      data.termMonths,
      data.startDate,
      transferFee,
    );

    return {
      memberId: data.memberId,
      memberName: member?.name || 'Desconocido',
      amount: data.amount,
      monthlyInterestRate: data.monthlyInterestRate,
      termMonths: data.termMonths,
      monthlyPayment: amortization.monthlyPayment,
      totalInterest: amortization.totalInterest,
      totalAmount: amortization.totalAmount,
      paidPrincipal: 0,
      remainingPrincipal: amortization.totalAmount,
      paidInstallments: 0,
      totalInstallments: data.termMonths,
      startDate: data.startDate,
      endDate: amortization.schedule[amortization.schedule.length - 1].dueDate,
      status: 'active' as const,
      notes: data.notes,
      transferFee,
      retentionAmount,
      retentionPaid: chargeRetention,
      lastPaymentPenalty: 0,
      schedule: amortization.schedule,
    };
  };

  const addLoan = (data: LoanFormData, options: { notify?: boolean } = {}): Loan => {
    const loan: Loan = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...buildLoanTerms(data),
    };

    dispatch({ type: 'ADD_LOAN', payload: loan });

    addTransaction('loan_approval', -Number(loan.amount), `Desembolso de préstamo a ${loan.memberName}`, loan.id, loan.startDate);
    if (loan.retentionPaid && loan.retentionAmount > 0) {
      addTransaction('retention', loan.retentionAmount, `Retención (suministros) - ${loan.memberName}`, loan.id, loan.startDate);
    }

    logActivity('loan_add', `Préstamo aprobado: ${loan.memberName} - ${money(loan.amount)}`, { loan }, loan.id);
    if (options.notify !== false) {
      showToast('success', 'Préstamo aprobado', loan.retentionPaid
        ? `Préstamo de ${money(loan.amount)} desembolsado. Retención cobrada: ${money(loan.retentionAmount)}`
        : `Préstamo de ${money(loan.amount)} desembolsado sin retención.`);
    }
    return loan;
  };

  // Store ref so refinanceLoan can call addLoan internally
  deps.addLoanRef.current = addLoan;

  const updateLoan = (id: string, data: Partial<Loan>) => {
    const loan = getState().loans.find(l => l.id === id);
    if (loan) {
      const updated: Loan = { ...loan, ...data };
      dispatch({ type: 'UPDATE_LOAN', payload: updated });
    }
  };

  const getLoan = (id: string) => getState().loans.find(l => l.id === id);

  /**
   * Corrige los datos del préstamo. Sin pagos registrados se recalculan la
   * tabla y los movimientos de caja (desembolso y retención); con pagos sólo
   * se permiten cambiar las notas para no descuadrar cuotas ya cobradas.
   */
  const editLoan = (id: string, data: LoanFormData) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === id);
    if (!loan) return;

    if (loanHasPayments(loan, state.transactions)) {
      dispatch({ type: 'UPDATE_LOAN', payload: { ...loan, notes: data.notes } });
      logActivity('loan_edit', `Notas de préstamo actualizadas: ${loan.memberName}`, { loanId: id, notes: data.notes }, id);
      showToast('info', 'Préstamo actualizado', 'El préstamo tiene pagos registrados: sólo se actualizaron las notas.');
      return;
    }

    const terms = buildLoanTerms(data);
    const updated: Loan = { ...loan, ...terms, refinancedFromId: loan.refinancedFromId };

    // Desembolso
    const approval = findTransaction(t => t.type === 'loan_approval' && t.referenceId === id);
    if (approval) {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { ...approval, amount: -Number(updated.amount), description: `Desembolso de préstamo a ${updated.memberName}`, date: updated.startDate },
      });
    } else {
      addTransaction('loan_approval', -Number(updated.amount), `Desembolso de préstamo a ${updated.memberName}`, id, updated.startDate);
    }

    // Retención
    const retention = findTransaction(t => t.type === 'retention' && t.referenceId === id);
    const newRetention = updated.retentionPaid ? updated.retentionAmount : 0;
    if (retention) {
      if (newRetention > 0) {
        dispatch({
          type: 'UPDATE_TRANSACTION',
          payload: { ...retention, amount: newRetention, description: `Retención (suministros) - ${updated.memberName}`, date: updated.startDate },
        });
      } else {
        dispatch({ type: 'DELETE_TRANSACTION', payload: retention.id });
      }
    } else {
      // Préstamos antiguos guardaban la retención sin referencia al préstamo
      const previousRetention = loan.retentionPaid ? Number(loan.retentionAmount) || 0 : 0;
      const difference = roundCents(newRetention - previousRetention);
      if (difference !== 0) {
        addTransaction('retention', difference, `Ajuste de retención (suministros) - ${updated.memberName}`, id);
      }
    }

    dispatch({ type: 'UPDATE_LOAN', payload: updated });
    logActivity('loan_edit', `Préstamo corregido: ${updated.memberName} - ${money(updated.amount)}`, { before: loan, after: updated }, id);
    showToast('success', 'Préstamo actualizado', `Cuota mensual: ${money(updated.monthlyPayment)}. Total a cobrar: ${money(updated.totalAmount)}.`);
  };

  /** Elimina un préstamo sin pagos y revierte todos sus movimientos de caja. */
  const deleteLoan = (loanId: string) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    if (loanHasPayments(loan, state.transactions)) {
      showToast('error', 'No se puede eliminar', 'El préstamo tiene pagos registrados. Elimine primero los pagos.');
      return;
    }

    const linked = state.transactions.filter(t => t.referenceId === loanId);
    linked.forEach(transaction => dispatch({ type: 'DELETE_TRANSACTION', payload: transaction.id }));

    // Préstamos antiguos guardaban la retención sin referencia al préstamo
    const hasLinkedRetention = linked.some(t => t.type === 'retention');
    if (loan.retentionPaid && !hasLinkedRetention && loan.retentionAmount > 0) {
      addTransaction('retention', -Number(loan.retentionAmount), `Devolución de retención por anulación - ${loan.memberName}`);
    }

    dispatch({ type: 'DELETE_LOAN', payload: loanId });

    logActivity('loan_delete', `Préstamo eliminado: ${loan.memberName} - ${money(loan.amount)}`, { loan }, loanId);
    showToast('success', 'Préstamo eliminado', `Se restauraron ${money(loan.amount)} a la caja.`);
  };

  const payRetention = (loanId: string) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'pending_retention') return;

    const updatedLoan: Loan = { ...loan, status: loan.remainingPrincipal > 0.005 ? 'active' : 'paid', retentionPaid: true };
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    addTransaction('retention', Number(loan.retentionAmount) || 0, `Retención (suministros) - ${loan.memberName}`, loanId);
    logActivity('loan_retention_pay', `Retención pagada: ${loan.memberName} - ${money(loan.retentionAmount)}`, { loan }, loanId);
    showToast('success', 'Retención cobrada', `Se cobró ${money(loan.retentionAmount)} por retención.`);
  };

  /** Decide no cobrar la retención de un préstamo que la tenía pendiente. */
  const waiveRetention = (loanId: string) => {
    const loan = getState().loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'pending_retention') return;

    dispatch({
      type: 'UPDATE_LOAN',
      payload: { ...loan, status: loan.remainingPrincipal > 0.005 ? 'active' : 'paid', retentionAmount: 0, retentionPaid: false },
    });
    logActivity('loan_edit', `Retención no cobrada: ${loan.memberName}`, { loanId, retentionAmount: loan.retentionAmount }, loanId);
    showToast('success', 'Retención omitida', 'El préstamo queda activo sin retención.');
  };

  const paymentDescription = (loan: Loan, installmentNumber: number, payment: number, penalty: number) =>
    `Pago cuota ${installmentNumber}/${loan.totalInstallments} - ${loan.memberName} (Cuota: ${money(payment)}${penalty > 0 ? `, Multa: ${money(penalty)}` : ''})`;

  /** Registra el pago de una cuota y su ingreso a caja. */
  const payLoanInstallment = (loanId: string, installmentNumber: number, payment: LoanPaymentData) => {
    const loan = getState().loans.find(l => l.id === loanId);
    if (!loan) return;

    const schedule = getLoanSchedule(loan);
    const entry = schedule.find(e => e.installmentNumber === installmentNumber);
    if (!entry || isInstallmentPaid(entry)) {
      showToast('error', 'Cuota no disponible', 'La cuota seleccionada ya está pagada o no existe.');
      return;
    }

    const penalty = roundCents(Math.max(0, payment.penaltyAmount ?? 0));
    const transactionId = addTransaction(
      'loan_payment',
      roundCents(entry.payment + penalty),
      paymentDescription(loan, installmentNumber, entry.payment, penalty),
      loanId,
      payment.paidDate,
    );

    const updatedSchedule = schedule.map(e => e.installmentNumber === installmentNumber
      ? { ...e, status: 'paid' as const, paidDate: payment.paidDate, penaltyAmount: penalty, paymentTransactionId: transactionId }
      : e);
    const updatedLoan = applySchedule(loan, updatedSchedule);
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    logActivity('loan_pay', `Cuota pagada: ${loan.memberName} - Cuota ${installmentNumber}/${loan.totalInstallments}`, { loanId, installmentNumber, amount: entry.payment, penalty }, loanId);
    if (updatedLoan.status === 'paid') {
      showToast('success', 'Préstamo pagado', 'Todas las cuotas han sido canceladas.');
    } else {
      showToast('success', 'Pago registrado', `Cuota ${installmentNumber} pagada. Saldo pendiente: ${money(updatedLoan.remainingPrincipal)}`);
    }
  };

  /** Busca el movimiento de caja de una cuota pagada (incluye préstamos antiguos). */
  const findPaymentTransaction = (loan: Loan, transactionId?: string) => {
    const state = getState();
    if (transactionId) {
      return state.transactions.find(t => t.id === transactionId);
    }
    const linkedIds = new Set(getLoanSchedule(loan).map(e => e.paymentTransactionId).filter(Boolean));
    return state.transactions
      .filter(t => t.type === 'loan_payment' && t.referenceId === loan.id && !linkedIds.has(t.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  /** Corrige la fecha o la multa de una cuota pagada y su movimiento de caja. */
  const updateLoanPayment = (loanId: string, installmentNumber: number, payment: LoanPaymentData) => {
    const loan = getState().loans.find(l => l.id === loanId);
    if (!loan) return;

    const schedule = getLoanSchedule(loan);
    const entry = schedule.find(e => e.installmentNumber === installmentNumber);
    if (!entry || !isInstallmentPaid(entry)) return;

    const penalty = roundCents(Math.max(0, payment.penaltyAmount ?? 0));
    const transaction = entry.paymentTransactionId ? findPaymentTransaction(loan, entry.paymentTransactionId) : undefined;
    let transactionId = entry.paymentTransactionId;

    if (transaction) {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: {
          ...transaction,
          amount: roundCents(entry.payment + penalty),
          date: payment.paidDate,
          description: paymentDescription(loan, installmentNumber, entry.payment, penalty),
        },
      });
    } else {
      // Pago antiguo sin movimiento enlazado: sólo se ajusta la diferencia de multa
      const difference = roundCents(penalty - (entry.penaltyAmount ?? 0));
      if (difference !== 0) {
        transactionId = addTransaction('loan_payment', difference, `Ajuste de multa cuota ${installmentNumber} - ${loan.memberName}`, loanId, payment.paidDate);
      }
    }

    const updatedSchedule = schedule.map(e => e.installmentNumber === installmentNumber
      ? { ...e, paidDate: payment.paidDate, penaltyAmount: penalty, paymentTransactionId: transactionId }
      : e);
    dispatch({ type: 'UPDATE_LOAN', payload: applySchedule(loan, updatedSchedule) });

    logActivity('loan_payment_edit', `Pago corregido: ${loan.memberName} - Cuota ${installmentNumber}/${loan.totalInstallments}`, { loanId, installmentNumber, before: entry, after: payment }, loanId);
    showToast('success', 'Pago actualizado', `Cuota ${installmentNumber} corregida.`);
  };

  /** Elimina el pago de una cuota: vuelve a Pendiente y se retira de la caja. */
  const deleteLoanPayment = (loanId: string, installmentNumber: number) => {
    const loan = getState().loans.find(l => l.id === loanId);
    if (!loan) return;

    const schedule = getLoanSchedule(loan);
    const entry = schedule.find(e => e.installmentNumber === installmentNumber);
    if (!entry || !isInstallmentPaid(entry)) {
      showToast('error', 'Sin pago', 'Esta cuota no tiene un pago registrado.');
      return;
    }

    const transaction = findPaymentTransaction(loan, entry.paymentTransactionId);
    let removedAmount: number;
    if (transaction) {
      removedAmount = Number(transaction.amount) || 0;
      dispatch({ type: 'DELETE_TRANSACTION', payload: transaction.id });
    } else {
      // Sin movimiento identificable: se registra la salida equivalente para cuadrar caja
      removedAmount = roundCents(entry.payment + (entry.penaltyAmount ?? 0));
      addTransaction('loan_payment', -removedAmount, `Anulación de pago cuota ${installmentNumber} - ${loan.memberName}`, loanId);
    }

    const updatedSchedule = schedule.map(e => {
      if (e.installmentNumber !== installmentNumber) return e;
      const { paidDate: _paidDate, penaltyAmount: _penalty, paymentTransactionId: _transactionId, ...rest } = e;
      return { ...rest, status: 'pending' as const };
    });
    const updatedLoan = applySchedule(loan, updatedSchedule);
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    logActivity('loan_payment_delete', `Pago eliminado: ${loan.memberName} - Cuota ${installmentNumber}/${loan.totalInstallments} - ${money(removedAmount)}`, { loanId, installmentNumber, amount: removedAmount }, loanId);
    showToast('success', 'Pago eliminado', `Se retiraron ${money(removedAmount)} de la caja. Saldo pendiente: ${money(updatedLoan.remainingPrincipal)}`);
  };

  const refinanceLoan = (loanId: string, newTermMonths: number): Loan => {
    const state = getState();
    const oldLoan = state.loans.find(l => l.id === loanId);
    if (!oldLoan || oldLoan.status !== 'active') {
      showToast('error', 'Error', 'No se puede refinanciar este préstamo.');
      throw new Error('No se puede refinanciar');
    }

    const refinancedLoan: Loan = { ...oldLoan, status: 'refinanced' };
    dispatch({ type: 'UPDATE_LOAN', payload: refinancedLoan });

    const newLoan = deps.addLoanRef.current!({
      memberId: oldLoan.memberId,
      amount: oldLoan.remainingPrincipal,
      monthlyInterestRate: state.config.monthlyInterestRate,
      termMonths: newTermMonths,
      startDate: new Date().toISOString().split('T')[0],
      notes: `Refinanciación del préstamo ${oldLoan.id}`,
    }, { notify: false });

    // getState() aún no incluye el préstamo recién creado: se actualiza directamente
    dispatch({ type: 'UPDATE_LOAN', payload: { ...newLoan, refinancedFromId: loanId } });
    showToast('success', 'Préstamo refinanciado', `Nuevo préstamo creado con ${newTermMonths} cuotas.`);
    return newLoan;
  };

  return {
    addLoan, updateLoan, editLoan, getLoan, deleteLoan,
    payRetention, waiveRetention, payLoanInstallment, updateLoanPayment,
    deleteLoanPayment, refinanceLoan,
  };
}
