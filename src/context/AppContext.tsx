import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { 
  Member, Loan, Contribution, Expense, Transaction, 
  AppConfig, Toast, FontSizeSettings, ThemeSettings,
  MemberFormData, LoanFormData, ContributionFormData, ExpenseFormData,
  Refund, RefundFormData, ActivityLog, ActivityType
} from '../types';
import { useFinance } from '../hooks/useFinance';
import { calculateFrenchAmortization } from '../hooks/useFinance';
import { v4 as uuidv4 } from 'uuid';
import { getItem as storageGet, setItem as storageSet, clearAll as storageClear } from '../utils/storage';

// ==================== ESTADO INICIAL ====================
const initialConfig: AppConfig = {
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
};

const initialFontSize: FontSizeSettings = {
  base: 1,
  step: 0.1,
  min: 0.8,
  max: 1.4,
};

const initialTheme: ThemeSettings = {
  mode: 'light',
};

// ==================== ACTIONS ====================
type Action =
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
  | { type: 'DELETE_MEMBER'; payload: string }
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
  | { type: 'SET_REFUNDS'; payload: Refund[] }
  | { type: 'ADD_REFUND'; payload: Refund }
  | { type: 'UPDATE_REFUND'; payload: Refund }
  | { type: 'DELETE_REFUND'; payload: string }
  | { type: 'SET_CASHBOX'; payload: number }
  | { type: 'ADJUST_CASHBOX'; payload: number }
  | { type: 'ADD_ACTIVITY'; payload: ActivityLog }
  | { type: 'SET_ACTIVITIES'; payload: ActivityLog[] }
  | { type: 'CLEAR_ALL_DATA' };

// ==================== REDUCER ====================
interface AppState {
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
  cashbox: number; // Ajuste manual de caja
  activities: ActivityLog[]; // Registro de actividades
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: { ...state.fontSize, base: action.payload } };
    case 'SET_THEME':
      return { ...state, theme: { ...state.theme, mode: action.payload } };
    case 'SET_MEMBERS':
      return { ...state, members: action.payload };
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    case 'UPDATE_MEMBER':
      return { 
        ...state, 
        members: state.members.map(m => m.id === action.payload.id ? action.payload : m) 
      };
    case 'DELETE_MEMBER':
      return { ...state, members: state.members.filter(m => m.id !== action.payload) };
    case 'SET_LOANS':
      return { ...state, loans: action.payload };
    case 'ADD_LOAN':
      return { ...state, loans: [...state.loans, action.payload] };
    case 'UPDATE_LOAN':
      return { 
        ...state, 
        loans: state.loans.map(l => l.id === action.payload.id ? action.payload : l) 
      };
    case 'DELETE_LOAN':
      return { ...state, loans: state.loans.filter(l => l.id !== action.payload) };
    case 'SET_CONTRIBUTIONS':
      return { ...state, contributions: action.payload };
    case 'ADD_CONTRIBUTION':
      return { ...state, contributions: [...state.contributions, action.payload] };
    case 'UPDATE_CONTRIBUTION':
      return { 
        ...state, 
        contributions: state.contributions.map(c => c.id === action.payload.id ? action.payload : c) 
      };
    case 'DELETE_CONTRIBUTION':
      return { ...state, contributions: state.contributions.filter(c => c.id !== action.payload) };
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'SET_REFUNDS':
      return { ...state, refunds: action.payload };
    case 'ADD_REFUND':
      return { ...state, refunds: [...state.refunds, action.payload] };
    case 'UPDATE_REFUND':
      return { 
        ...state, 
        refunds: state.refunds.map(r => r.id === action.payload.id ? action.payload : r) 
      };
    case 'DELETE_REFUND':
      return { ...state, refunds: state.refunds.filter(r => r.id !== action.payload) };
    case 'SET_CASHBOX':
      return { ...state, cashbox: action.payload };
    case 'ADJUST_CASHBOX':
      return { ...state, cashbox: state.cashbox + action.payload };
    case 'ADD_ACTIVITY':
      return { ...state, activities: [...state.activities, action.payload] };
    case 'SET_ACTIVITIES':
      return { ...state, activities: action.payload };
    case 'CLEAR_ALL_DATA':
      return {
        ...state,
        config: initialConfig,
        members: [],
        loans: [],
        contributions: [],
        expenses: [],
        transactions: [],
        refunds: [],
        activities: [],
        cashbox: 0,
      };
    default:
      return state;
  }
}

// ==================== CONTEXT ====================
interface AppContextValue extends AppState {
  // Configuración
  updateConfig: (config: Partial<AppConfig>) => void;
  setFontSize: (size: number) => void;
  toggleTheme: () => void;
  clearAllData: () => void;
  
  // Toasts
  showToast: (type: Toast['type'], title: string, message?: string) => void;
  
