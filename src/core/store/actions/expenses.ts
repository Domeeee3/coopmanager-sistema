import { v4 as uuidv4 } from 'uuid';
import { Expense, ExpenseFormData, Refund, RefundFormData } from '../../types';
import { ActionHelpers } from '../types';

export function createExpenseActions(helpers: ActionHelpers) {
  const { dispatch, getState, showToast, logActivity, addTransaction } = helpers;

  const addExpense = (data: ExpenseFormData): Expense => {
    const state = getState();
    const expense: Expense = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_EXPENSE', payload: expense });
    addTransaction('expense', -data.amount, data.description);
    logActivity('expense_add', `Gasto registrado: ${data.description} - ${state.config.currencySymbol}${data.amount}`, { expense }, expense.id);
    showToast('success', 'Gasto registrado', `${state.config.currencySymbol}${data.amount} registrado como gasto.`);
    return expense;
  };

  const deleteExpense = (id: string) => {
    const state = getState();
    const expense = state.expenses.find(e => e.id === id);
    dispatch({ type: 'SET_EXPENSES', payload: state.expenses.filter(e => e.id !== id) });
    if (expense) logActivity('expense_delete', `Gasto eliminado: ${expense.description}`, { expense }, id);
    showToast('success', 'Gasto eliminado');
  };

  return { addExpense, deleteExpense };
}

export function createRefundActions(
  helpers: ActionHelpers,
  deps: { updateMember: (id: string, data: any) => void },
) {
  const { dispatch, getState, showToast, logActivity, addTransaction } = helpers;

  const addRefund = (data: RefundFormData): Refund => {
    const state = getState();
    const member = state.members.find(m => m.id === data.memberId);
    const refund: Refund = {
      id: uuidv4(),
      ...data,
      memberName: member?.name || 'Desconocido',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_REFUND', payload: refund });

    if (member && member.status === 'active') {
      deps.updateMember(member.id, { status: 'inactive' });
    }

    addTransaction('refund', -data.amount, `Devolución por retiro - ${member?.name}: ${data.reason}`);
    logActivity('refund_add', `Devolución registrada: ${member?.name} - ${state.config.currencySymbol}${data.amount}`, { refund }, refund.id);
    showToast('success', 'Devolución registrada', `${state.config.currencySymbol}${data.amount} devuelto a ${member?.name}.`);
    return refund;
  };

  const updateRefund = (id: string, data: Partial<Refund>) => {
    const refund = getState().refunds.find(r => r.id === id);
    if (refund) {
      const updated: Refund = { ...refund, ...data, updatedAt: new Date().toISOString() };
      dispatch({ type: 'UPDATE_REFUND', payload: updated });
      showToast('success', 'Devolución actualizada');
    }
  };

  const deleteRefund = (id: string) => {
    dispatch({ type: 'DELETE_REFUND', payload: id });
    showToast('success', 'Devolución eliminada');
  };

  return { addRefund, updateRefund, deleteRefund };
}
