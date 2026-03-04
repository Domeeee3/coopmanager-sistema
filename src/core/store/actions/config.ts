import { v4 as uuidv4 } from 'uuid';
import {
  AppConfig, Toast, ActivityLog, ActivityType,
  Member, Loan, Contribution, Expense, Transaction,
  Refund, FontSizeSettings, ThemeSettings,
} from '../../types';
import { ActionHelpers } from '../types';
import { getItem as storageGet, setItem as storageSet, clearAll as storageClear } from '../../lib/storage';

export function createConfigActions(helpers: Pick<ActionHelpers, 'dispatch' | 'getState'>) {
  const { dispatch, getState } = helpers;

  // Toast & activity (low-level, used by helpers)
  const showToast = (type: Toast['type'], title: string, message?: string) => {
    const toast: Toast = { id: uuidv4(), type, title, message, duration: 5000 };
    dispatch({ type: 'ADD_TOAST', payload: toast });
    setTimeout(() => { dispatch({ type: 'REMOVE_TOAST', payload: toast.id }); }, 5000);
  };

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

  const removeToast = (id: string) => dispatch({ type: 'REMOVE_TOAST', payload: id });

  const updateConfig = (config: Partial<AppConfig>) => {
    const oldConfig = getState().config;
    dispatch({ type: 'SET_CONFIG', payload: config });
    logActivity('config_update', 'Configuración actualizada', { old: oldConfig, new: { ...oldConfig, ...config } });
    showToast('success', 'Configuración actualizada');
  };

  const setFontSize = (size: number) => {
    const fs = getState().fontSize;
    const newSize = Math.max(fs.min, Math.min(fs.max, size));
    dispatch({ type: 'SET_FONT_SIZE', payload: newSize });
  };

  const toggleTheme = () => {
    const newMode = getState().theme.mode === 'light' ? 'dark' : 'light';
    dispatch({ type: 'SET_THEME', payload: newMode });
  };

  const clearAllData = () => {
    storageClear().then(() => {
      dispatch({ type: 'CLEAR_ALL_DATA' });
      showToast('warning', 'Datos eliminados', 'Todos los datos han sido borrados permanentemente.');
    });
  };

  return { showToast, logActivity, removeToast, updateConfig, setFontSize, toggleTheme, clearAllData };
}

export function createDataActions(
  helpers: ActionHelpers,
  deps: { calculateAvailableCash: () => number },
) {
  const { dispatch, getState, showToast, logActivity } = helpers;

  const performAnnualClosing = () => {
    const currentBalance = deps.calculateAvailableCash();
    dispatch({ type: 'SET_CONFIG', payload: { openingBalance: currentBalance } });
    logActivity('annual_closing', 'Cierre de Ejercicio Contable finalizado', { openingBalance: currentBalance });
    showToast('success', 'Cierre exitoso', '¡Cierre exitoso! Se recomienda descargar un respaldo ahora para asegurar el saldo inicial del nuevo año.');
  };

  const exportData = () => {
    const state = getState();
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
      version: '1.0',
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
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);

      if (!data.config || !Array.isArray(data.members) || !Array.isArray(data.loans) || !Array.isArray(data.contributions)) {
        throw new Error('Estructura de datos inválida');
      }

      await storageClear();

      await Promise.all([
        storageSet<AppConfig>('coopmanager_config', data.config),
        storageSet<Member[]>('coopmanager_members', data.members),
        storageSet<Loan[]>('coopmanager_loans', data.loans),
        storageSet<Contribution[]>('coopmanager_contributions', data.contributions),
        storageSet<Expense[]>('coopmanager_expenses', data.expenses || []),
        storageSet<Transaction[]>('coopmanager_transactions', data.transactions || []),
        storageSet<Refund[]>('coopmanager_refunds', data.refunds || []),
        storageSet<ActivityLog[]>('coopmanager_activities', data.activities || []),
        storageSet<number>('coopmanager_cashbox', data.cashbox || 0),
      ]);

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
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (error) {
      showToast('error', 'Error al restaurar', 'El archivo de respaldo no es válido.');
      throw error;
    }
  };

  const exportToCSV = () => {
    const state = getState();
    const today = new Date().toISOString().split('T')[0];
    const filename = `Reporte_Cooperativa_${today}.csv`;

    const memberData = state.members
      .filter(m => m.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(member => {
        const totalSavings = state.contributions
          .filter(c => c.memberId === member.id && c.status === 'paid')
          .reduce((sum, c) => sum + (c.shareAmount + c.expenseAmount), 0);
        const pendingDebt = state.loans
          .filter(l => l.memberId === member.id && l.status === 'active')
          .reduce((sum, l) => sum + l.remainingPrincipal, 0);
        const totalPenalties = state.contributions
          .filter(c => c.memberId === member.id && c.status === 'paid')
          .reduce((sum, c) => sum + (c.penaltyAmount || 0), 0);
        const netBalance = totalSavings - pendingDebt;
        return { Socio: member.name, 'Ahorro Total': totalSavings, Deuda: pendingDebt, Multas: totalPenalties, 'Saldo Neto': netBalance };
      });

    const totalSavings = memberData.reduce((sum, m) => sum + m['Ahorro Total'], 0);
    const totalDebt = memberData.reduce((sum, m) => sum + m.Deuda, 0);
    const totalPenalties = memberData.reduce((sum, m) => sum + m.Multas, 0);
    const totalNetBalance = memberData.reduce((sum, m) => sum + m['Saldo Neto'], 0);
    const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const cashInBox = deps.calculateAvailableCash();

    const csvRows = [
      ['Socio', 'Ahorro Total', 'Deuda', 'Multas', 'Saldo Neto'],
      ...memberData.map(m => [m.Socio, m['Ahorro Total'].toString(), m.Deuda.toString(), m.Multas.toString(), m['Saldo Neto'].toString()]),
      [],
      ['RESUMEN GENERAL'],
      ['Total Ahorros', totalSavings.toString()],
      ['Total Deudas', totalDebt.toString()],
      ['Total Multas', totalPenalties.toString()],
      ['Total Saldos Netos', totalNetBalance.toString()],
      ['Total Gastos Administrativos', totalExpenses.toString()],
      ['Efectivo en Caja', cashInBox.toString()],
    ];

    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
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
  };

  return { performAnnualClosing, exportData, importData, exportToCSV };
}
