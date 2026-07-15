import * as XLSX from 'xlsx';
import type { ActivityLog, AppConfig, Contribution, Expense, Loan, Member, Refund, Transaction } from '../types';
import type { AppState } from '../store/types';
import type { Workspace } from './workspaces';

const BACKUP_FORMAT = 'CoopManager Excel Backup';

type BackupData = Pick<AppState, 'config' | 'fontSize' | 'theme' | 'members' | 'loans' | 'contributions' | 'expenses' | 'transactions' | 'refunds' | 'activities' | 'cashbox'>;
type BackupPhoto = { memberId: string; fileName: string; dataUrl: string };

function addSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Sin_datos: 'Sin datos' }]);
  sheet['!cols'] = Object.keys(rows[0] ?? { Sin_datos: '' }).map((key) => ({ wch: Math.min(Math.max(key.length + 2, 14), 36) }));
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function backupRows(items: unknown[]) {
  return items.map((item, index) => ({ Registro: index + 1, Datos_JSON: JSON.stringify(item) }));
}

function readBackupRows<T>(workbook: XLSX.WorkBook, sheetName: string): T[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Falta la hoja ${sheetName}.`);
  return XLSX.utils.sheet_to_json<{ Datos_JSON?: string }>(sheet)
    .filter((row): row is { Datos_JSON: string } => typeof row.Datos_JSON === 'string' && row.Datos_JSON.trim().length > 0)
    .map((row) => JSON.parse(row.Datos_JSON) as T);
}

function memberName(members: Member[], memberId: string) {
  return members.find((member) => member.id === memberId)?.name ?? 'Socio no disponible';
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la foto.'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function exportWorkspacePhotos(members: Member[], workspaceId?: string): Promise<BackupPhoto[]> {
  if (!workspaceId || !window.coopmanagerPhotos) return [];
  const photos = await Promise.all(members.filter((member) => member.profilePhoto).map(async (member) => {
    try {
      const fileName = member.profilePhoto!;
      const url = await window.coopmanagerPhotos!.getUrl(workspaceId, fileName);
      const response = await fetch(url);
      if (!response.ok) return null;
      return { memberId: member.id, fileName, dataUrl: await blobToDataUrl(await response.blob()) };
    } catch {
      return null;
    }
  }));
  return photos.filter((photo): photo is BackupPhoto => photo !== null);
}

export function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
}

export function createBackupWorkbook(state: BackupData, workspace?: Workspace | null, uiTheme?: string | null, photos: BackupPhoto[] = []) {
  const workbook = XLSX.utils.book_new();
  addSheet(workbook, 'Información', [
    { Campo: 'Formato', Valor: BACKUP_FORMAT },
    { Campo: 'Versión', Valor: '3.0' },
    { Campo: 'Fecha de exportación', Valor: new Date().toISOString() },
    { Campo: 'Espacio', Valor: workspace?.name ?? 'No disponible' },
    { Campo: 'Identificador de espacio', Valor: workspace?.id ?? '' },
    { Campo: 'Icono de espacio', Valor: workspace?.icon ?? 'building' },
    { Campo: 'Tema visual', Valor: uiTheme ?? 'light' },
    { Campo: 'Caja', Valor: state.cashbox },
  ]);
  addSheet(workbook, 'Configuración', backupRows([state.config]));
  addSheet(workbook, 'Preferencias', backupRows([{ fontSize: state.fontSize, theme: state.theme, uiTheme: uiTheme ?? 'light' }]));
  addSheet(workbook, 'Socios', backupRows(state.members));
  addSheet(workbook, 'Préstamos', backupRows(state.loans));
  addSheet(workbook, 'Aportes', backupRows(state.contributions));
  addSheet(workbook, 'Gastos', backupRows(state.expenses));
  addSheet(workbook, 'Devoluciones', backupRows(state.refunds));
  addSheet(workbook, 'Transacciones', backupRows(state.transactions));
  addSheet(workbook, 'Actividades', backupRows(state.activities));
  addSheet(workbook, 'Fotos', photos.map((photo, index) => ({ Registro: index + 1, Socio_ID: photo.memberId, Archivo_original: photo.fileName, Datos_URL: photo.dataUrl })));
  return workbook;
}

export function readBackupWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const metadata = XLSX.utils.sheet_to_json<{ Campo: string; Valor: string | number }>(workbook.Sheets.Información);
  if (!metadata.some((row) => row.Campo === 'Formato' && row.Valor === BACKUP_FORMAT)) throw new Error('El archivo no es un respaldo válido de CoopManager.');
  const configuration = readBackupRows<AppConfig>(workbook, 'Configuración')[0];
  const preferences = readBackupRows<{ fontSize: AppState['fontSize']; theme: AppState['theme']; uiTheme?: string }>(workbook, 'Preferencias')[0];
  if (!configuration || !preferences) throw new Error('El respaldo está incompleto.');
  const photoSheet = workbook.Sheets.Fotos;
  const photos = photoSheet ? XLSX.utils.sheet_to_json<{ Socio_ID: string; Archivo_original: string; Datos_URL: string }>(photoSheet)
    .filter((photo) => photo.Socio_ID && photo.Datos_URL)
    .map((photo) => ({ memberId: photo.Socio_ID, fileName: photo.Archivo_original, dataUrl: photo.Datos_URL })) : [];
  return {
    config: configuration,
    fontSize: preferences.fontSize,
    theme: preferences.theme,
    uiTheme: preferences.uiTheme ?? String(metadata.find((row) => row.Campo === 'Tema visual')?.Valor ?? 'light'),
    members: readBackupRows<Member>(workbook, 'Socios'),
    loans: readBackupRows<Loan>(workbook, 'Préstamos'),
    contributions: readBackupRows<Contribution>(workbook, 'Aportes'),
    expenses: readBackupRows<Expense>(workbook, 'Gastos'),
    refunds: readBackupRows<Refund>(workbook, 'Devoluciones'),
    transactions: readBackupRows<Transaction>(workbook, 'Transacciones'),
    activities: readBackupRows<ActivityLog>(workbook, 'Actividades'),
    cashbox: Number(metadata.find((row) => row.Campo === 'Caja')?.Valor) || 0,
    photos,
  };
}

export function createReportWorkbook(state: AppState, availableCash: number) {
  const workbook = XLSX.utils.book_new();
  const paid = state.contributions.filter((item) => item.status === 'paid' || item.status === 'late');
  const totalContributions = paid.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalExpenses = state.expenses.reduce((sum, item) => sum + item.amount, 0);
  const activeLoans = state.loans.filter((item) => item.status === 'active');
  addSheet(workbook, 'Resumen', [
    { Indicador: 'Socios activos', Valor: state.members.filter((item) => item.status === 'active').length },
    { Indicador: 'Socios retirados', Valor: state.members.filter((item) => item.status === 'inactive').length },
    { Indicador: 'Aportes recaudados', Valor: totalContributions },
    { Indicador: 'Gastos registrados', Valor: totalExpenses },
    { Indicador: 'Préstamos activos', Valor: activeLoans.length },
    { Indicador: 'Saldo pendiente de préstamos', Valor: activeLoans.reduce((sum, item) => sum + item.remainingPrincipal, 0) },
    { Indicador: 'Caja disponible', Valor: availableCash },
  ]);
  addSheet(workbook, 'Socios', state.members.map((member) => { const savings = paid.filter((item) => item.memberId === member.id).reduce((sum, item) => sum + item.shareAmount + item.expenseAmount, 0); const debt = activeLoans.filter((item) => item.memberId === member.id).reduce((sum, item) => sum + item.remainingPrincipal, 0); return { Nombre: member.name, Teléfono: member.phone, Estado: member.status === 'active' ? 'Activo' : 'Retirado', Ingreso: member.joinDate, Aportes: savings, Deuda: debt, Saldo_neto: savings - debt, Notas: member.notes ?? '' }; }));
  addSheet(workbook, 'Aportes', state.contributions.map((item) => ({ Socio: memberName(state.members, item.memberId), Mes: item.month, Capital: item.shareAmount, Gastos_administrativos: item.expenseAmount, Multa: item.penaltyAmount, Total: item.totalAmount, Estado: item.status, Fecha_pago: item.paidDate ?? '', Fecha_límite: item.dueDate })));
  addSheet(workbook, 'Préstamos', state.loans.map((item) => ({ Socio: item.memberName, Monto: item.amount, Interés_mensual: item.monthlyInterestRate, Cuota_mensual: item.monthlyPayment, Saldo_pendiente: item.remainingPrincipal, Cuotas_pagadas: item.paidInstallments, Cuotas_totales: item.totalInstallments, Estado: item.status, Inicio: item.startDate, Fin: item.endDate, Retención: item.retentionAmount })));
  addSheet(workbook, 'Gastos', state.expenses.map((item) => ({ Descripción: item.description, Monto: item.amount, Categoría: item.category, Fecha: item.date })));
  addSheet(workbook, 'Devoluciones', state.refunds.map((item) => ({ Socio: item.memberName, Motivo: item.reason, Monto: item.amount, Fecha_deposito: item.depositDate })));
  addSheet(workbook, 'Movimientos', state.transactions.map((item) => ({ Tipo: item.type, Descripción: item.description, Monto: item.amount, Fecha: item.date })));
  return workbook;
}
