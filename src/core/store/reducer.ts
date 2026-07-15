import { Action, AppState, initialConfig, initialState } from './types';

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_WORKSPACE':
      return { ...initialState, ...action.payload, loading: false, toasts: state.toasts };
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
        members: state.members.map(m => m.id === action.payload.id ? action.payload : m),
      };
    case 'SET_LOANS':
      return { ...state, loans: action.payload };
    case 'ADD_LOAN':
      return { ...state, loans: [...state.loans, action.payload] };
    case 'UPDATE_LOAN':
      return {
        ...state,
        loans: state.loans.map(l => l.id === action.payload.id ? action.payload : l),
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
        contributions: state.contributions.map(c => c.id === action.payload.id ? action.payload : c),
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
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'SET_REFUNDS':
      return { ...state, refunds: action.payload };
    case 'ADD_REFUND':
      return { ...state, refunds: [...state.refunds, action.payload] };
    case 'UPDATE_REFUND':
      return {
        ...state,
        refunds: state.refunds.map(r => r.id === action.payload.id ? action.payload : r),
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