  // Socios
  addMember: (data: MemberFormData) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  getMember: (id: string) => Member | undefined;
  
  // Préstamos
  addLoan: (data: LoanFormData) => Loan;
  updateLoan: (id: string, data: Partial<Loan>) => void;
  getLoan: (id: string) => Loan | undefined;
  deleteLoan: (loanId: string) => void;
  payRetention: (loanId: string) => void;
  payLoanInstallment: (loanId: string, installmentNumber: number) => void;
  prepayLoan: (loanId: string, amount: number) => void;
  refinanceLoan: (loanId: string, newTermMonths: number) => Loan;
  
  // Aportes
  addContribution: (data: ContributionFormData) => Contribution;
  markContributionPaid: (id: string) => void;
  updateContribution: (id: string, data: Partial<Contribution>) => void;
  deleteContribution: (id: string) => void;
  
  // Gastos
  addExpense: (data: ExpenseFormData) => Expense;
  deleteExpense: (id: string) => void;
  
  // Devoluciones
  addRefund: (data: RefundFormData) => Refund;
  updateRefund: (id: string, data: Partial<Refund>) => void;
  deleteRefund: (id: string) => void;
  
  // Transacciones
  addTransaction: (type: Transaction['type'], amount: number, description: string, referenceId?: string) => void;
  // Caja
  setCashbox: (value: number) => void;
  adjustCashbox: (amount: number, description?: string) => void;
  
