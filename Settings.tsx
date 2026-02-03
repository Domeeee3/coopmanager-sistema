import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { InputWithSuffix } from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { AppConfig } from '../types';
import { formatCurrency } from '../utils/formatters';
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
  FileText
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
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Configuración
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Ajustes globales del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Restaurar
          </Button>
          <Button size="sm" onClick={handleSubmit} leftIcon={<Save className="w-4 h-4" />}>
            Guardar
          </Button>
        </div>
      </div>

      {/* Grid de tarjetas compactas 3x3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Fecha y Hora */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Fecha y Hora</h3>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {new Date().toLocaleDateString('es-ES', { 
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </Card>

        {/* Caja Disponible */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
              <Wallet className="w-5 h-5 text-success-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Caja</h3>
          </div>
          <p className="text-xl font-bold text-success-600">
            {formatCurrency(calculateAvailableCash(), config.currencyCode)}
          </p>
          <Button 
            size="sm" 
            variant="ghost" 
            className="mt-2 text-xs"
            onClick={() => setShowCashboxModal(true)}
          >
            Ajustar caja
          </Button>
        </Card>

        {/* Aporte Mensual */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Aporte Mensual</h3>
          </div>
          <InputWithSuffix
            value={formData.monthlyShareAmount || ''}
            onChange={(e) => handleChange('monthlyShareAmount', parseFloat(e.target.value) || 0)}
            suffix={config.currencySymbol}
            className="text-sm"
          />
        </Card>

        {/* Gastos Admin */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Gastos Admin.</h3>
          </div>
          <InputWithSuffix
            value={formData.monthlyExpenseAmount || ''}
            onChange={(e) => handleChange('monthlyExpenseAmount', parseFloat(e.target.value) || 0)}
            suffix={config.currencySymbol}
            className="text-sm"
          />
        </Card>

        {/* Tasa de Interés */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
              <Percent className="w-5 h-5 text-warning-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Tasa Interés</h3>
          </div>
          <Select
            value={String(formData.monthlyInterestRate || 1)}
            onChange={(value) => handleChange('monthlyInterestRate', parseFloat(value))}
            options={[
              { value: '1', label: '1% mensual' },
              { value: '2', label: '2% mensual' },
            ]}
            className="text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Tasa fija mensual
          </p>
        </Card>

        {/* Multa */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Multa</h3>
          </div>
          <InputWithSuffix
            value={formData.penaltyAmount || ''}
            onChange={(e) => handleChange('penaltyAmount', parseFloat(e.target.value) || 0)}
            suffix={config.currencySymbol}
            className="text-sm"
          />
        </Card>

        {/* Día Límite */}
        <Card padding="md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Día Límite</h3>
          </div>
          <Input
            type="number"
            min="1"
            max="31"
            value={formData.penaltyDayThreshold}
            onChange={(e) => handleChange('penaltyDayThreshold', parseInt(e.target.value) || 3)}
            className="text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Después del día {formData.penaltyDayThreshold} aplica multa
          </p>
        </Card>

        {/* Total por Socio */}
        <Card padding="md" className="bg-primary-50 dark:bg-primary-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-primary-800 dark:text-primary-300">Total Mensual</h3>
          </div>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(
              (formData.monthlyShareAmount || 0) + (formData.monthlyExpenseAmount || 0),
              config.currencyCode
            )}
          </p>
          <p className="text-xs text-primary-600/70">Por socio/mes</p>
        </Card>

        {/* Zona de Peligro */}
        <Card padding="md" className="border-danger-200 dark:border-danger-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-danger-600" />
            </div>
            <h3 className="font-semibold text-danger-600">Zona Peligro</h3>
          </div>
          <Button 
            variant="danger" 
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Eliminar Todo
          </Button>
        </Card>

        {/* Ejercicio Contable */}
        <Card padding="md" className="bg-info-50 dark:bg-info-900/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-info-100 dark:bg-info-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-info-600" />
            </div>
            <h3 className="font-semibold text-info-800 dark:text-info-300">Ejercicio Contable</h3>
          </div>
          <p className="text-sm text-info-600 dark:text-info-400 mb-4">
            Cierra el ejercicio actual y establece el saldo como capital inicial del próximo año.
          </p>
          <div className="space-y-3">
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setShowAnnualClosingConfirm(true)}
              leftIcon={<Calendar className="w-4 h-4" />}
            >
              Realizar Cierre Anual
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadExcel}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                Reporte Excel
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadBackup}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Respaldo de Sistema
              </Button>
            </div>
            
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => setShowRestoreConfirm(true)}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Restaurar Respaldo
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal de ajuste de caja */}
      <Modal
        isOpen={showCashboxModal}
        onClose={() => setShowCashboxModal(false)}
        title="Ajustar Caja"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Monto (+ agrega / - resta)"
            type="number"
            value={cashboxAmount}
            onChange={(e) => setCashboxAmount(e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
            placeholder="Ej: 100 o -50"
          />
          <Input
            label="Descripción"
            value={cashboxDesc}
            onChange={(e) => setCashboxDesc(e.target.value)}
            placeholder="Motivo del ajuste (opcional)"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCashboxModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCashboxAdjust}>
              Aplicar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText('');
        }}
        title="⚠️ Eliminar todos los datos"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 rounded-xl">
            <p className="text-danger-800 dark:text-danger-300 font-medium">
              ¡Atención! Esta acción es irreversible.
            </p>
            <ul className="text-sm text-danger-600 dark:text-danger-400 mt-2 list-disc list-inside">
              <li>Todos los socios</li>
              <li>Todos los préstamos</li>
              <li>Todos los aportes</li>
              <li>Todos los gastos</li>
              <li>Todas las transacciones</li>
            </ul>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Escriba <span className="font-bold text-danger-600">ELIMINAR</span> para confirmar:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAllData}
              disabled={deleteConfirmText !== 'ELIMINAR'}
            >
              Eliminar permanentemente
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de cierre anual */}
      <Modal
        isOpen={showAnnualClosingConfirm}
        onClose={() => setShowAnnualClosingConfirm(false)}
        title="Cierre de Ejercicio Contable"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-info-50 dark:bg-info-900/20 rounded-xl">
            <p className="text-info-800 dark:text-info-300 font-medium">
              ¿Estás seguro de cerrar el ejercicio actual?
            </p>
            <p className="text-sm text-info-600 dark:text-info-400 mt-2">
              El saldo de caja actual ({formatCurrency(calculateAvailableCash(), config.currencyCode)}) será establecido como el capital inicial del próximo año.
            </p>
            <ul className="text-sm text-info-600 dark:text-info-400 mt-2 list-disc list-inside">
              <li>Los préstamos activos permanecerán sin cambios</li>
              <li>El historial de aportes se mantiene</li>
              <li>Solo se actualiza el saldo inicial</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => setShowAnnualClosingConfirm(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleAnnualClosing}
            >
              Confirmar Cierre                                                                                                                                    
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de restaurar respaldo */}
      <Modal
        isOpen={showRestoreConfirm}
        onClose={() => {
          setShowRestoreConfirm(false);
          setRestoreConfirmText('');
        }}
        title="Restaurar Respaldo"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 rounded-xl">
            <p className="text-danger-800 dark:text-danger-300 font-medium">
              ⚠️ Esta acción reemplazará todos los datos actuales
            </p>
            <ul className="text-sm text-danger-600 dark:text-danger-400 mt-2 list-disc list-inside">
              <li>Todos los socios serán reemplazados</li>
              <li>Todos los préstamos serán reemplazados</li>
              <li>Todos los aportes serán reemplazados</li>
              <li>La aplicación se recargará automáticamente</li>
            </ul>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Escriba <span className="font-bold text-danger-600">CONFIRMAR</span> para proceder:
            </label>
            <Input
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="CONFIRMAR"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowRestoreConfirm(false);
                setRestoreConfirmText('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              onClick={handleRestoreBackup}
              disabled={restoreConfirmText !== 'CONFIRMAR'}
            >
              Restaurar Datos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Settings;
