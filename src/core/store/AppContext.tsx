import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Member, Loan, Contribution, Expense, Transaction,
  AppConfig, FontSizeSettings, ThemeSettings, ActivityLog,
} from '../types';
import { getItem as storageGet, setItem as storageSet } from '../lib/storage';
import {
  Workspace,
  WorkspaceDataKey,
  createWorkspace as createWorkspaceRecord,
  deleteWorkspaceData,
  getWorkspaceStorageKey,
  initializeWorkspaces,
  renameWorkspace as renameWorkspaceRecord,
  saveWorkspaces,
  updateWorkspaceIcon as persistWorkspaceIcon,
  setActiveWorkspace as persistActiveWorkspace,
} from '../lib/workspaces';
import { AppContextValue, initialConfig, initialFontSize, initialState, initialTheme, ActionHelpers } from './types';
import { appReducer } from './reducer';
import { createConfigActions, createDataActions } from './actions/config';
import { createMemberActions } from './actions/members';
import { createLoanActions } from './actions/loans';
import { createContributionActions } from './actions/contributions';
import { createExpenseActions, createRefundActions } from './actions/expenses';
import { createTransactionActions } from './actions/transactions';

const AppContext = createContext<AppContextValue | undefined>(undefined);

const workspaceKey = (workspaceId: string, key: WorkspaceDataKey) => getWorkspaceStorageKey(workspaceId, key);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getState = () => stateRef.current;
  const configActions = createConfigActions({ dispatch, getState });
  const transactionActions = createTransactionActions({
    dispatch,
    getState,
    showToast: configActions.showToast,
    logActivity: configActions.logActivity,
  });
  const helpers: ActionHelpers = {
    dispatch,
    getState,
    showToast: configActions.showToast,
    logActivity: configActions.logActivity,
    addTransaction: transactionActions.addTransaction,
  };
  const memberActions = createMemberActions(helpers);
  const addLoanRef = { current: null as any };
  const loanActions = createLoanActions(helpers, { addLoanRef, updateMember: memberActions.updateMember });
  const contributionActions = createContributionActions(helpers, { updateMember: memberActions.updateMember });
  const expenseActions = createExpenseActions(helpers);
  const refundActions = createRefundActions(helpers, { updateMember: memberActions.updateMember });
  const dataActions = createDataActions(helpers, { calculateAvailableCash: transactionActions.calculateAvailableCash, activeWorkspace });

  const loadWorkspace = async (workspace: Workspace) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [
        savedConfig, savedFontSize, savedTheme,
        savedMembers, savedLoans, savedContributions,
        savedExpenses, savedTransactions, savedRefunds,
        savedActivities, savedCashbox,
      ] = await Promise.all([
        storageGet<AppConfig>(workspaceKey(workspace.id, 'coopmanager_config')),
        storageGet<FontSizeSettings>(workspaceKey(workspace.id, 'coopmanager_fontSize')),
        storageGet<ThemeSettings>(workspaceKey(workspace.id, 'coopmanager_theme')),
        storageGet<Member[]>(workspaceKey(workspace.id, 'coopmanager_members')),
        storageGet<Loan[]>(workspaceKey(workspace.id, 'coopmanager_loans')),
        storageGet<Contribution[]>(workspaceKey(workspace.id, 'coopmanager_contributions')),
        storageGet<Expense[]>(workspaceKey(workspace.id, 'coopmanager_expenses')),
        storageGet<Transaction[]>(workspaceKey(workspace.id, 'coopmanager_transactions')),
        storageGet<any[]>(workspaceKey(workspace.id, 'coopmanager_refunds')),
        storageGet<ActivityLog[]>(workspaceKey(workspace.id, 'coopmanager_activities')),
        storageGet<number>(workspaceKey(workspace.id, 'coopmanager_cashbox')),
      ]);

      dispatch({
        type: 'LOAD_WORKSPACE',
        payload: {
          config: savedConfig ?? initialConfig,
          fontSize: savedFontSize ?? initialFontSize,
          theme: savedTheme ?? initialTheme,
          members: savedMembers ?? [],
          loans: savedLoans ?? [],
          contributions: savedContributions ?? [],
          expenses: savedExpenses ?? [],
          transactions: savedTransactions ?? [],
          refunds: savedRefunds ?? [],
          activities: savedActivities ?? [],
          cashbox: savedCashbox ?? 0,
          error: null,
        },
      });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Error al cargar el espacio' });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const workspaceState = await initializeWorkspaces();
        setWorkspaces(workspaceState.workspaces);
        setActiveWorkspace(workspaceState.activeWorkspace);
        await loadWorkspace(workspaceState.activeWorkspace);
      } catch {
        dispatch({ type: 'SET_ERROR', payload: 'Error al inicializar los espacios' });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    void initialize();
  }, []);

  useEffect(() => {
    if (!activeWorkspace || state.loading || isSwitchingWorkspace) return;

    void Promise.all([
      storageSet<AppConfig>(workspaceKey(activeWorkspace.id, 'coopmanager_config'), state.config),
      storageSet<FontSizeSettings>(workspaceKey(activeWorkspace.id, 'coopmanager_fontSize'), state.fontSize),
      storageSet<ThemeSettings>(workspaceKey(activeWorkspace.id, 'coopmanager_theme'), state.theme),
      storageSet<Member[]>(workspaceKey(activeWorkspace.id, 'coopmanager_members'), state.members),
      storageSet<Loan[]>(workspaceKey(activeWorkspace.id, 'coopmanager_loans'), state.loans),
      storageSet<Contribution[]>(workspaceKey(activeWorkspace.id, 'coopmanager_contributions'), state.contributions),
      storageSet<Expense[]>(workspaceKey(activeWorkspace.id, 'coopmanager_expenses'), state.expenses),
      storageSet<Transaction[]>(workspaceKey(activeWorkspace.id, 'coopmanager_transactions'), state.transactions),
      storageSet<any[]>(workspaceKey(activeWorkspace.id, 'coopmanager_refunds'), state.refunds),
      storageSet<ActivityLog[]>(workspaceKey(activeWorkspace.id, 'coopmanager_activities'), state.activities),
      storageSet<number>(workspaceKey(activeWorkspace.id, 'coopmanager_cashbox'), state.cashbox),
    ]);
  }, [activeWorkspace, isSwitchingWorkspace, state]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${state.fontSize.base}rem`;
  }, [state.fontSize.base]);

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace || workspace.id === activeWorkspace?.id) return;
    setIsSwitchingWorkspace(true);
    try {
      await persistActiveWorkspace(workspace.id);
      setActiveWorkspace(workspace);
      await loadWorkspace(workspace);
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  const createWorkspace = async (name: string, icon: import('../lib/workspaces').WorkspaceIconName = 'building') => {
    const workspace = await createWorkspaceRecord(name, icon);
    setIsSwitchingWorkspace(true);
    try {
      await persistActiveWorkspace(workspace.id);
      setWorkspaces((current) => [...current, workspace]);
      setActiveWorkspace(workspace);
      await loadWorkspace(workspace);
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  const renameWorkspace = async (workspaceId: string, name: string) => {
    const updated = await renameWorkspaceRecord(workspaceId, name);
    setWorkspaces(updated);
    setActiveWorkspace((current) => updated.find((workspace) => workspace.id === current?.id) ?? null);
  };

  const updateWorkspaceIcon = async (workspaceId: string, icon: import('../lib/workspaces').WorkspaceIconName) => {
    const updated = await persistWorkspaceIcon(workspaceId, icon);
    setWorkspaces(updated);
    setActiveWorkspace((current) => updated.find((workspace) => workspace.id === current?.id) ?? null);
  };

  const deleteWorkspace = async (workspaceId: string) => {
    if (workspaces.length <= 1) throw new Error('Debe existir al menos un espacio.');
    const remaining = workspaces.filter((workspace) => workspace.id !== workspaceId);
    const nextWorkspace = remaining[0];
    setIsSwitchingWorkspace(true);
    try {
      await deleteWorkspaceData(workspaceId);
      await saveWorkspaces(remaining);
      setWorkspaces(remaining);
      if (activeWorkspace?.id === workspaceId) {
        await persistActiveWorkspace(nextWorkspace.id);
        setActiveWorkspace(nextWorkspace);
        await loadWorkspace(nextWorkspace);
      }
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  const clearAllData = async () => {
    if (!activeWorkspace) return;
    await deleteWorkspaceData(activeWorkspace.id);
    dispatch({ type: 'CLEAR_ALL_DATA' });
    configActions.showToast('warning', 'Datos eliminados', 'Los datos de este espacio han sido borrados permanentemente.');
  };

  const value: AppContextValue = {
    ...state,
    workspaces,
    activeWorkspace,
    createWorkspace,
    renameWorkspace,
    updateWorkspaceIcon,
    deleteWorkspace,
    switchWorkspace,
    updateConfig: configActions.updateConfig,
    setFontSize: configActions.setFontSize,
    toggleTheme: configActions.toggleTheme,
    clearAllData,
    showToast: configActions.showToast,
    removeToast: configActions.removeToast,
    addMember: memberActions.addMember,
    updateMember: memberActions.updateMember,
    getMember: memberActions.getMember,
    addLoan: loanActions.addLoan,
    updateLoan: loanActions.updateLoan,
    getLoan: loanActions.getLoan,
    deleteLoan: loanActions.deleteLoan,
    payRetention: loanActions.payRetention,
    payLoanInstallment: loanActions.payLoanInstallment,
    prepayLoan: loanActions.prepayLoan,
    deleteLoanPayment: loanActions.deleteLoanPayment,
    refinanceLoan: loanActions.refinanceLoan,
    addContribution: contributionActions.addContribution,
    markContributionPaid: contributionActions.markContributionPaid,
    updateContribution: contributionActions.updateContribution,
    deleteContribution: contributionActions.deleteContribution,
    addExpense: expenseActions.addExpense,
    updateExpense: expenseActions.updateExpense,
    deleteExpense: expenseActions.deleteExpense,
    addRefund: refundActions.addRefund,
    updateRefund: refundActions.updateRefund,
    deleteRefund: refundActions.deleteRefund,
    addTransaction: transactionActions.addTransaction,
    setCashbox: transactionActions.setCashbox,
    adjustCashbox: transactionActions.adjustCashbox,
    calculateAvailableCash: transactionActions.calculateAvailableCash,
    getMemberContributions: transactionActions.getMemberContributions,
    getMemberLoans: transactionActions.getMemberLoans,
    getAvailableYears: transactionActions.getAvailableYears,
    performAnnualClosing: dataActions.performAnnualClosing,
    exportData: dataActions.exportData,
    importData: dataActions.importData,
    exportToCSV: dataActions.exportToCSV,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp debe usarse dentro de un AppProvider');
  return context;
}

export default AppProvider;
