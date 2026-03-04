import { v4 as uuidv4 } from 'uuid';
import { Transaction } from '../../types';
import { ActionHelpers, AppState } from '../types';

export function createTransactionActions(helpers: Pick<ActionHelpers, 'dispatch' | 'getState' | 'showToast' | 'logActivity'>) {
  const { dispatch, getState, showToast, logActivity } = helpers;

  const addTransaction = (type: Transaction['type'], amount: number, description: string, referenceId?: string) => {
    const transaction: Transaction = {
      id: uuidv4(),
      type,
      amount,
      description,
      referenceId,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
  };

  const setCashbox = (value: number) => {
    dispatch({ type: 'SET_CASHBOX', payload: value });
    showToast('success', 'Caja actualizada');
  };

  const adjustCashbox = (amount: number, description?: string) => {
    if (!amount) return;
    const state = getState();
    dispatch({ type: 'ADJUST_CASHBOX', payload: amount });
    addTransaction('manual_adjustment', amount, description || (amount >= 0 ? 'Ajuste positivo de caja' : 'Ajuste negativo de caja'));
    logActivity('cashbox_adjust', `Ajuste de caja: ${amount >= 0 ? '+' : ''}${state.config.currencySymbol}${amount}`, { amount, description, newTotal: state.cashbox + amount });
    showToast('success', 'Ajuste de caja', `${amount >= 0 ? 'Se agregó' : 'Se restó'} ${state.config.currencySymbol}${Math.abs(amount)} a la caja.`);
  };

  const calculateAvailableCash = (): number => {
    const state = getState();
    // The dashboard should reflect every payment transaction, not just
    // the contributions list. Contributions are logged both as an object in
    // state.contributions and as a transaction of type 'contribution'.
    // Previously we only summed the contributions array, which meant that
    // any payment recorded purely via transactions (e.g. penalidades,
    // corrections) would be ignored. That produced the $120 discrepancy.

    const totalContributionTransactions = (state.transactions || [])
      .filter(t => t.type === 'contribution')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalLoanPayments = (state.transactions || [])
      .filter(t => t.type === 'loan_payment')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalRetentions = (state.transactions || [])
      .filter(t => t.type === 'retention')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalLoanApprovals = (state.transactions || [])
      .filter(t => t.type === 'loan_approval')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalLoanCancels = (state.transactions || [])
      .filter(t => t.type === 'loan_cancel')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Outflows (negative amounts) are already stored with a negative sign
    // in expense/refund transactions, so we can sum them directly.
    const totalExpenses = (state.transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalRefunds = (state.transactions || [])
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalManualAdjustments = (state.transactions || [])
      .filter(t => t.type === 'manual_adjustment')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Available cash is simply the sum of all payment transactions plus any
    // manual adjustments and an opening balance. No date filtering is applied
    // so the value reflects the accumulated total since inception.
    return (
      totalContributionTransactions +
      totalRetentions +
      totalLoanPayments +
      totalLoanApprovals +
      totalLoanCancels +
      totalExpenses +
      totalRefunds +
      totalManualAdjustments +
      state.config.openingBalance
    );
  };

  const getMemberContributions = (memberId: string, year?: number) => {
    const filterYear = year || new Date().getFullYear();
    return getState().contributions.filter(c => c.memberId === memberId && c.month.startsWith(filterYear.toString()));
  };

  const getMemberLoans = (memberId: string) => {
    return getState().loans.filter(l => l.memberId === memberId);
  };

  const getAvailableYears = () => {
    const state = getState();
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();

    state.contributions.forEach(c => { years.add(parseInt(c.month.split('-')[0])); });
    state.transactions.forEach(t => { years.add(new Date(t.date).getFullYear()); });
    years.add(currentYear);
    years.add(currentYear + 1);

    return Array.from(years).sort((a, b) => b - a);
  };

  return {
    addTransaction, setCashbox, adjustCashbox,
    calculateAvailableCash, getMemberContributions, getMemberLoans, getAvailableYears,
  };
}
