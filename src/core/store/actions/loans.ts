import { v4 as uuidv4 } from 'uuid';
import { Loan, LoanFormData } from '../../types';
import { ActionHelpers } from '../types';
import { calculateFrenchAmortization } from '../../hooks/useFinance';

export function createLoanActions(
  helpers: ActionHelpers,
  deps: {
    addLoanRef: { current: ((data: LoanFormData, options?: { notify?: boolean }) => Loan) | null };
    updateMember: (id: string, data: any) => void;
  }
) {
  const { dispatch, getState, showToast, logActivity, addTransaction } = helpers;

  const addLoan = (data: LoanFormData, options: { notify?: boolean } = {}): Loan => {
    const state = getState();
    const member = state.members.find(m => m.id === data.memberId);

    const retentionAmount = data.retentionAmount !== undefined
      ? Number(data.retentionAmount.toFixed(2))
      : Number((data.amount * state.config.retentionRate / 100).toFixed(2));

    const amortization = calculateFrenchAmortization(
      data.amount,
      data.monthlyInterestRate,
      data.termMonths,
      data.startDate,
      state.config.transferFee,
    );

    const loan: Loan = {
      id: uuidv4(),
      memberId: data.memberId,
      memberName: member?.name || 'Desconocido',
      amount: data.amount,
      monthlyInterestRate: data.monthlyInterestRate,
      termMonths: data.termMonths,
      monthlyPayment: amortization.monthlyPayment,
      totalInterest: amortization.totalInterest,
      totalAmount: amortization.totalAmount,
      paidPrincipal: 0,
      remainingPrincipal: amortization.monthlyPayment * data.termMonths,
      paidInstallments: 0,
      totalInstallments: data.termMonths,
      startDate: data.startDate,
      endDate: amortization.schedule[amortization.schedule.length - 1].dueDate,
      status: data.retentionPaid ? 'active' : 'pending_retention',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      transferFee: state.config.transferFee,
      retentionAmount,
      retentionPaid: data.retentionPaid || false,
      schedule: amortization.schedule,
    };

    dispatch({ type: 'ADD_LOAN', payload: loan });

    if (data.retentionPaid) {
      addTransaction('retention', Number(retentionAmount), `Retención (suministros) - ${member?.name}`);
    }
    addTransaction('loan_approval', -Number(data.amount), `Desembolso de préstamo a ${member?.name}`, loan.id);

    logActivity('loan_add', `Préstamo aprobado: ${member?.name} - ${state.config.currencySymbol}${data.amount}`, { loan }, loan.id);
    if (options.notify !== false) showToast('success', 'Préstamo aprobado', data.retentionPaid
      ? `Préstamo de ${state.config.currencySymbol}${data.amount} desembolsado. Retención cobrada: ${state.config.currencySymbol}${retentionAmount}`
      : `Préstamo de ${state.config.currencySymbol}${data.amount} creado. Pendiente pago de retención: ${state.config.currencySymbol}${retentionAmount}`);
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

  const deleteLoan = (loanId: string) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    const disbursementTransaction = state.transactions.find(t => t.type === 'loan_approval' && t.referenceId === loanId);
    if (disbursementTransaction) {
      addTransaction('manual_adjustment', Number(loan.amount), `Anulación de préstamo - ${loan.memberName}`);
    }
    if (loan.retentionPaid) {
      addTransaction('manual_adjustment', -Number(loan.retentionAmount), `Devolución de retención por anulación - ${loan.memberName}`);
    }

    const updatedTransactions = state.transactions.filter(t => t.referenceId !== loanId);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });
    dispatch({ type: 'DELETE_LOAN', payload: loanId });

    logActivity('loan_delete', 'Préstamo eliminado', { loan }, loanId);
    showToast('success', `Préstamo eliminado. Se han restaurado ${state.config.currencySymbol}${loan.amount} a la caja.`);
  };

  const payRetention = (loanId: string) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'pending_retention') return;

    const member = state.members.find(m => m.id === loan.memberId);
    const updatedLoan: Loan = { ...loan, status: 'active', retentionPaid: true };
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    addTransaction('retention', Number(loan.retentionAmount) || 0, `Retención (suministros) - ${member?.name}`);
    logActivity('loan_retention_pay', `Retención pagada: ${member?.name} - ${state.config.currencySymbol}${loan.retentionAmount}`, { loan }, loanId);
    showToast('success', 'Retención cobrada', `Se cobró ${state.config.currencySymbol}${loan.retentionAmount} por retención. Préstamo activado.`);
  };

  const payLoanInstallment = (loanId: string, installmentNumber: number) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || installmentNumber < 1 || installmentNumber > loan.totalInstallments) return;

    const updatedSchedule = loan.schedule.map(entry =>
      entry.installmentNumber === installmentNumber ? { ...entry, status: 'paid' as const } : entry,
    );

    const newRemainingPrincipal = updatedSchedule.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.payment, 0);
    const newPaidPrincipal = loan.totalAmount - newRemainingPrincipal;
    const newPaidInstallments = loan.paidInstallments + 1;
    const isFullyPaid = newRemainingPrincipal <= 0.01;
    const newStatus: Loan['status'] = isFullyPaid ? 'paid' : loan.status;

    const updatedLoan: Loan = {
      ...loan,
      schedule: updatedSchedule,
      paidInstallments: newPaidInstallments,
      paidPrincipal: isFullyPaid ? loan.totalAmount : newPaidPrincipal,
      remainingPrincipal: isFullyPaid ? 0 : newRemainingPrincipal,
      status: newStatus,
    };

    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    const member = state.members.find(m => m.id === loan.memberId);
    const installmentAmount = Number(loan.monthlyPayment) || 0;
    const transferFee = Number(state.config.transferFee) || 0;
    const totalPayment = installmentAmount + transferFee;
    addTransaction('loan_payment', Number(totalPayment), `Pago cuota ${installmentNumber} - ${member?.name} (Cuota: ${state.config.currencySymbol}${installmentAmount}, Transferencia: ${state.config.currencySymbol}${transferFee})`);
    logActivity('loan_pay', `Cuota pagada: ${member?.name} - Cuota ${installmentNumber}/${loan.totalInstallments}`, { loanId, installmentNumber, amount: totalPayment }, loanId);

    if (newStatus === 'paid') {
      showToast('success', 'Préstamo pagado', 'Todas las cuotas han sido canceladas.');
    } else {
      showToast('success', 'Pago registrado', `Cuota ${installmentNumber} pagada.`);
    }
  };

  const prepayLoan = (loanId: string, amount: number, includePenalty: boolean = false) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || amount <= 0) return;

    const today = new Date();
    const dueDay = state.config.loanPaymentDueDay ?? 18;
    const isLatePayment = today.getDate() >= dueDay;
    const latePenalty = (isLatePayment && includePenalty) ? (state.config.penaltyAmount ?? 5) : 0;
    const transferFee = state.config.transferFee;
    const totalPayment = amount + transferFee + latePenalty;

    const newRemaining = Math.round((loan.remainingPrincipal - amount) * 100) / 100;
    const actualPaymentApplied = Math.min(amount, loan.remainingPrincipal);
    const newPaidPrincipal = Math.round((loan.paidPrincipal + actualPaymentApplied) * 100) / 100;
    const isFullyPaid = Math.abs(newRemaining) <= 0.01;
    const finalRemaining = isFullyPaid ? 0 : Math.max(0, newRemaining);
    const finalPaidPrincipal = isFullyPaid ? loan.amount : newPaidPrincipal;
    const newStatus: Loan['status'] = isFullyPaid ? 'paid' : loan.status;

    const estimatedInstallmentsPaid = Math.min(
      Math.floor(actualPaymentApplied / loan.monthlyPayment) + loan.paidInstallments,
      loan.totalInstallments,
    );
    const newPaidInstallments = isFullyPaid ? loan.totalInstallments : estimatedInstallmentsPaid;

    const updatedLoan: Loan = {
      ...loan,
      remainingPrincipal: finalRemaining,
      paidPrincipal: finalPaidPrincipal,
      paidInstallments: newPaidInstallments,
      status: newStatus,
      lastPaymentPenalty: latePenalty,
    };
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    const member = state.members.find(m => m.id === loan.memberId);
    const penaltyDesc = latePenalty > 0 ? `, Multa tardía: ${state.config.currencySymbol}${latePenalty}` : '';
    addTransaction('loan_payment', totalPayment, `Pago préstamo - ${member?.name} (Capital: ${state.config.currencySymbol}${actualPaymentApplied}, Transferencia: ${state.config.currencySymbol}${transferFee}${penaltyDesc})`, loanId);
    logActivity('loan_pay', `Pago préstamo: ${member?.name} - Capital: ${state.config.currencySymbol}${actualPaymentApplied}${latePenalty > 0 ? ` + Multa: ${state.config.currencySymbol}${latePenalty}` : ''}`, { loanId, amount, latePenalty }, loanId);

    if (isFullyPaid) {
      showToast('success', 'Préstamo liquidado', 'El préstamo ha sido pagado completamente.');
    } else if (latePenalty > 0) {
      showToast('warning', 'Pago tardío registrado', `Se aplicó ${state.config.currencySymbol}${actualPaymentApplied} al capital + multa de ${state.config.currencySymbol}${latePenalty}. Saldo: ${state.config.currencySymbol}${finalRemaining}`);
    } else {
      showToast('success', 'Pago registrado', `Se aplicó ${state.config.currencySymbol}${actualPaymentApplied} al capital. Saldo pendiente: ${state.config.currencySymbol}${finalRemaining}`);
    }
  };

  const deleteLoanPayment = (loanId: string) => {
    const state = getState();
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;
    if (loan.paidInstallments <= 0) {
      showToast('error', 'Sin pagos', 'Este préstamo no tiene pagos registrados para anular.');
      return;
    }

    const loanPayments = state.transactions
      .filter(t => t.type === 'loan_payment' && t.referenceId === loanId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (loanPayments.length === 0) {
      showToast('error', 'Sin pagos', 'No se encontró una transacción de pago para anular.');
      return;
    }

    const lastPayment = loanPayments[0];
    const paymentAmount = Number(lastPayment.amount);

    const newPaidInstallments = loan.paidInstallments - 1;
    const newRemainingPrincipal = Math.round((loan.remainingPrincipal + loan.monthlyPayment) * 100) / 100;
    const newStatus: Loan['status'] = loan.status === 'paid' ? 'active' : loan.status;

    const updatedLoan: Loan = {
      ...loan,
      paidInstallments: newPaidInstallments,
      remainingPrincipal: newRemainingPrincipal,
      paidPrincipal: Math.max(0, loan.paidPrincipal - loan.monthlyPayment),
      status: newStatus,
      lastPaymentPenalty: 0,
    };
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });
    dispatch({ type: 'DELETE_TRANSACTION', payload: lastPayment.id });

    const member = state.members.find(m => m.id === loan.memberId);
    addTransaction('manual_adjustment', -paymentAmount, `Anulación de pago - ${member?.name} (Préstamo #${loanId.slice(0, 8)})`);
    logActivity('loan_pay', `Pago anulado: ${member?.name} - ${state.config.currencySymbol}${paymentAmount}`, { loanId, paymentAmount }, loanId);
    showToast('success', 'Pago anulado', `El último pago de ${state.config.currencySymbol}${paymentAmount.toFixed(2)} ha sido revertido. La cuota vuelve a estado Pendiente.`);
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

    updateLoan(newLoan.id, { refinancedFromId: loanId });
    showToast('success', 'Préstamo refinanciado', `Nuevo préstamo creado con ${newTermMonths} cuotas.`);
    return newLoan;
  };

  return {
    addLoan, updateLoan, getLoan, deleteLoan,
    payRetention, payLoanInstallment, prepayLoan,
    deleteLoanPayment, refinanceLoan,
  };
}
