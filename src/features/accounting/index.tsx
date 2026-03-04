import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Checkbox } from '@/shared/ui/checkbox';
import { FormModal, ConfirmModal } from '@/shared/components/custom-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { formatCurrency } from '@/core/lib/formatters';
import { ContributionFormData, Member, Contribution } from '@/core/types';
import { Check, X, DollarSign, AlertTriangle, Edit2, Trash2, Clock } from 'lucide-react';

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

  // Generar los 12 meses del año actual (sin dependencia de la zona horaria al calcular el valor)
  const months = useMemo(() => {
    const result = [];

    for (let i = 0; i < 12; i++) {
      // valor YYYY-MM construido manualmente para evitar desplazamiento por UTC
      const m = i + 1;
      const value = `${currentYear}-${String(m).padStart(2, '0')}`;
      const date = new Date(currentYear, i, 1);
      const label = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      result.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return result;
  }, [currentYear]);

  // Devuelve el mes que deberíamos sugerir al abrir el modal para un socio
  // normalmente será el mes actual, o si ya está pagado, el primer mes
  // pendiente real. Esto evita que enero aparezca por defecto cuando
  // ya se pusieron todos los aportes anteriores.
  const getSuggestedMonth = (memberId: string) => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    // ¿Ya pagó el mes actual?
    const paidCurrent = contributions?.some(
      c => c.memberId === memberId && c.month === currentMonth && c.status === 'paid'
    );
    if (!paidCurrent) return currentMonth;

    // Busca el primer mes en la lista que no tenga aporte pagado
    for (const m of months) {
      const paid = contributions?.some(
        c => c.memberId === memberId && c.month === m.value && c.status === 'paid'
      );
      if (!paid) return m.value;
    }

    // Si todos están pagados de alguna forma, devuelve el mes actual para evitar cadenas vacías
    return currentMonth;
  };

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

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const activeMembers = members.filter(m => m.status === 'active');

    // Filtrar aportes del año actual
    const yearContributions = contributions.filter(c => c.month.startsWith(currentYear.toString()));

    // Total de pagos realizados (aportes pagados del año actual)
    // consider both on‑time and late payments as "pagados" (ya se registraron)
    const allPaidContributions = yearContributions.filter(c => c.status === 'paid' || c.status === 'late');
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

  const getContributionStatus = (memberId: string, month: string): 'paid' | 'paid_with_penalty' | 'pending' | 'late' | 'none' => {
    const contribution = contributionMap.get(`${memberId}-${month}`);
    if (!contribution) return 'none';
    if (contribution.status === 'paid') {
      return contribution.penaltyAmount > 0 ? 'paid_with_penalty' : 'paid';
    }
    if (contribution.status === 'late' || contribution.status === 'penalty') return 'late';
    return 'pending';
  };

  const handleCellClick = (member: Member, month: string) => {
    const status = getContributionStatus(member.id, month);
    const contribution = contributionMap.get(`${member.id}-${month}`);

    if ((status === 'paid' || status === 'paid_with_penalty') && contribution) {
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
      // Marcar como pagado sin cambiar el mes
      markContributionPaid(contribution.id);
      return;
    }

    // Abrir formulario para registrar nuevo aporte.
    // Usar exactamente el mes de la celda clickeada para evitar desplazamiento.
    // Esto garantiza que si el usuario hace clic en febrero, se registra febrero
    // (no marzo ni otro mes desplazado).
    setSelectedCell({ memberId: member.id, month });
    setFormData({
      memberId: member.id,
      month,
      shareAmount: config.monthlyShareAmount,
      expenseAmount: config.monthlyExpenseAmount,
      penaltyAmount: 0,
    });
    setWithPenalty(false);
    setShowForm(true);
  };

  const handleSubmit = () => {
    // Usar SIEMPRE el mes de selectedCell (establecido al hacer clic en la celda).
    // Esto garantiza que el mes es exactamente el de la celda clickeada sin desplazamientos.
    if (!selectedCell?.month) return;

    const finalFormData: ContributionFormData = {
      memberId: selectedCell.memberId,
      month: selectedCell.month,
      shareAmount: formData.shareAmount,
      expenseAmount: formData.expenseAmount,
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

  const getCellStyle = (status: 'paid' | 'paid_with_penalty' | 'pending' | 'late' | 'none') => {
    switch (status) {
      case 'paid':
        return 'border-2 border-emerald-700 bg-emerald-100/40 text-emerald-700 cursor-pointer hover:bg-emerald-100/80';
      case 'paid_with_penalty':
        return 'border-2 border-rose-700 bg-rose-100/40 text-rose-700 cursor-pointer hover:bg-rose-100/80';
      case 'pending':
        return 'border-2 border-yellow-600 bg-yellow-50/40 text-yellow-700 cursor-pointer hover:bg-yellow-50/80';
      case 'late':
        // late is still considered a type of paid entry when it actually represents
        // an older contribution; we give it a border so it stands out like the others
        return 'border-2 border-amber-700 bg-amber-100/40 text-amber-700 cursor-pointer hover:bg-amber-100/80';
      case 'none':
        return 'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80';
    }
  };

  const getCellIcon = (status: 'paid' | 'paid_with_penalty' | 'pending' | 'late' | 'none') => {
    switch (status) {
      case 'paid':
        return <Check className="w-5 h-5" />;
      case 'paid_with_penalty':
        return <AlertTriangle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'late':
        return <AlertTriangle className="w-5 h-5" />;
      case 'none':
        return <X className="w-5 h-5 opacity-30" />;
    }
  };

  const selectedMember = members.find(m => m.id === selectedCell?.memberId);
  const editMember = selectedContribution ? members.find(m => m.id === selectedContribution.memberId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Aportes
          </h1>
          <p className="text-muted-foreground mt-1">
            Control de aportes mensuales de los socios
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-emerald-600 bg-emerald-50 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-600" />
              <p className="text-sm text-emerald-600 dark:text-emerald-600">Pagados</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-600">{stats.totalPaid}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-600/70">aportes del año</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-yellow-600 bg-yellow-50 dark:bg-slate-900 dark:border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">Pendientes</p>
            </div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.totalPending}</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400/70">este mes</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-indigo-600 bg-indigo-50 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-600" />
              <p className="text-sm text-indigo-600 dark:text-indigo-600">Recaudado</p>
            </div>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-600">{formatCurrency(stats.totalAmount, config.currencyCode)}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-600/70">del año</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-red-600 bg-red-50 dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-600">Multas</p>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-600">{formatCurrency(stats.totalPenalties, config.currencyCode)}</p>
            <p className="text-xs text-red-600 dark:text-red-600/70">cobradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Leyenda compacta */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <Check className="w-3 h-3" /> Pagado
        </span>
        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <Clock className="w-3 h-3" /> Pendiente
        </span>
        <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" /> Atrasado
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <X className="w-3 h-3" /> Sin registrar
        </span>
      </div>

      {/* Matriz de aportes */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-muted z-10 min-w-50">Socio</TableHead>
                {months.map(month => (
                  <TableHead key={month.value} className="text-center text-xs min-w-18">
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.activeMembers.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-foreground truncate">
                        {member.name}
                      </span>
                    </div>
                  </TableCell>
                  {months.map((monthEntry) => {
                    const status = getContributionStatus(member.id, monthEntry.value);
                    return (
                      <TableCell key={monthEntry.value} className="text-center">
                        <button
                          onClick={() => handleCellClick(member, monthEntry.value)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${getCellStyle(status)}`}
                          title={`${member.name} - ${monthEntry.label}: ${status === 'paid' ? 'Pagado (click para editar)' : status === 'paid_with_penalty' ? 'Pagado con multa (click para editar)' : status === 'pending' ? 'Pendiente' : status === 'late' ? 'Atrasado' : 'Sin registrar'}`}
                        >
                          {getCellIcon(status)}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {stats.activeMembers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
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
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Socio</p>
            <p className="font-semibold text-foreground">{selectedMember?.name}</p>
            <p className="text-sm text-muted-foreground mt-2">Mes</p>
            <p className="font-semibold text-foreground">
              {selectedCell?.month ? (() => {
                const [year, monthNum] = selectedCell.month.split('-');
                const monthNames = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                return `${monthNames[parseInt(monthNum, 10)]} ${year}`;
              })() : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Aporte Capital</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.shareAmount}
                  onChange={(e) => setFormData({ ...formData, shareAmount: parseFloat(e.target.value) || 0 })}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gastos Admin.</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.expenseAmount}
                  onChange={(e) => setFormData({ ...formData, expenseAmount: parseFloat(e.target.value) || 0 })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="withPenalty"
              checked={withPenalty}
              onCheckedChange={(checked) => setWithPenalty(checked as boolean)}
            />
            <label htmlFor="withPenalty" className="flex-1 cursor-pointer">
              <span className="font-medium text-foreground">
                Aplicar multa por pago tardío
              </span>
              <span className="text-sm text-muted-foreground block">
                +{formatCurrency(config.penaltyAmount, config.currencyCode)}
              </span>
            </label>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Total a Pagar</span>
              <span className="text-2xl font-bold text-foreground">
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
      <Dialog open={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditModal(false);
          setSelectedContribution(null);
        }
      }}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Editar Aporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Socio</p>
              <p className="font-semibold text-foreground">{editMember?.name}</p>
              <p className="text-sm text-muted-foreground mt-2">Mes</p>
              <p className="font-semibold text-foreground">
                {selectedContribution?.month ? new Date(selectedContribution.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aporte Capital</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={formData.shareAmount}
                    onChange={(e) => setFormData({ ...formData, shareAmount: parseFloat(e.target.value) || 0 })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gastos Admin.</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={formData.expenseAmount}
                    onChange={(e) => setFormData({ ...formData, expenseAmount: parseFloat(e.target.value) || 0 })}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Checkbox
                id="withPenaltyEdit"
                checked={withPenalty}
                onCheckedChange={(checked) => setWithPenalty(checked as boolean)}
              />
              <label htmlFor="withPenaltyEdit" className="flex-1 cursor-pointer">
                <span className="font-medium text-foreground">
                  Multa por pago tardío
                </span>
                <span className="text-sm text-muted-foreground block">
                  +{formatCurrency(config.penaltyAmount, config.currencyCode)}
                </span>
              </label>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(
                    formData.shareAmount + formData.expenseAmount + (withPenalty ? config.penaltyAmount : 0),
                    config.currencyCode
                  )}
                </span>
              </div>
            </div>

          </div>
          <DialogFooter className="flex w-full sm:justify-between items-center mt-6">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubmit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Eliminar Aporte"
        message={`¿Está seguro de eliminar el aporte de ${editMember?.name} del mes ${selectedContribution?.month}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
      />
    </div>
  );
}

export default Accounting;
