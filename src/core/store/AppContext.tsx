import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import {
  Member, Loan, Contribution, Expense, Transaction,
  AppConfig, FontSizeSettings, ThemeSettings, ActivityLog,
} from '../types';
import { getItem as storageGet, setItem as storageSet } from '../lib/storage';
import { AppContextValue, initialState, ActionHelpers } from './types';
import { appReducer } from './reducer';

// Action creators
import { createConfigActions, createDataActions } from './actions/config';
import { createMemberActions } from './actions/members';
import { createLoanActions } from './actions/loans';
import { createContributionActions } from './actions/contributions';
import { createExpenseActions, createRefundActions } from './actions/expenses';
import { createTransactionActions } from './actions/transactions';

// ==================== CONTEXT ====================
const AppContext = createContext<AppContextValue | undefined>(undefined);

// ==================== PROVIDER ====================
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getState = () => stateRef.current;

  // ── 1) Config / Toast / LogActivity (sin dependencias) ──
  const configActions = createConfigActions({ dispatch, getState });

  // ── 2) Transacciones (necesita showToast y logActivity) ──
  const transactionActions = createTransactionActions({
    dispatch,
    getState,
    showToast: configActions.showToast,
    logActivity: configActions.logActivity,
  });

  // ── Helpers compartidos por todos los módulos ──
  const helpers: ActionHelpers = {
    dispatch,
    getState,
    showToast: configActions.showToast,
    logActivity: configActions.logActivity,
    addTransaction: transactionActions.addTransaction,
  };

  // ── 3) Members ──
  const memberActions = createMemberActions(helpers);

  // ── 4) Loans (necesita addLoan ref para refinanciación) ──
  const addLoanRef = { current: null as any };
  const loanActions = createLoanActions(helpers, { addLoanRef, updateMember: memberActions.updateMember });

  // ── 5) Contributions ──
  const contributionActions = createContributionActions(helpers, { updateMember: memberActions.updateMember });

  // ── 6) Expenses & Refunds ──
  const expenseActions = createExpenseActions(helpers);
  const refundActions = createRefundActions(helpers, { updateMember: memberActions.updateMember });

  // ── 7) Data (export/import/CSV/cierre) ──
  const dataActions = createDataActions(helpers, { calculateAvailableCash: transactionActions.calculateAvailableCash });

  // ==================== PERSISTENCE ====================
  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          savedConfig, savedFontSize, savedTheme,
          savedMembers, savedLoans, savedContributions,
          savedExpenses, savedTransactions, savedRefunds,
          savedActivities, savedCashbox,
        ] = await Promise.all([
          storageGet<AppConfig>('coopmanager_config'),
          storageGet<FontSizeSettings>('coopmanager_fontSize'),
          storageGet<ThemeSettings>('coopmanager_theme'),
          storageGet<Member[]>('coopmanager_members'),
          storageGet<Loan[]>('coopmanager_loans'),
          storageGet<Contribution[]>('coopmanager_contributions'),
          storageGet<Expense[]>('coopmanager_expenses'),
          storageGet<Transaction[]>('coopmanager_transactions'),
          storageGet<any[]>('coopmanager_refunds'),
          storageGet<ActivityLog[]>('coopmanager_activities'),
          storageGet<number>('coopmanager_cashbox'),
        ]);

        if (savedConfig) dispatch({ type: 'SET_CONFIG', payload: savedConfig });
        if (savedFontSize) dispatch({ type: 'SET_FONT_SIZE', payload: savedFontSize.base });
        if (savedTheme) dispatch({ type: 'SET_THEME', payload: savedTheme.mode });
        if (savedMembers) dispatch({ type: 'SET_MEMBERS', payload: savedMembers });
        if (savedLoans) dispatch({ type: 'SET_LOANS', payload: savedLoans });
        if (savedContributions) dispatch({ type: 'SET_CONTRIBUTIONS', payload: savedContributions });
        if (savedExpenses) dispatch({ type: 'SET_EXPENSES', payload: savedExpenses });
        if (savedTransactions) dispatch({ type: 'SET_TRANSACTIONS', payload: savedTransactions });
        if (savedRefunds) dispatch({ type: 'SET_REFUNDS', payload: savedRefunds });
        if (savedActivities) dispatch({ type: 'SET_ACTIVITIES', payload: savedActivities });
        if (typeof savedCashbox === 'number') dispatch({ type: 'SET_CASHBOX', payload: savedCashbox });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error al cargar datos' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!state.loading) {
      Promise.all([
        storageSet<AppConfig>('coopmanager_config', state.config),
        storageSet<FontSizeSettings>('coopmanager_fontSize', state.fontSize),
        storageSet<ThemeSettings>('coopmanager_theme', state.theme),
        storageSet<Member[]>('coopmanager_members', state.members),
        storageSet<Loan[]>('coopmanager_loans', state.loans),
        storageSet<Contribution[]>('coopmanager_contributions', state.contributions),
        storageSet<Expense[]>('coopmanager_expenses', state.expenses),
        storageSet<Transaction[]>('coopmanager_transactions', state.transactions),
        storageSet<any[]>('coopmanager_refunds', state.refunds),
        storageSet<ActivityLog[]>('coopmanager_activities', state.activities),
        storageSet<number>('coopmanager_cashbox', state.cashbox),
      ]);
    }
  }, [state, state.loading]);

  // Aplicar tema y tamaño de fuente al DOM
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme.mode === 'dark');
    document.documentElement.style.fontSize = `${state.fontSize.base}rem`;
  }, [state.theme.mode, state.fontSize.base]);

  // ==================== VALUE ====================
  const value: AppContextValue = {
    ...state,
    // Config
    updateConfig: configActions.updateConfig,
    setFontSize: configActions.setFontSize,
    toggleTheme: configActions.toggleTheme,
    clearAllData: configActions.clearAllData,
    showToast: configActions.showToast,
    removeToast: configActions.removeToast,
    // Members
    addMember: memberActions.addMember,
    updateMember: memberActions.updateMember,
    deleteMember: memberActions.deleteMember,
    getMember: memberActions.getMember,
    // Loans
    addLoan: loanActions.addLoan,
    updateLoan: loanActions.updateLoan,
    getLoan: loanActions.getLoan,
    deleteLoan: loanActions.deleteLoan,
    payRetention: loanActions.payRetention,
    payLoanInstallment: loanActions.payLoanInstallment,
    prepayLoan: loanActions.prepayLoan,
    deleteLoanPayment: loanActions.deleteLoanPayment,
    refinanceLoan: loanActions.refinanceLoan,
    // Contributions
    addContribution: contributionActions.addContribution,
    markContributionPaid: contributionActions.markContributionPaid,
    updateContribution: contributionActions.updateContribution,
    deleteContribution: contributionActions.deleteContribution,
    // Expenses
    addExpense: expenseActions.addExpense,
    deleteExpense: expenseActions.deleteExpense,
    // Refunds
    addRefund: refundActions.addRefund,
    updateRefund: refundActions.updateRefund,
    deleteRefund: refundActions.deleteRefund,
    // Transactions
    addTransaction: transactionActions.addTransaction,
    setCashbox: transactionActions.setCashbox,
    adjustCashbox: transactionActions.adjustCashbox,
    calculateAvailableCash: transactionActions.calculateAvailableCash,
    getMemberContributions: transactionActions.getMemberContributions,
    getMemberLoans: transactionActions.getMemberLoans,
    getAvailableYears: transactionActions.getAvailableYears,
    // Data
    performAnnualClosing: dataActions.performAnnualClosing,
    exportData: dataActions.exportData,
    importData: dataActions.importData,
    exportToCSV: dataActions.exportToCSV,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ==================== HOOK ====================
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
}

export default AppProvider;