  // Cálculos
  calculateAvailableCash: () => number;
  getMemberContributions: (memberId: string, year?: number) => Contribution[];
  getMemberLoans: (memberId: string) => Loan[];
  performAnnualClosing: () => void;
  getAvailableYears: () => number[];
  exportData: () => void;
  importData: (jsonData: string) => void;
  exportToCSV: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ==================== PROVIDER ====================
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
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
  });

  const { } = useFinance();

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedConfig = await storageGet<AppConfig>('coopmanager_config');
        const savedFontSize = await storageGet<FontSizeSettings>('coopmanager_fontSize');
        const savedTheme = await storageGet<ThemeSettings>('coopmanager_theme');
        const savedMembers = await storageGet<Member[]>('coopmanager_members');
        const savedLoans = await storageGet<Loan[]>('coopmanager_loans');
        const savedContributions = await storageGet<Contribution[]>('coopmanager_contributions');
        const savedExpenses = await storageGet<Expense[]>('coopmanager_expenses');
        const savedTransactions = await storageGet<Transaction[]>('coopmanager_transactions');
        const savedRefunds = await storageGet<Refund[]>('coopmanager_refunds');
        const savedActivities = await storageGet<ActivityLog[]>('coopmanager_activities');
        const savedCashbox = await storageGet<number>('coopmanager_cashbox');

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

        // Ya no hay datos de ejemplo, el sistema inicia vacío




      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error al cargar datos' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadData();
  }, []);

  // Guardar datos en IndexedDB cuando cambian
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
        storageSet<Refund[]>('coopmanager_refunds', state.refunds),
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

  // Funciones del Context
  const updateConfig = (config: Partial<AppConfig>) => {
    const oldConfig = state.config;
    dispatch({ type: 'SET_CONFIG', payload: config });
    logActivity('config_update', 'Configuración actualizada', { old: oldConfig, new: { ...oldConfig, ...config } });
    showToast('success', 'Configuración actualizada');
  };

  const setFontSize = (size: number) => {
    const newSize = Math.max(state.fontSize.min, Math.min(state.fontSize.max, size));
    dispatch({ type: 'SET_FONT_SIZE', payload: newSize });
  };

  const toggleTheme = () => {
    const newMode = state.theme.mode === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: newMode });
  };

  const clearAllData = () => {
    // Limpiar almacenamiento persistente
    storageClear().then(() => {
      dispatch({ type: 'CLEAR_ALL_DATA' });
      showToast('warning', 'Datos eliminados', 'Todos los datos han sido borrados permanentemente.');
    });
  };

  const showToast = (type: Toast['type'], title: string, message?: string) => {
    const toast: Toast = {
      id: uuidv4(),
      type,
      title,
      message,
      duration: 5000,
    };
    dispatch({ type: 'ADD_TOAST', payload: toast });
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: toast.id });
    }, 5000);
  };

  // Registro de actividades
  const logActivity = (type: ActivityType, description: string, details?: any, referenceId?: string) => {
    const activity: ActivityLog = {
      id: uuidv4(),
      type,
      description,
      details: details ? JSON.stringify(details) : undefined,
      referenceId,
      timestamp: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ACTIVITY', payload: activity });
  };

  // Socios
  const addMember = (data: MemberFormData): Member => {
    const member: Member = {
      id: uuidv4(),
      ...data,
      status: 'active',
      totalContributions: 0,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MEMBER', payload: member });
    logActivity('member_add', `Socio agregado: ${member.name}`, { member }, member.id);
    showToast('success', 'Socio creado', `${member.name} ha sido agregado exitosamente.`);
    return member;
  };

  const updateMember = (id: string, data: Partial<Member>) => {
    const member = state.members.find(m => m.id === id);
    if (member) {
      const updated: Member = {
        ...member,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_MEMBER', payload: updated });
      logActivity('member_edit', `Socio actualizado: ${member.name}`, { old: member, new: updated }, id);
      showToast('success', 'Socio actualizado');
    }
  };

  const deleteMember = (id: string) => {
    const member = state.members.find(m => m.id === id);
    dispatch({ type: 'DELETE_MEMBER', payload: id });
    if (member) logActivity('member_delete', `Socio eliminado: ${member.name}`, { member }, id);
    showToast('success', 'Socio eliminado');
  };

  const getMember = (id: string) => state.members.find(m => m.id === id);

  // Préstamos
  const addLoan = (data: LoanFormData): Loan => {
    const member = state.members.find(m => m.id === data.memberId);
    
    // Usar retentionAmount pasado desde el formulario, si no, usar el config
    const retentionAmount = data.retentionAmount !== undefined 
      ? Number(data.retentionAmount.toFixed(2))
      : Number((data.amount * state.config.retentionRate / 100).toFixed(2));
    
    // Calcular amortización incluyendo transferencias en la cuota mensual
    const amortization = calculateFrenchAmortization(
      data.amount,
      data.monthlyInterestRate,
      data.termMonths,
      data.startDate,
      state.config.transferFee
    );
    
    const loan: Loan = {
      id: uuidv4(),
      memberId: data.memberId,
      memberName: member?.name || 'Desconocido',
      amount: data.amount,
      monthlyInterestRate: data.monthlyInterestRate,
      termMonths: data.termMonths,
      monthlyPayment: amortization.monthlyPayment, // Incluye capital + interés + transferencia distribuida
      totalInterest: amortization.totalInterest,
      totalAmount: amortization.totalAmount, // Incluye capital + intereses + transferencias
      paidPrincipal: 0,
      remainingPrincipal: amortization.monthlyPayment * data.termMonths, // Saldo pendiente = cuota mensual * meses
      paidInstallments: 0,
      totalInstallments: data.termMonths,
      startDate: data.startDate,
      endDate: amortization.schedule[amortization.schedule.length - 1].dueDate,
      status: data.retentionPaid ? 'active' : 'pending_retention', // Estado basado en retención
      notes: data.notes,
      createdAt: new Date().toISOString(),
      transferFee: state.config.transferFee, // Se cobra por pago real
      retentionAmount,
      retentionPaid: data.retentionPaid || false,
      schedule: amortization.schedule, // Tabla de amortización completa
    };

    dispatch({ type: 'ADD_LOAN', payload: loan });

    // Registrar transacciones contables solo si la retención fue pagada
    if (data.retentionPaid) {
      addTransaction('retention', Number(retentionAmount), `Retención (suministros) - ${member?.name}`);
    }
    addTransaction('loan_approval', -Number(data.amount), `Desembolso de préstamo a ${member?.name}`, loan.id);

    logActivity('loan_add', `Préstamo aprobado: ${member?.name} - ${state.config.currencySymbol}${data.amount}`, { loan }, loan.id);
    showToast('success', 'Préstamo aprobado', data.retentionPaid 
      ? `Préstamo de ${state.config.currencySymbol}${data.amount} desembolsado. Retención cobrada: ${state.config.currencySymbol}${retentionAmount}`
      : `Préstamo de ${state.config.currencySymbol}${data.amount} creado. Pendiente pago de retención: ${state.config.currencySymbol}${retentionAmount}`);
    return loan;
  };

  const updateLoan = (id: string, data: Partial<Loan>) => {
    const loan = state.loans.find(l => l.id === id);
    if (loan) {
      const updated: Loan = { ...loan, ...data };
      dispatch({ type: 'UPDATE_LOAN', payload: updated });
    }
  };

  const getLoan = (id: string) => state.loans.find(l => l.id === id);

  const deleteLoan = (loanId: string) => {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan) return;

    // Buscar transacción de desembolso
    const disbursementTransaction = state.transactions.find(t => t.type === 'loan_approval' && t.referenceId === loanId);
    
    // Si existe la transacción de desembolso, crear ajuste para restaurar el capital
    if (disbursementTransaction) {
      addTransaction('manual_adjustment', Number(loan.amount), `Anulación de préstamo - ${loan.memberName}`);
    }

    // Si la retención fue pagada, devolver el dinero de la retención
    if (loan.retentionPaid) {
      addTransaction('manual_adjustment', -Number(loan.retentionAmount), `Devolución de retención por anulación - ${loan.memberName}`);
    }

    // Eliminar transacciones relacionadas con el préstamo
    const updatedTransactions = state.transactions.filter(t => t.referenceId !== loanId);
    dispatch({ type: 'SET_TRANSACTIONS', payload: updatedTransactions });

    // Eliminar el préstamo
    dispatch({ type: 'DELETE_LOAN', payload: loanId });

    // Registrar actividad
    logActivity('loan_delete', 'Préstamo eliminado', { loan }, loanId);
    showToast('success', `Préstamo eliminado. Se han restaurado ${state.config.currencySymbol}${loan.amount} a la caja.`);
  };

  // Pagar retención y activar préstamo
  const payRetention = (loanId: string) => {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || loan.status !== 'pending_retention') return;

    const member = state.members.find(m => m.id === loan.memberId);

    // Actualizar préstamo a activo
    const updatedLoan: Loan = {
      ...loan,
      status: 'active',
      retentionPaid: true,
    };
    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    // Registrar transacción de retención
    addTransaction('retention', Number(loan.retentionAmount) || 0, `Retención (suministros) - ${member?.name}`);
    logActivity('loan_retention_pay', `Retención pagada: ${member?.name} - ${state.config.currencySymbol}${loan.retentionAmount}`, { loan }, loanId);
    showToast('success', 'Retención cobrada', `Se cobró ${state.config.currencySymbol}${loan.retentionAmount} por retención. Préstamo activado.`);
  };

  const payLoanInstallment = (loanId: string, installmentNumber: number) => {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || installmentNumber < 1 || installmentNumber > loan.totalInstallments) return;

    // Marcar la cuota como pagada en el schedule
    const updatedSchedule = loan.schedule.map(entry =>
      entry.installmentNumber === installmentNumber ? { ...entry, status: 'paid' as const } : entry
    );

    // Calcular nuevo saldo pendiente: suma de payments de cuotas pendientes
    const newRemainingPrincipal = updatedSchedule.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.payment, 0);
    const newPaidPrincipal = loan.totalAmount - newRemainingPrincipal;

    // Actualizar cuotas pagadas
    const newPaidInstallments = loan.paidInstallments + 1;

    // Si no quedan cuotas pendientes, marcar como pagado
    const isFullyPaid = newRemainingPrincipal <= 0.01;
    const finalRemainingPrincipal = isFullyPaid ? 0 : newRemainingPrincipal;
    const finalPaidPrincipal = isFullyPaid ? loan.totalAmount : newPaidPrincipal;
    const newStatus: Loan['status'] = isFullyPaid ? 'paid' : loan.status;

    const updatedLoan: Loan = {
      ...loan,
      schedule: updatedSchedule,
      paidInstallments: newPaidInstallments,
      paidPrincipal: finalPaidPrincipal,
      remainingPrincipal: finalRemainingPrincipal, // Saldo pendiente = suma de cuotas pendientes
      status: newStatus,
    };

    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    // Registrar transacción
    const member = state.members.find(m => m.id === loan.memberId);
    const installmentAmount = Number(loan.monthlyPayment) || 0;
    const transferFee = Number(state.config.transferFee) || 0; // $0.41 por pago
    const totalPayment = installmentAmount + transferFee;
    addTransaction('loan_payment', Number(totalPayment), `Pago cuota ${installmentNumber} - ${member?.name} (Cuota: ${state.config.currencySymbol}${installmentAmount}, Transferencia: ${state.config.currencySymbol}${transferFee})`);
    logActivity('loan_pay', `Cuota pagada: ${member?.name} - Cuota ${installmentNumber}/${loan.totalInstallments}`, { loanId, installmentNumber, amount: totalPayment }, loanId);

    if (newStatus === 'paid') {
      showToast('success', 'Préstamo pagado', 'Todas las cuotas han sido canceladas.');
    } else {
      showToast('success', 'Pago registrado', `Cuota ${installmentNumber} pagada.`);
    }
  };

  const prepayLoan = (loanId: string, amount: number) => {
    const loan = state.loans.find(l => l.id === loanId);
    if (!loan || amount <= 0) return;

    // Calcular el monto total del pago (capital + transferencia)
    const transferFee = state.config.transferFee; // $0.41 por pago
    const totalPayment = amount + transferFee;

    // Aplicar el pago al capital restante
    const newRemaining = Math.round((loan.remainingPrincipal - amount) * 100) / 100;
    const actualPaymentApplied = Math.min(amount, loan.remainingPrincipal);
    const newPaidPrincipal = Math.round((loan.paidPrincipal + actualPaymentApplied) * 100) / 100;

    // Si el capital restante llega a cero (o menos de $0.01), marcar como pagado
    const isFullyPaid = Math.abs(newRemaining) <= 0.01;
    const finalRemaining = isFullyPaid ? 0 : Math.max(0, newRemaining);
    const finalPaidPrincipal = isFullyPaid ? loan.amount : newPaidPrincipal;
    const newStatus: Loan['status'] = isFullyPaid ? 'paid' : loan.status;

    // Calcular cuotas pagadas (aproximado, no preciso pero conservador)
    const estimatedInstallmentsPaid = Math.min(
      Math.floor(actualPaymentApplied / loan.monthlyPayment) + loan.paidInstallments,
      loan.totalInstallments
    );
    const newPaidInstallments = isFullyPaid ? loan.totalInstallments : estimatedInstallmentsPaid;

    const updatedLoan: Loan = {
      ...loan,
      remainingPrincipal: finalRemaining, // Saldo pendiente = capital restante
      paidPrincipal: finalPaidPrincipal,
      paidInstallments: newPaidInstallments,
      status: newStatus,
    };

    dispatch({ type: 'UPDATE_LOAN', payload: updatedLoan });

    // Registrar transacción con el monto total pagado (capital + transferencia)
    const member = state.members.find(m => m.id === loan.memberId);
    addTransaction('loan_payment', totalPayment, `Pago préstamo - ${member?.name} (Capital: ${state.config.currencySymbol}${actualPaymentApplied}, Transferencia: ${state.config.currencySymbol}${transferFee})`);

    if (isFullyPaid) {
      showToast('success', 'Préstamo liquidado', `El préstamo ha sido pagado completamente.`);
    } else {
      showToast('success', 'Pago registrado', `Se aplicó ${state.config.currencySymbol}${actualPaymentApplied} al capital. Saldo pendiente: ${state.config.currencySymbol}${finalRemaining}`);
    }
  };

  const refinanceLoan = (loanId: string, newTermMonths: number): Loan => {
    const oldLoan = state.loans.find(l => l.id === loanId);
    if (!oldLoan || oldLoan.status !== 'active') {
      showToast('error', 'Error', 'No se puede refinanciar este préstamo.');
      throw new Error('No se puede refinanciar');
    }

    // Marcar préstamo anterior como refinanciado
    const refinancedLoan: Loan = {
      ...oldLoan,
      status: 'refinanced',
    };
    dispatch({ type: 'UPDATE_LOAN', payload: refinancedLoan });

    // Crear nuevo préstamo con el capital pendiente
    const member = state.members.find(m => m.id === oldLoan.memberId);
    const newLoan = addLoan({
      memberId: oldLoan.memberId,
      amount: oldLoan.remainingPrincipal,
      monthlyInterestRate: state.config.monthlyInterestRate,
      termMonths: newTermMonths,
      startDate: new Date().toISOString().split('T')[0],
      notes: `Refinanciación del préstamo ${oldLoan.id}`,
    });

    // Actualizar nuevo préstamo para marcarlo como refinanciado
    updateLoan(newLoan.id, { refinancedFromId: loanId });

    showToast('success', 'Préstamo refinanciado', `Nuevo préstamo creado con ${newTermMonths} cuotas.`);
    return newLoan;
  };

  // Aportes
  const addContribution = (data: ContributionFormData): Contribution => {
    const member = state.members.find(m => m.id === data.memberId);
    const totalAmount = data.shareAmount + data.expenseAmount + (data.penaltyAmount || 0);

    const contribution: Contribution = {
      id: uuidv4(),
      memberId: data.memberId,
      month: data.month,
      shareAmount: data.shareAmount,
      expenseAmount: data.expenseAmount,
      penaltyAmount: data.penaltyAmount || 0,
      totalAmount,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      dueDate: `${data.month}-05`,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_CONTRIBUTION', payload: contribution });

    // Registrar transacción
    addTransaction('contribution', totalAmount, `Aporte - ${data.month}`);

    // Actualizar balance del socio
    if (member) {
      updateMember(member.id, {
        totalContributions: member.totalContributions + totalAmount,
        currentBalance: member.currentBalance + totalAmount,
      });
    }

    showToast('success', 'Aporte pagado', `Aporte de ${state.config.currencySymbol}${totalAmount} registrado y pagado.`);
    return contribution;
  };

  const markContributionPaid = (id: string) => {
    const contribution = state.contributions.find(c => c.id === id);
    if (!contribution) return;

    const updated: Contribution = {
      ...contribution,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
    };

    dispatch({ type: 'UPDATE_CONTRIBUTION', payload: updated });
    addTransaction('contribution', contribution.totalAmount, `Aporte - ${contribution.month}`);
    logActivity('contribution_pay', `Aporte pagado: ${contribution.month} - ${state.config.currencySymbol}${contribution.totalAmount}`, { contribution: updated }, id);
    showToast('success', 'Pago registrado', 'El aporte ha sido marcado como pagado.');
  };

  const updateContribution = (id: string, data: Partial<Contribution>) => {
    const contribution = state.contributions.find(c => c.id === id);
    if (!contribution) return;
    
    const updated: Contribution = { ...contribution, ...data };
    dispatch({ type: 'UPDATE_CONTRIBUTION', payload: updated });
    
    // Recalcular total del miembro si cambió el monto
    if (data.shareAmount !== undefined || data.expenseAmount !== undefined || data.penaltyAmount !== undefined) {
      const member = state.members.find(m => m.id === updated.memberId);
      if (member && updated.status === 'paid') {
        const memberContribs = state.contributions
          .filter(c => c.memberId === member.id && c.status === 'paid')
          .map(c => c.id === id ? updated : c);
        const totalContributions = memberContribs.reduce((sum, c) => sum + c.totalAmount, 0);
        updateMember(member.id, { totalContributions });
      }
    }
    
    logActivity('contribution_edit', `Aporte editado: ${contribution.month}`, 
      { old: contribution, new: updated }, id);
    showToast('success', 'Aporte actualizado');
  };

  const deleteContribution = (id: string) => {
    const contribution = state.contributions.find(c => c.id === id);
    if (!contribution) return;
    
    dispatch({ type: 'DELETE_CONTRIBUTION', payload: id });
    
    // Actualizar total del miembro
    const member = state.members.find(m => m.id === contribution.memberId);
    if (member && contribution.status === 'paid') {
      const memberContribs = state.contributions
        .filter(c => c.memberId === member.id && c.status === 'paid' && c.id !== id);
      const totalContributions = memberContribs.reduce((sum, c) => sum + c.totalAmount, 0);
      updateMember(member.id, { totalContributions });
    }
    
    // Revertir la transacción si estaba pagado
    if (contribution.status === 'paid') {
      addTransaction('manual_adjustment', -contribution.totalAmount, `Reverso aporte eliminado - ${contribution.month}`);
    }
    
    logActivity('contribution_delete', `Aporte eliminado: ${contribution.month}`, contribution, id);
    showToast('success', 'Aporte eliminado');
  };

  // Gastos
  const addExpense = (data: ExpenseFormData): Expense => {
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
    const expense = state.expenses.find(e => e.id === id);
    dispatch({ type: 'SET_EXPENSES', payload: state.expenses.filter(e => e.id !== id) });
    if (expense) logActivity('expense_delete', `Gasto eliminado: ${expense.description}`, { expense }, id);
    showToast('success', 'Gasto eliminado');
  };

  // Devoluciones
  const addRefund = (data: RefundFormData): Refund => {
    const member = state.members.find(m => m.id === data.memberId);
    const refund: Refund = {
      id: uuidv4(),
      ...data,
      memberName: member?.name || 'Desconocido',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_REFUND', payload: refund });
    
    // Registrar como gasto (salida de dinero)
    addTransaction('refund', -data.amount, `Devolución por retiro - ${member?.name}: ${data.reason}`);
    logActivity('refund_add', `Devolución registrada: ${member?.name} - ${state.config.currencySymbol}${data.amount}`, { refund }, refund.id);
    showToast('success', 'Devolución registrada', `${state.config.currencySymbol}${data.amount} devuelto a ${member?.name}.`);
    return refund;
  };

  const updateRefund = (id: string, data: Partial<Refund>) => {
    const refund = state.refunds.find(r => r.id === id);
    if (refund) {
      const updated: Refund = {
        ...refund,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_REFUND', payload: updated });
      showToast('success', 'Devolución actualizada');
    }
  };

  const deleteRefund = (id: string) => {
    dispatch({ type: 'DELETE_REFUND', payload: id });
    showToast('success', 'Devolución eliminada');
  };

  // Transacciones
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

  // Caja
  const setCashbox = (value: number) => {
    dispatch({ type: 'SET_CASHBOX', payload: value });
    showToast('success', 'Caja actualizada');
  };

  const adjustCashbox = (amount: number, description?: string) => {
    if (!amount) return;
    dispatch({ type: 'ADJUST_CASHBOX', payload: amount });
    addTransaction('manual_adjustment', amount, description || (amount >= 0 ? 'Ajuste positivo de caja' : 'Ajuste negativo de caja'));
    logActivity('cashbox_adjust', `Ajuste de caja: ${amount >= 0 ? '+' : ''}${state.config.currencySymbol}${amount}`, { amount, description, newTotal: state.cashbox + amount });
    showToast('success', 'Ajuste de caja', `${amount >= 0 ? 'Se agregó' : 'Se restó'} ${state.config.currencySymbol}${Math.abs(amount)} a la caja.`);
  };

  // Cálculos
  const calculateAvailableCash = useCallback((): number => {
    // Aportes totales pagados (shareAmount + expenseAmount + penaltyAmount)
    const totalContributionsIncome = (state.contributions || []).filter(c => c.status === 'paid').reduce((sum, c) => sum + ((c.shareAmount || 0) + (c.expenseAmount || 0) + (c.penaltyAmount || 0)), 0);
    
    // Pagos de préstamos (cuotas)
    const totalLoanPayments = (state.transactions || []).filter(t => t.type === 'loan_payment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Retenciones pagadas
    const totalRetentions = (state.transactions || []).filter(t => t.type === 'retention').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Desembolsos de préstamos (egresos)
    const totalLoanApprovals = (state.transactions || []).filter(t => t.type === 'loan_approval').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Cancelaciones de préstamos (ingresos)
    const totalLoanCancels = (state.transactions || []).filter(t => t.type === 'loan_cancel').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Gastos
    const totalExpenses = (state.transactions || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Reintegros
    const totalRefunds = (state.transactions || []).filter(t => t.type === 'refund').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    // Ajustes manuales
    const totalManualAdjustments = (state.transactions || []).filter(t => t.type === 'manual_adjustment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    
    return totalContributionsIncome + totalRetentions + totalLoanPayments + totalLoanApprovals + totalLoanCancels + totalExpenses + totalRefunds + totalManualAdjustments + state.config.openingBalance;
  }, [state.contributions, state.transactions]);

  const getMemberContributions = useCallback((memberId: string, year?: number) => {
    const filterYear = year || new Date().getFullYear();
    return state.contributions.filter(c => c.memberId === memberId && c.month.startsWith(filterYear.toString()));
  }, [state.contributions]);

  const getMemberLoans = useCallback((memberId: string) => {
    return state.loans.filter(l => l.memberId === memberId);
  }, [state.loans]);

  const performAnnualClosing = useCallback(() => {
    const currentBalance = calculateAvailableCash();
    updateConfig({ openingBalance: currentBalance });
    logActivity('annual_closing', 'Cierre de Ejercicio Contable finalizado', { openingBalance: currentBalance });
    showToast('success', 'Cierre exitoso', '¡Cierre exitoso! Se recomienda descargar un respaldo ahora para asegurar el saldo inicial del nuevo año.');
  }, [calculateAvailableCash, updateConfig, logActivity, showToast]);

  const getAvailableYears = useCallback(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Años de aportes
    state.contributions.forEach(c => {
      const year = parseInt(c.month.split('-')[0]);
      years.add(year);
    });
    
    // Años de transacciones
    state.transactions.forEach(t => {
      const year = new Date(t.date).getFullYear();
      years.add(year);
    });
    
    // Siempre incluir el año actual y el siguiente
    years.add(currentYear);
    years.add(currentYear + 1);
    
    return Array.from(years).sort((a, b) => b - a); // Más reciente primero
  }, [state.contributions, state.transactions]);

  const exportData = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const data = {
      config: state.config,
      members: state.members,
      loans: state.loans,
      contributions: state.contributions,
      expenses: state.expenses,
      transactions: state.transactions,
      refunds: state.refunds,
      activities: state.activities,
      cashbox: state.cashbox,
      exportDate: today,
      version: '1.0'
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cooperativa_Respaldo_${today}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast('success', 'Archivo generado con éxito', 'Guárdalo en un lugar seguro.');
  }, [state, showToast]);

  const importData = useCallback(async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      
      // Verificación de formato
      console.log('Archivo JSON cargado:', {
        hasMembers: Array.isArray(data.members),
        hasLoans: Array.isArray(data.loans),
        membersCount: data.members?.length || 0,
        loansCount: data.loans?.length || 0,
        hasConfig: !!data.config,
        hasContributions: !!data.contributions
      });
      
      // Validar estructura básica
      if (!data.config || !Array.isArray(data.members) || !Array.isArray(data.loans) || !Array.isArray(data.contributions)) {
        throw new Error('Estructura de datos inválida');
      }
      
      // Limpiar datos actuales y esperar a que termine
      await storageClear();
      
      // Guardar cada campo individualmente y esperar
      const savePromises = [
        storageSet<AppConfig>('coopmanager_config', data.config),
        storageSet<Member[]>('coopmanager_members', data.members),
        storageSet<Loan[]>('coopmanager_loans', data.loans),
        storageSet<Contribution[]>('coopmanager_contributions', data.contributions),
        storageSet<Expense[]>('coopmanager_expenses', data.expenses || []),
        storageSet<Transaction[]>('coopmanager_transactions', data.transactions || []),
        storageSet<Refund[]>('coopmanager_refunds', data.refunds || []),
        storageSet<ActivityLog[]>('coopmanager_activities', data.activities || []),
        storageSet<number>('coopmanager_cashbox', data.cashbox || 0),
      ];
      
      // Esperar a que todas las operaciones de guardado terminen
      await Promise.all(savePromises);
      
      console.log('Datos guardados en localStorage, actualizando estado...');
      
      // Actualizar el estado de React antes de recargar
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CONFIG', payload: data.config });
      dispatch({ type: 'SET_MEMBERS', payload: data.members });
      dispatch({ type: 'SET_LOANS', payload: data.loans });
      dispatch({ type: 'SET_CONTRIBUTIONS', payload: data.contributions });
      dispatch({ type: 'SET_EXPENSES', payload: data.expenses || [] });
      dispatch({ type: 'SET_TRANSACTIONS', payload: data.transactions || [] });
      dispatch({ type: 'SET_REFUNDS', payload: data.refunds || [] });
      dispatch({ type: 'SET_ACTIVITIES', payload: data.activities || [] });
      dispatch({ type: 'SET_CASHBOX', payload: data.cashbox || 0 });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      showToast('success', 'Datos restaurados', 'Los datos han sido restaurados exitosamente.');
      
      // Pequeño delay para asegurar que el estado se actualice
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Error en importData:', error);
      showToast('error', 'Error al restaurar', 'El archivo de respaldo no es válido.');
      throw error;
    }
  }, [showToast]);

  const exportToCSV = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const filename = `Reporte_Cooperativa_${today}.csv`;
    
    // Preparar datos de miembros ordenados alfabéticamente
    const memberData = state.members
      .filter(m => m.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(member => {
        // Ahorro Total Histórico (aportes pagados)
        const totalSavings = state.contributions
          .filter(c => c.memberId === member.id && c.status === 'paid')
          .reduce((sum, c) => sum + (c.shareAmount + c.expenseAmount), 0);
        
        // Deuda Pendiente (préstamos activos)
        const pendingDebt = state.loans
          .filter(l => l.memberId === member.id && l.status === 'active')
          .reduce((sum, l) => sum + l.remainingPrincipal, 0);
        
        // Multas (penalties)
        const totalPenalties = state.contributions
          .filter(c => c.memberId === member.id && c.status === 'paid')
          .reduce((sum, c) => sum + (c.penaltyAmount || 0), 0);
        
        // Saldo Neto
        const netBalance = totalSavings - pendingDebt;
        
        return {
          Socio: member.name,
          'Ahorro Total': totalSavings,
          Deuda: pendingDebt,
          Multas: totalPenalties,
          'Saldo Neto': netBalance
        };
      });
    
    // Calcular totales
    const totalSavings = memberData.reduce((sum, m) => sum + m['Ahorro Total'], 0);
    const totalDebt = memberData.reduce((sum, m) => sum + m.Deuda, 0);
    const totalPenalties = memberData.reduce((sum, m) => sum + m.Multas, 0);
    const totalNetBalance = memberData.reduce((sum, m) => sum + m['Saldo Neto'], 0);
    
    // Total Gastos Administrativos
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Efectivo en Caja
    const cashInBox = calculateAvailableCash();
    
    // Crear filas del CSV
    const csvRows = [
      ['Socio', 'Ahorro Total', 'Deuda', 'Multas', 'Saldo Neto'],
      ...memberData.map(m => [
        m.Socio,
        m['Ahorro Total'].toString(),
        m.Deuda.toString(),
        m.Multas.toString(),
        m['Saldo Neto'].toString()
      ]),
      [], // Línea vacía
      ['RESUMEN GENERAL'],
      ['Total Ahorros', totalSavings.toString()],
      ['Total Deudas', totalDebt.toString()],
      ['Total Multas', totalPenalties.toString()],
      ['Total Saldos Netos', totalNetBalance.toString()],
      ['Total Gastos Administrativos', totalExpenses.toString()],
      ['Efectivo en Caja', cashInBox.toString()]
    ];
    
    // Convertir a CSV
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    showToast('success', 'Archivo generado con éxito', 'Guárdalo en un lugar seguro.');
  }, [state.members, state.contributions, state.loans, state.expenses, calculateAvailableCash, showToast]);

  const value: AppContextValue = {
    ...state,
    updateConfig,
    setFontSize,
    toggleTheme,
    clearAllData,
    showToast,
    addMember,
    updateMember,
    deleteMember,
    getMember,
    addLoan,
    updateLoan,
    getLoan,
    deleteLoan,
    payRetention,
    payLoanInstallment,
    prepayLoan,
    refinanceLoan,
    addContribution,
    markContributionPaid,
    updateContribution,
    deleteContribution,
    addExpense,
    deleteExpense,
    addRefund,
    updateRefund,
    deleteRefund,
    addTransaction,
    setCashbox,
    adjustCashbox,
    calculateAvailableCash,
    getMemberContributions,
    getMemberLoans,
    performAnnualClosing,
    getAvailableYears,
    exportData,
    importData,
    exportToCSV,
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
