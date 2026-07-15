import {
  Member, Loan, Contribution, Expense, Transaction,
  AppConfig, Toast, FontSizeSettings, ThemeSettings,
  MemberFormData, LoanFormData, ContributionFormData, ExpenseFormData,
  Refund, RefundFormData, ActivityLog, ActivityType
} from '../types';
import type { Workspace, WorkspaceIconName } from '../lib/workspaces';

// ==================== ACTIONS ====================
export type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_CONFIG'; payload: Partial<AppConfig> }
  | { type: 'SET_FONT_SIZE'; payload: number }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_MEMBERS'; payload: Member[] }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'SET_LOANS'; payload: Loan[] }
  | { type: 'ADD_LOAN'; payload: Loan }
  | { type: 'UPDATE_LOAN'; payload: Loan }
  | { type: 'DELETE_LOAN'; payload: string }
  | { type: 'SET_CONTRIBUTIONS'; payload: Contribution[] }
  | { type: 'ADD_CONTRIBUTION'; payload: Contribution }
  | { type: 'UPDATE_CONTRIBUTION'; payload: Contribution }
  | { type: 'DELETE_CONTRIBUTION'; payload: string }
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_REFUNDS'; payload: Refund[] }
  | { type: 'ADD_REFUND'; payload: Refund }
  | { type: 'UPDATE_REFUND'; payload: Refund }
  | { type: 'DELETE_REFUND'; payload: string }
  | { type: 'SET_CASHBOX'; payload: number }
  | { type: 'ADJUST_CASHBOX'; payload: number }
  | { type: 'ADD_ACTIVITY'; payload: ActivityLog }
  | { type: 'SET_ACTIVITIES'; payload: ActivityLog[] }
  | { type: 'LOAD_WORKSPACE'; payload: Partial<AppState> }
  | { type: 'CLEAR_ALL_DATA' };

// ==================== STATE ====================
export interface AppState {
  loading: boolean;
  error: string | null;
  toasts: Toast[];
  config: AppConfig;
  fontSize: FontSizeSettings;
  theme: ThemeSettings;
  members: Member[];
  loans: Loan[];
  contributions: Contribution[];
  expenses: Expense[];
  transactions: Transaction[];
  refunds: Refund[];
  cashbox: number;
  activities: ActivityLog[];
}

// ==================== INITIAL VALUES ====================
export const initialConfig: AppConfig = {
  monthlyShareAmount: 25,
  monthlyExpenseAmount: 5,
  penaltyAmount: 5,
  penaltyDayThreshold: 3,
  monthlyInterestRate: 1,
  currencySymbol: '$',
  currencyCode: 'USD',
  transferFee: 0.41,
  retentionRate: 1,
  openingBalance: 0,
  loanPaymentDueDay: 18,
};

export const initialFontSize: FontSizeSettings = {
  base: 1,
  step: 0.1,
  min: 0.8,
  max: 1.4,
};

export const initialTheme: ThemeSettings = {
  mode: 'light',
};

export const initialState: AppState = {
  loading: true,
  error: null,
  toasts: [],
  config: initialConfig,
  fontSize: initialFontSize,
  theme: initialTheme,
  members: [],
  loans: [],
  contributions: [],
  expenses: [],
  transactions: [],
  refunds: [],
  activities: [],
  cashbox: 0,
};

export interface MemberUpdateOptions {
  notify?: boolean;
  logActivity?: boolean;
}

// ==================== CONTEXT VALUE ====================
export interface AppContextValue extends AppState {
  // Configuración
  updateConfig: (config: Partial<AppConfig>) => void;
  setFontSize: (size: number) => void;
  toggleTheme: () => void;
  clearAllData: () => void;

  // Toasts
  showToast: (type: Toast['type'], title: string, message?: string) => void;
  // Workspaces
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  createWorkspace: (name: string, icon?: WorkspaceIconName) => Promise<void>;
  renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;

  updateWorkspaceIcon: (workspaceId: string, icon: WorkspaceIconName) => Promise<void>;
  removeToast: (id: string) => void;

  // Socios
  addMember: (data: MemberFormData) => Member;
  updateMember: (id: string, data: Partial<Member>, options?: MemberUpdateOptions) => void;
  getMember: (id: string) => Member | undefined;

  // Préstamos
  addLoan: (data: LoanFormData, options?: { notify?: boolean }) => Loan;
  updateLoan: (id: string, data: Partial<Loan>) => void;
  getLoan: (id: string) => Loan | undefined;
  deleteLoan: (loanId: string) => void;
  payRetention: (loanId: string) => void;
  payLoanInstallment: (loanId: string, installmentNumber: number) => void;
  prepayLoan: (loanId: string, amount: number, includePenalty?: boolean) => void;
  deleteLoanPayment: (loanId: string) => void;
  refinanceLoan: (loanId: string, newTermMonths: number) => Loan;

  // Aportes
  addContribution: (data: ContributionFormData) => Contribution;
  markContributionPaid: (id: string) => void;
  updateContribution: (id: string, data: Partial<Contribution>) => void;
  deleteContribution: (id: string) => void;

  // Gastos
  addExpense: (data: ExpenseFormData) => Expense;
  updateExpense: (id: string, data: ExpenseFormData) => void;
  deleteExpense: (id: string) => void;

  // Devoluciones
  addRefund: (data: RefundFormData) => Refund;
  updateRefund: (id: string, data: Partial<Refund>) => void;
  deleteRefund: (id: string) => void;

  // Transacciones
  addTransaction: (type: Transaction['type'], amount: number, description: string, referenceId?: string) => void;
  setCashbox: (value: number) => void;
  adjustCashbox: (amount: number, description?: string) => void;

  // Cálculos
  calculateAvailableCash: () => number;
  getMemberContributions: (memberId: string, year?: number) => Contribution[];
  getMemberLoans: (memberId: string) => Loan[];
  performAnnualClosing: () => void;
  getAvailableYears: () => number[];
  exportData: () => Promise<void>;
  importData: (fileBuffer: ArrayBuffer) => Promise<void>;
  exportToCSV: () => void;
}

// Tipo para dispatch que usarán las acciones
export type AppDispatch = React.Dispatch<Action>;

// Helpers compartidos entre módulos de acciones
export interface ActionHelpers {
  dispatch: AppDispatch;
  getState: () => AppState;
  showToast: (type: Toast['type'], title: string, message?: string) => void;
  logActivity: (type: ActivityType, description: string, details?: any, referenceId?: string) => void;
  addTransaction: (type: Transaction['type'], amount: number, description: string, referenceId?: string) => void;
}
