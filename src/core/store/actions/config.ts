import { v4 as uuidv4 } from 'uuid';
import { AppConfig, Toast, ActivityLog, ActivityType } from '../../types';
import { createBackupWorkbook, createReportWorkbook, downloadWorkbook, exportWorkspacePhotos, readBackupWorkbook } from '../../lib/excel';
import type { Workspace } from '../../lib/workspaces';
import { ActionHelpers } from '../types';

export function createConfigActions(helpers: Pick<ActionHelpers, 'dispatch' | 'getState'>) {
  const { dispatch, getState } = helpers;
  const showToast = (type: Toast['type'], title: string, message?: string) => {
    const toast: Toast = { id: uuidv4(), type, title, message, duration: 5000 };
    dispatch({ type: 'ADD_TOAST', payload: toast });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id }), 5000);
  };
  const logActivity = (type: ActivityType, description: string, details?: any, referenceId?: string) => dispatch({ type: 'ADD_ACTIVITY', payload: { id: uuidv4(), type, description, details: details ? JSON.stringify(details) : undefined, referenceId, timestamp: new Date().toISOString() } });
  const removeToast = (id: string) => dispatch({ type: 'REMOVE_TOAST', payload: id });
  const updateConfig = (config: Partial<AppConfig>) => { const oldConfig = getState().config; dispatch({ type: 'SET_CONFIG', payload: config }); logActivity('config_update', 'Configuración actualizada', { old: oldConfig, new: { ...oldConfig, ...config } }); showToast('success', 'Configuración actualizada'); };
  const setFontSize = (size: number) => { const fontSize = getState().fontSize; dispatch({ type: 'SET_FONT_SIZE', payload: Math.max(fontSize.min, Math.min(fontSize.max, size)) }); };
  const toggleTheme = () => dispatch({ type: 'SET_THEME', payload: getState().theme.mode === 'light' ? 'dark' : 'light' });
  const clearAllData = () => { dispatch({ type: 'CLEAR_ALL_DATA' }); showToast('warning', 'Datos eliminados', 'Todos los datos han sido borrados permanentemente.'); };
  return { showToast, logActivity, removeToast, updateConfig, setFontSize, toggleTheme, clearAllData };
}

export function createDataActions(helpers: ActionHelpers, deps: { calculateAvailableCash: () => number; activeWorkspace: Workspace | null }) {
  const { dispatch, getState, showToast, logActivity } = helpers;
  const performAnnualClosing = () => { const currentBalance = deps.calculateAvailableCash(); dispatch({ type: 'SET_CONFIG', payload: { openingBalance: currentBalance } }); logActivity('annual_closing', 'Cierre de Ejercicio Contable finalizado', { openingBalance: currentBalance }); showToast('success', 'Cierre exitoso', '¡Cierre exitoso! Se recomienda descargar un respaldo ahora para asegurar el saldo inicial del nuevo año.'); };

  const exportData = async () => {
    const state = getState();
    const workspace = deps.activeWorkspace;
    const photos = await exportWorkspacePhotos(state.members, workspace?.id);
    const uiTheme = workspace ? localStorage.getItem(`coopmanager-theme:${workspace.id}`) : null;
    const today = new Date().toISOString().split('T')[0];
    downloadWorkbook(createBackupWorkbook(state, workspace, uiTheme, photos), `CoopManager_Respaldo_${today}.xlsx`);
    showToast('success', 'Respaldo Excel generado', `Se respaldó todo el espacio activo${workspace ? `: ${workspace.name}` : ''}.`);
  };

  const importData = async (fileBuffer: ArrayBuffer) => {
    try {
      const data = readBackupWorkbook(fileBuffer);
      const workspaceId = deps.activeWorkspace?.id;
      const restoredPhotoNames = new Map<string, string>();
      if (workspaceId && window.coopmanagerPhotos) {
        await window.coopmanagerPhotos.clearAll(workspaceId);
        for (const photo of data.photos) restoredPhotoNames.set(photo.memberId, await window.coopmanagerPhotos.save(workspaceId, photo.dataUrl));
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CONFIG', payload: data.config });
      dispatch({ type: 'SET_FONT_SIZE', payload: data.fontSize.base });
      dispatch({ type: 'SET_THEME', payload: data.theme.mode });
      dispatch({ type: 'SET_MEMBERS', payload: data.members.map((member) => ({ ...member, profilePhoto: restoredPhotoNames.get(member.id) })) });
      dispatch({ type: 'SET_LOANS', payload: data.loans });
      dispatch({ type: 'SET_CONTRIBUTIONS', payload: data.contributions });
      dispatch({ type: 'SET_EXPENSES', payload: data.expenses });
      dispatch({ type: 'SET_TRANSACTIONS', payload: data.transactions });
      dispatch({ type: 'SET_REFUNDS', payload: data.refunds });
      dispatch({ type: 'SET_ACTIVITIES', payload: data.activities });
      dispatch({ type: 'SET_CASHBOX', payload: data.cashbox });
      if (workspaceId) localStorage.setItem(`coopmanager-theme:${workspaceId}`, data.uiTheme);
      dispatch({ type: 'SET_LOADING', payload: false });
      showToast('success', 'Datos restaurados', 'El respaldo completo fue restaurado en el espacio activo.');
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      showToast('error', 'Error al restaurar', error instanceof Error ? error.message : 'El archivo no es un respaldo válido.');
      throw error;
    }
  };

  const exportToCSV = () => { const today = new Date().toISOString().split('T')[0]; downloadWorkbook(createReportWorkbook(getState(), deps.calculateAvailableCash()), `CoopManager_Reporte_${today}.xlsx`); showToast('success', 'Reporte Excel generado', 'El reporte incluye hojas de resumen, socios, aportes, préstamos, gastos y movimientos.'); };
  return { performAnnualClosing, exportData, importData, exportToCSV };
}
