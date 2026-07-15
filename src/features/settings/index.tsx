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
import { Modal } from '@heroui/react';
import { AppConfig } from '@/core/types';
import { formatCurrency } from '@/core/lib/formatters';
import { PageHeader } from '@/shared/components/PageHeader';
import { SectionTabs } from '@/shared/components/SectionTabs';
import {
  DollarSign,
  Calendar,
  Percent,
  AlertTriangle,
  Trash2,
  ShieldAlert,
  Wallet,
  CreditCard,
  Download,
  Upload,
  FileText,
  Database,
  SlidersHorizontal,
} from 'lucide-react';

type SettingsSection = 'operacion' | 'datos-respaldos' | 'zona-peligro';

export function Settings() {
  const { config, updateConfig, showToast, clearAllData, calculateAvailableCash, adjustCashbox, performAnnualClosing, exportData, importData, exportToCSV } = useApp();

  const [formData, setFormData] = useState<AppConfig>(config);
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('operacion');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [cashboxAmount, setCashboxAmount] = useState('');
  const [cashboxDesc, setCashboxDesc] = useState('');
  const [showCashboxModal, setShowCashboxModal] = useState(false);
  const [showAnnualClosingConfirm, setShowAnnualClosingConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');

  const handleChange = (field: keyof AppConfig, value: number) => {
    if (!Number.isFinite(value)) return;

    if (
      (field === 'monthlyShareAmount' ||
        field === 'monthlyExpenseAmount' ||
        field === 'penaltyAmount') &&
      value < 0
    ) {
      return;
    }

    if (field === 'monthlyInterestRate' && (value < 0 || value > 100)) {
      return;
    }

    if (
      (field === 'penaltyDayThreshold' || field === 'loanPaymentDueDay') &&
      (value < 1 || value > 31)
    ) {
      return;
    }

    const nextFormData = { ...formData, [field]: value };
    setFormData(nextFormData);
    updateConfig(nextFormData);
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
    input.accept = '.xlsx,.xls';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      void file.arrayBuffer().then(importData).catch(() => undefined);
    };

    input.click();
    setShowRestoreConfirm(false);
    setRestoreConfirmText('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Configuración"
        description="Ajustes globales del sistema"
      />

      <SectionTabs
        ariaLabel="Secciones de configuración"
        selectedKey={selectedSection}
        onSelectionChange={(key) => setSelectedSection(key as SettingsSection)}
        tabs={[
          { id: 'operacion', label: 'Operación', icon: <SlidersHorizontal className="size-4" /> },
          { id: 'datos-respaldos', label: 'Datos y respaldos', icon: <Database className="size-4" /> },
          { id: 'zona-peligro', label: 'Zona de peligro', icon: <ShieldAlert className="size-4" /> },
        ]}
      />

      {selectedSection === "operacion" && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Caja</h2>
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Ajuste de caja</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">Registre una corrección manual con su motivo.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowCashboxModal(true)}>
                  <Wallet className="mr-2 size-4 text-primary" />
                  Ajustar caja
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Montos</h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <DollarSign className="size-3.5 text-primary" /> Aporte Mensual
                    </label>
                    <div className="relative">
                      <Input type="number" min="0" value={formData.monthlyShareAmount} onChange={(e) => handleChange("monthlyShareAmount", Number(e.target.value))} className="bg-background pr-12 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="size-3.5 text-primary" /> Gastos Admin.
                    </label>
                    <div className="relative">
                      <Input type="number" min="0" value={formData.monthlyExpenseAmount} onChange={(e) => handleChange("monthlyExpenseAmount", Number(e.target.value))} className="bg-background pr-12 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Percent className="size-3.5 text-primary" /> Tasa Interés
                    </label>
                    <Select value={String(formData.monthlyInterestRate)} onValueChange={(value) => handleChange("monthlyInterestRate", Number(value))}>
                      <SelectTrigger className="bg-background text-sm"><SelectValue /></SelectTrigger>
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

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Plazos y Multas</h2>
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <AlertTriangle className="size-3.5 text-primary" /> Multa
                    </label>
                    <div className="relative">
                      <Input type="number" min="0" value={formData.penaltyAmount} onChange={(e) => handleChange("penaltyAmount", Number(e.target.value))} className="bg-background pr-12 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{config.currencySymbol}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><Calendar className="size-3.5 text-primary" /> Día Límite Aportes</label>
                    <Input type="number" min="1" max="31" value={formData.penaltyDayThreshold} onChange={(e) => handleChange("penaltyDayThreshold", Number(e.target.value))} className="bg-background text-sm" />
                    <p className="text-xs text-muted-foreground">Multa después del día {formData.penaltyDayThreshold}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><CreditCard className="size-3.5 text-primary" /> Día Límite Préstamo</label>
                    <Input type="number" min="1" max="31" value={formData.loanPaymentDueDay} onChange={(e) => handleChange("loanPaymentDueDay", Number(e.target.value))} className="bg-background text-sm" />
                    <p className="text-xs text-muted-foreground">Multa de {config.currencySymbol}{formData.penaltyAmount || 5} desde el día {formData.loanPaymentDueDay}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}

      {selectedSection === 'datos-respaldos' && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Datos y Respaldos</h2>
          <Card className="bg-card border-border">
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
      )}

      {selectedSection === 'zona-peligro' && (
        <section>
          <h2 className="text-sm font-medium text-destructive uppercase tracking-wider mb-3">Zona de Peligro</h2>
          <Card className="border-destructive/30 bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                    Eliminar datos del workspace
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
      )}

      {/* Modal de ajuste de caja */}
      <Modal.Backdrop variant="blur" isOpen={showCashboxModal} onOpenChange={(open) => !open && setShowCashboxModal(false)}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Ajustar Caja</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto (+ agrega / - resta)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={cashboxAmount}
                  onChange={(e) => setCashboxAmount(e.target.value)}
                  placeholder="100.00 o -50.00"
                  className="pl-9 bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={cashboxDesc}
                onChange={(e) => setCashboxDesc(e.target.value)}
                placeholder="Corrección por diferencia de caja"
                className="bg-background"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" onClick={() => setShowCashboxModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCashboxAdjust}>
              Aplicar
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Modal de confirmación de eliminación */}
      <Modal.Backdrop variant="blur" isOpen={showDeleteConfirm} onOpenChange={(open) => { if (!open) { setShowDeleteConfirm(false); setDeleteConfirmText(''); } }}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Eliminar datos del workspace</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-destructive font-medium">
                ¡Atención! Esta acción elimina únicamente los datos del espacio activo y es irreversible.
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
                className="bg-background"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
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
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Modal de confirmación de cierre anual */}
      <Modal.Backdrop variant="blur" isOpen={showAnnualClosingConfirm} onOpenChange={(open) => !open && setShowAnnualClosingConfirm(false)}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Cierre de Ejercicio Contable</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4 py-4">
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
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => setShowAnnualClosingConfirm(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAnnualClosing}>
              Confirmar Cierre
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Modal de confirmación de restaurar respaldo */}
      <Modal.Backdrop variant="blur" isOpen={showRestoreConfirm} onOpenChange={(open) => { if (!open) { setShowRestoreConfirm(false); setRestoreConfirmText(''); } }}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Restaurar Respaldo</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4 py-4">
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
                className="bg-background"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
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
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}

export default Settings;
