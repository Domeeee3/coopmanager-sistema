import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal, { FormModal, ConfirmModal } from '../components/ui/Modal';
import { formatCurrency } from '../utils/formatters';
import { ContributionFormData, Member, Contribution } from '../types';
import { Check, X, DollarSign, AlertTriangle, Users, CheckCircle2, Edit2, Trash2 } from 'lucide-react';

export function Accounting() {
  const { 
    contributions, 
    members, 
    config, 
    addContribution, 
    markContributionPaid,
    updateContribution,
    deleteContribution,
    showToast,
    refunds
  } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ memberId: string; month: string } | null>(null);
  const [withPenalty, setWithPenalty] = useState(false);
  const currentYear = new Date().getFullYear();
  
  const [formData, setFormData] = useState<ContributionFormData>({
    memberId: '',
    month: '',
    shareAmount: config.monthlyShareAmount,
    expenseAmount: config.monthlyExpenseAmount,
    penaltyAmount: 0,
  });

  // Generar los 12 meses del año actual
  const months = useMemo(() => {
    const result = [];
    
    // Generar desde enero hasta diciembre del año actual
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentYear, i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      result.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return result;
  }, [currentYear]);

  // Crear mapa de contribuciones para búsqueda rápida
  const contributionMap = useMemo(() => {
    const map = new Map<string, Contribution>();
    if (contributions) {
      contributions.forEach(c => {
        map.set(`${c.memberId}-${c.month}`, c);
      });
    }
    return map;
  }, [contributions]);

  // Estadísticas generales - basadas en datos del año actual
  const stats = useMemo(() => {
    // Seguridad contra undefined
    if (!members || !contributions) {
      return { totalPaid: 0, totalPending: 0, totalAmount: 0, totalPenalties: 0, currentMonth: '', activeMembers: [] };
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const activeMembers = members.filter(m => m.status === 'active');
    
    // Filtrar aportes del año actual
    const yearContributions = contributions.filter(c => c.month.startsWith(currentYear.toString()));
    
    // Total de pagos realizados (aportes pagados del año actual)
    const allPaidContributions = yearContributions.filter(c => c.status === 'paid');
    const activePaidContributions = allPaidContributions.filter(c => activeMembers.some(m => m.id === c.memberId));
    const totalPaid = activePaidContributions.length;
    
    // Pendientes del mes actual: Solo socios activos, resta los que ya pagaron
    const membersWhoPaidCurrentMonth = new Set(
      contributions
        .filter(c => c.month === currentMonth && c.status === 'paid' && activeMembers.some(m => m.id === c.memberId))
        .map(c => c.memberId)
    );
    const totalPending = activeMembers.length - membersWhoPaidCurrentMonth.size;
    
    // Total recaudado: Solo capital (shareAmount + expenseAmount) del año actual - refunds del año actual
    const totalContributions = allPaidContributions.reduce((sum, c) => 
      sum + ((c.shareAmount || 0) + (c.expenseAmount || 0)), 0
    );
    const yearRefunds = (refunds || []).filter(r => {
      const refundYear = new Date(r.depositDate).getFullYear();
      return refundYear === currentYear;
    });
    const totalRefunds = yearRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalAmount = totalContributions - totalRefunds;
    
    // Total multas (del año actual)
    const totalPenalties = allPaidContributions.reduce((sum, c) => sum + (c.penaltyAmount || 0), 0);

    return { totalPaid, totalPending, totalAmount, totalPenalties, currentMonth, activeMembers };
  }, [contributions, members, refunds, currentYear]);

  const getContributionStatus = (memberId: string, month: string): 'paid' | 'pending' | 'late' | 'none' => {
    const contribution = contributionMap.get(`${memberId}-${month}`);
    if (!contribution) return 'none';
    if (contribution.status === 'paid') return 'paid';
    if (contribution.status === 'late' || contribution.status === 'penalty') return 'late';
    return 'pending';
  };

  const handleCellClick = (member: Member, month: string) => {
    const status = getContributionStatus(member.id, month);
    const contribution = contributionMap.get(`${member.id}-${month}`);
    
    if (status === 'paid' && contribution) {
      // Abrir modal de edición/eliminación
      setSelectedContribution(contribution);
      setFormData({
        memberId: contribution.memberId,
        month: contribution.month,
        shareAmount: contribution.shareAmount,
        expenseAmount: contribution.expenseAmount,
        penaltyAmount: contribution.penaltyAmount,
      });
      setWithPenalty(contribution.penaltyAmount > 0);
      setShowEditModal(true);
      return;
    }

    if (status === 'pending' && contribution) {
      // Marcar como pagado
      markContributionPaid(contribution.id);
      return;
    }

    // Abrir formulario para registrar nuevo aporte
    setSelectedCell({ memberId: member.id, month });
    setFormData({
      memberId: member.id,
      month: month,
      shareAmount: config.monthlyShareAmount,
      expenseAmount: config.monthlyExpenseAmount,
      penaltyAmount: 0,
    });
    setWithPenalty(false);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!selectedCell) return;

    const finalFormData = {
      ...formData,
      penaltyAmount: withPenalty ? config.penaltyAmount : 0,
    };

    addContribution(finalFormData);
    setShowForm(false);
    setSelectedCell(null);
  };

  const handleEditSubmit = () => {
    if (!selectedContribution) return;
    
    const newTotal = formData.shareAmount + formData.expenseAmount + (withPenalty ? config.penaltyAmount : 0);
    
    updateContribution(selectedContribution.id, {
      shareAmount: formData.shareAmount,
      expenseAmount: formData.expenseAmount,
      penaltyAmount: withPenalty ? config.penaltyAmount : 0,
      totalAmount: newTotal,
    });
    
    setShowEditModal(false);
    setSelectedContribution(null);
  };

  const handleDelete = () => {
    if (!selectedContribution) return;
    
    deleteContribution(selectedContribution.id);
    setShowDeleteConfirm(false);
    setShowEditModal(false);
    setSelectedContribution(null);
  };

  const getCellStyle = (status: 'paid' | 'pending' | 'late' | 'none') => {
    switch (status) {
      case 'paid':
        return 'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 cursor-pointer hover:bg-success-200 dark:hover:bg-success-900/50';
      case 'pending':
        return 'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 cursor-pointer hover:bg-warning-200 dark:hover:bg-warning-900/50';
      case 'late':
        return 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 cursor-pointer hover:bg-danger-200 dark:hover:bg-danger-900/50';
      case 'none':
        return 'bg-slate-50 dark:bg-slate-800 text-slate-400 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20';
    }
  };

  const getCellIcon = (status: 'paid' | 'pending' | 'late' | 'none') => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4" />;
      case 'pending':
        return <DollarSign className="w-4 h-4" />;
      case 'late':
        return <AlertTriangle className="w-4 h-4" />;
      case 'none':
        return <X className="w-4 h-4 opacity-30" />;
    }
  };

  const selectedMember = members.find(m => m.id === selectedCell?.memberId);
  const editMember = selectedContribution ? members.find(m => m.id === selectedContribution.memberId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Aportes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Control de aportes mensuales de los socios
          </p>
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-900/10 border-success-200 dark:border-success-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-sm text-success-600 dark:text-success-400">Aportes Pagados</p>
                <p className="text-2xl font-bold text-success-700 dark:text-success-300">{stats.totalPaid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/20 dark:to-warning-900/10 border-warning-200 dark:border-warning-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-500/20 rounded-lg">
                <Users className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-warning-600 dark:text-warning-400">Pendientes (este mes)</p>
                <p className="text-2xl font-bold text-warning-700 dark:text-warning-300">{stats.totalPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/10 border-primary-200 dark:border-primary-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-primary-600 dark:text-primary-400">Total Recaudado</p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                  {formatCurrency(stats.totalAmount, config.currencyCode)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-danger-50 to-danger-100 dark:from-danger-900/20 dark:to-danger-900/10 border-danger-200 dark:border-danger-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-danger-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-danger-600 dark:text-danger-400">Total Multas</p>
                <p className="text-2xl font-bold text-danger-700 dark:text-danger-300">
                  {formatCurrency(stats.totalPenalties, config.currencyCode)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
            <Check className="w-3 h-3 text-success-600" />
          </div>
          <span className="text-slate-600 dark:text-slate-400">Pagado (click para editar)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
            <DollarSign className="w-3 h-3 text-warning-600" />
          </div>
          <span className="text-slate-600 dark:text-slate-400">Pendiente (click para pagar)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <AlertTriangle className="w-3 h-3 text-danger-600" />
          </div>
          <span className="text-slate-600 dark:text-slate-400">Atrasado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <X className="w-3 h-3 text-slate-400" />
          </div>
          <span className="text-slate-600 dark:text-slate-400">Sin registrar (click para crear)</span>
        </div>
      </div>

      {/* Matriz de aportes */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 z-10 min-w-[200px]">
                  Socio
                </th>
                {months.map(month => (
                  <th 
                    key={month.value} 
                    className="px-3 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 min-w-[70px]"
                  >
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.activeMembers.map(member => (
                <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="sticky left-0 bg-white dark:bg-slate-900 px-4 py-3 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white truncate">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  {months.map(month => {
                    const status = getContributionStatus(member.id, month.value);
                    return (
                      <td key={month.value} className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleCellClick(member, month.value)}
                          className={`
                            w-10 h-10 rounded-lg flex items-center justify-center transition-all
                            ${getCellStyle(status)}
                          `}
                          title={`${member.name} - ${month.label}: ${status === 'paid' ? 'Pagado (click para editar)' : status === 'pending' ? 'Pendiente' : status === 'late' ? 'Atrasado' : 'Sin registrar'}`}
                        >
                          {getCellIcon(status)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {stats.activeMembers.length === 0 && (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No hay socios registrados. Agregue socios desde la sección de Socios.
          </div>
        )}
      </Card>

      {/* Modal para registrar aporte */}
      <FormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedCell(null);
        }}
        onSubmit={handleSubmit}
        title="Registrar Aporte"
        submitText="Registrar y Marcar Pagado"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400">Socio</p>
            <p className="font-semibold text-slate-900 dark:text-white">{selectedMember?.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Mes</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {selectedCell?.month ? new Date(selectedCell.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Aporte Capital"
              type="number"
              value={formData.shareAmount}
              onChange={(e) => setFormData({ ...formData, shareAmount: parseFloat(e.target.value) || 0 })}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
            <Input
              label="Gastos Admin."
              type="number"
              value={formData.expenseAmount}
              onChange={(e) => setFormData({ ...formData, expenseAmount: parseFloat(e.target.value) || 0 })}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
            <input
              type="checkbox"
              id="withPenalty"
              checked={withPenalty}
              onChange={(e) => setWithPenalty(e.target.checked)}
              className="w-5 h-5 rounded border-warning-300 text-warning-600 focus:ring-warning-500"
            />
            <label htmlFor="withPenalty" className="flex-1">
              <span className="font-medium text-warning-800 dark:text-warning-300">
                Aplicar multa por pago tardío
              </span>
              <span className="text-sm text-warning-600 dark:text-warning-400 block">
                +{formatCurrency(config.penaltyAmount, config.currencyCode)}
              </span>
            </label>
          </div>

          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-medium text-primary-800 dark:text-primary-300">Total a Pagar</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(
                  formData.shareAmount + formData.expenseAmount + (withPenalty ? config.penaltyAmount : 0),
                  config.currencyCode
                )}
              </span>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Modal para editar aporte */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedContribution(null);
        }}
        title="Editar Aporte"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400">Socio</p>
            <p className="font-semibold text-slate-900 dark:text-white">{editMember?.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Mes</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {selectedContribution?.month ? new Date(selectedContribution.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Aporte Capital"
              type="number"
              value={formData.shareAmount}
              onChange={(e) => setFormData({ ...formData, shareAmount: parseFloat(e.target.value) || 0 })}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
            <Input
              label="Gastos Admin."
              type="number"
              value={formData.expenseAmount}
              onChange={(e) => setFormData({ ...formData, expenseAmount: parseFloat(e.target.value) || 0 })}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
            <input
              type="checkbox"
              id="withPenaltyEdit"
              checked={withPenalty}
              onChange={(e) => setWithPenalty(e.target.checked)}
              className="w-5 h-5 rounded border-warning-300 text-warning-600 focus:ring-warning-500"
            />
            <label htmlFor="withPenaltyEdit" className="flex-1">
              <span className="font-medium text-warning-800 dark:text-warning-300">
                Multa por pago tardío
              </span>
              <span className="text-sm text-warning-600 dark:text-warning-400 block">
                +{formatCurrency(config.penaltyAmount, config.currencyCode)}
              </span>
            </label>
          </div>

          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-medium text-primary-800 dark:text-primary-300">Total</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(
                  formData.shareAmount + formData.expenseAmount + (withPenalty ? config.penaltyAmount : 0),
                  config.currencyCode
                )}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="danger" 
              onClick={() => setShowDeleteConfirm(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Eliminar
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} leftIcon={<Edit2 className="w-4 h-4" />}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar Aporte"
        message={`¿Está seguro de eliminar el aporte de ${editMember?.name} del mes ${selectedContribution?.month}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

export default Accounting;
