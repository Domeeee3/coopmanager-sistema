import React, { useState } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { AppConfig } from '@/core/types';
import { formatCurrency } from '@/core/lib/formatters';
import {
  DollarSign,
  Calendar,
  Percent,
  AlertTriangle,
  Save,
  RotateCcw,
  Trash2,
  ShieldAlert,
  Wallet,
  Clock,
  CreditCard,
  Download,
  Upload,
  FileText,
  Wrench
} from 'lucide-react';

export function Settings() {
  const { config, updateConfig, showToast, clearAllData, calculateAvailableCash, adjustCashbox, performAnnualClosing, exportData, importData, exportToCSV } = useApp();

  const [formData, setFormData] = useState<AppConfig>(config);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [cashboxAmount, setCashboxAmount] = useState('');
  const [cashboxDesc, setCashboxDesc] = useState('');
  const [showCashboxModal, setShowCashboxModal] = useState(false);
  const [showAnnualClosingConfirm, setShowAnnualClosingConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');

  const handleChange = (field: keyof AppConfig, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (formData.monthlyShareAmount < 0) {
      showToast('error', 'Error', 'El aporte mensual no puede ser negativo.');
      return;
    }
    if (formData.monthlyInterestRate < 0 || formData.monthlyInterestRate > 100) {
      showToast('error', 'Error', 'La tasa de interés debe estar entre 0% y 100%.');
      return;
    }
    if (formData.penaltyAmount < 0) {
      showToast('error', 'Error', 'La multa no puede ser negativa.');
      return;
    }
    updateConfig(formData);
  };

  const handleReset = () => {
    setFormData(config);
    showToast('info', 'Restaurado', 'Los valores han sido restaurados.');
  };

  const handleDeleteAllData = () => {
    if (deleteConfirmText === 'ELIMINAR') {
      clearAllData();
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    } else {
      showToast('error', 'Error', 'Por favor escriba "ELIMINAR" para confirmar.');
    }
  };

  const handleCashboxAdjust = () => {
    const amount = parseFloat(cashboxAmount);
    if (!isNaN(amount) && amount !== 0) {
      adjustCashbox(amount, cashboxDesc || 'Ajuste manual de caja');
      setCashboxAmount('');
      setCashboxDesc('');
      setShowCashboxModal(false);
    } else {
      showToast('error', 'Monto inválido', 'Ingrese un monto distinto de 0');
    }
  };

  const handleAnnualClosing = () => {
    performAnnualClosing();
    setShowAnnualClosingConfirm(false);
  };

  const handleDownloadBackup = () => {
    exportData();
  };

  const handleDownloadExcel = () => {
    exportToCSV();
  };

  const handleRestoreBackup = () => {
    if (restoreConfirmText !== 'CONFIRMAR') {
      showToast('error', 'Error', 'Debe escribir "CONFIRMAR" para proceder.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = e.target?.result as string;
          importData(jsonData);
        } catch (error) {
          showToast('error', 'Error', 'El archivo de respaldo no es válido.');
        }
      };
      reader.readAsText(file);
    };

    input.click();
    setShowRestoreConfirm(false);
    setRestoreConfirmText('');
  };

  return (
    <div className="space-y-6 animate-fade-in bg-background dark:bg-slate-950 rounded-lg">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Wrench className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Configuración
            </h1>
            <p className="text-muted-foreground mt-1">
              Ajustes globales del sistema
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* ── Sección 1: Estado General ── */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Estado General</h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm p-4 bg-muted dark:bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Caja:</span>
            <span className="font-bold text-foreground">{formatCurrency(calculateAvailableCash(), config.currencyCode)}</span>
            <Button size="sm" variant="ghost" className="text-xs h-auto px-2 py-0.5" onClick={() => setShowCashboxModal(true)}>
              Ajustar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Total mensual/socio:</span>
            <span className="font-bold text-foreground">
              {formatCurrency((formData.monthlyShareAmount || 0) + (formData.monthlyExpenseAmount || 0), config.currencyCode)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Sección 2: Montos ── */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Montos</h2>
        <Card className="bg-card dark:bg-slate-800 border-border">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Aporte Mensual
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.monthlyShareAmount || ''}
                    onChange={(e) => handleChange('monthlyShareAmount', parseFloat(e.target.value) || 0)}
                    className="text-sm pr-12 bg-background dark:bg-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Gastos Admin.
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.monthlyExpenseAmount || ''}
                    onChange={(e) => handleChange('monthlyExpenseAmount', parseFloat(e.target.value) || 0)}
                    className="text-sm pr-12 bg-background dark:bg-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> Tasa Interés
                </label>
                <Select
                  value={String(formData.monthlyInterestRate || 1)}
                  onValueChange={(value) => handleChange('monthlyInterestRate', parseFloat(value))}
                >
                  <SelectTrigger className="text-sm bg-background dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1% mensual</SelectItem>
                    <SelectItem value="2">2% mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Sección 3: Plazos y Multas ── */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Plazos y Multas</h2>
        <Card className="bg-card dark:bg-slate-800 border-border">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Multa
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.penaltyAmount || ''}
                    onChange={(e) => handleChange('penaltyAmount', parseFloat(e.target.value) || 0)}
                    className="text-sm pr-12 bg-background dark:bg-slate-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Día Límite Aportes
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.penaltyDayThreshold}
                  onChange={(e) => handleChange('penaltyDayThreshold', parseInt(e.target.value) || 3)}
                  className="text-sm bg-background dark:bg-slate-900"
                />
                <p className="text-xs text-muted-foreground">
                  Multa después del día {formData.penaltyDayThreshold}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Día Límite Préstamo
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.loanPaymentDueDay ?? 18}
                  onChange={(e) => handleChange('loanPaymentDueDay', parseInt(e.target.value) || 18)}
                  className="text-sm bg-background dark:bg-slate-900"
                />
                <p className="text-xs text-muted-foreground">
                  Multa de {config.currencySymbol}{formData.penaltyAmount || 5} desde el día {formData.loanPaymentDueDay ?? 18}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Sección 4: Respaldos y Reportes ── */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Respaldos y Reportes</h2>
        <Card className="bg-card dark:bg-slate-800 border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Cierra el ejercicio actual, exporta reportes o gestiona respaldos de la base de datos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setShowAnnualClosingConfirm(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Cierre Anual
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                <FileText className="w-4 h-4 mr-2" />
                Reporte Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadBackup}>
                <Download className="w-4 h-4 mr-2" />
                Respaldo
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowRestoreConfirm(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Restaurar
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Sección 5: Zona de Peligro ── */}
      <section>
        <h2 className="text-sm font-medium text-destructive uppercase tracking-wider mb-3">Zona de Peligro</h2>
        <Card className="border-destructive/30 bg-card dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                  Eliminar todos los datos
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Esta acción es irreversible</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Todo
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Modal de ajuste de caja */}
      <Dialog open={showCashboxModal} onOpenChange={(open) => !open && setShowCashboxModal(false)}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Ajustar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto (+ agrega / - resta)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={cashboxAmount}
                  onChange={(e) => setCashboxAmount(e.target.value)}
                  placeholder="Ej: 100 o -50"
                  className="pl-9 bg-background dark:bg-slate-900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={cashboxDesc}
                onChange={(e) => setCashboxDesc(e.target.value)}
                placeholder="Motivo del ajuste (opcional)"
                className="bg-background dark:bg-slate-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashboxModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCashboxAdjust}>
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setDeleteConfirmText(''); } }}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Eliminar todos los datos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive font-medium">
                ¡Atención! Esta acción es irreversible.
              </p>
              <ul className="text-sm text-destructive mt-2 list-disc list-inside">
                <li>Todos los socios</li>
                <li>Todos los préstamos</li>
                <li>Todos los aportes</li>
                <li>Todos los gastos</li>
                <li>Todas las transacciones</li>
              </ul>
            </div>
            <div>
              <Label className="mb-2">
                Escriba <span className="font-bold text-destructive">ELIMINAR</span> para confirmar:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="ELIMINAR"
                className="bg-background dark:bg-slate-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllData}
              disabled={deleteConfirmText !== 'ELIMINAR'}
            >
              Eliminar permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de cierre anual */}
      <Dialog open={showAnnualClosingConfirm} onOpenChange={(open) => !open && setShowAnnualClosingConfirm(false)}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Cierre de Ejercicio Contable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-foreground font-medium">
                ¿Estás seguro de cerrar el ejercicio actual?
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                El saldo de caja actual ({formatCurrency(calculateAvailableCash(), config.currencyCode)}) será establecido como el capital inicial del próximo año.
              </p>
              <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                <li>Los préstamos activos permanecerán sin cambios</li>
                <li>El historial de aportes se mantiene</li>
                <li>Solo se actualiza el saldo inicial</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnnualClosingConfirm(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAnnualClosing}>
              Confirmar Cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de restaurar respaldo */}
      <Dialog open={showRestoreConfirm} onOpenChange={(open) => { if (!open) { setShowRestoreConfirm(false); setRestoreConfirmText(''); } }}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Restaurar Respaldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive font-medium">
                Esta acción reemplazará todos los datos actuales
              </p>
              <ul className="text-sm text-destructive mt-2 list-disc list-inside">
                <li>Todos los socios serán reemplazados</li>
                <li>Todos los préstamos serán reemplazados</li>
                <li>Todos los aportes serán reemplazados</li>
                <li>La aplicación se recargará automáticamente</li>
              </ul>
            </div>
            <div>
              <Label className="mb-2">
                Escriba <span className="font-bold text-destructive">CONFIRMAR</span> para proceder:
              </Label>
              <Input
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="bg-background dark:bg-slate-900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreConfirm(false);
                setRestoreConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestoreBackup}
              disabled={restoreConfirmText !== 'CONFIRMAR'}
            >
              Restaurar Datos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Settings;
