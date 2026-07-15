import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Checkbox } from '@/shared/ui/checkbox';
import { FormModal, ConfirmModal } from '@/shared/components/custom-modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { SearchInput } from '@/shared/components/SearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { MemberAvatar } from '@/shared/components/MemberAvatar';
import { Modal } from '@heroui/react';
import { formatCurrency } from '@/core/lib/formatters';
import { ContributionFormData, Member, Contribution } from '@/core/types';
import { Check, X, DollarSign, AlertTriangle, Trash2, Clock } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [contributionFilter, setContributionFilter] = useState('all');
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
        return 'bg-success/15 text-success cursor-pointer hover:bg-success/25';
      case 'paid_with_penalty':
        return 'bg-destructive/15 text-destructive cursor-pointer hover:bg-destructive/25';
      case 'pending':
        return 'bg-warning/15 text-warning cursor-pointer hover:bg-warning/25';
      case 'late':
        // late is still considered a type of paid entry when it actually represents
        // an older contribution; we give it a border so it stands out like the others
        return 'bg-warning/15 text-warning cursor-pointer hover:bg-warning/25';
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

  const filteredActiveMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return stats.activeMembers.filter((member) => {
      const matchesSearch = !query || member.name.toLowerCase().includes(query) || member.phone.includes(query);
      const currentStatus = getContributionStatus(member.id, stats.currentMonth);
      const hasLateContribution = months.some((month) => getContributionStatus(member.id, month.value) === "late");
      const matchesFilter = contributionFilter === "all"
        || (contributionFilter === "paid" && (currentStatus === "paid" || currentStatus === "paid_with_penalty"))
        || (contributionFilter === "pending" && currentStatus === "pending")
        || (contributionFilter === "late" && hasLateContribution)
        || (contributionFilter === "unregistered" && currentStatus === "none");

      return matchesSearch && matchesFilter;
    });
  }, [search, contributionFilter, stats.activeMembers, stats.currentMonth, months, contributionMap]);

  const selectedMember = members.find(m => m.id === selectedCell?.memberId);
  const editMember = selectedContribution ? members.find(m => m.id === selectedContribution.memberId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Aportes"
        description="Control de aportes mensuales de los socios"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Pagados"
          value={stats.totalPaid}
          description="aportes del año"
          icon={Check}
          tone="success"
        />
        <StatCard
          label="Pendientes"
          value={stats.totalPending}
          description="este mes"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Recaudado"
          value={formatCurrency(stats.totalAmount, config.currencyCode)}
          description="del año"
          icon={DollarSign}
          tone="primary"
        />
        <StatCard
          label="Multas"
          value={formatCurrency(stats.totalPenalties, config.currencyCode)}
          description="cobradas"
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          className="max-w-sm"
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar socio por nombre o teléfono..."
          aria-label="Buscar socios en aportes"
        />
        <Select value={contributionFilter} onValueChange={setContributionFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los socios</SelectItem>
            <SelectItem value="paid">Pagados este mes</SelectItem>
            <SelectItem value="pending">Pendientes este mes</SelectItem>
            <SelectItem value="late">Con atrasos</SelectItem>
            <SelectItem value="unregistered">Sin registrar este mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leyenda compacta */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 text-success">
          <Check className="w-3 h-3" /> Pagado
        </span>
        <span className="flex items-center gap-1.5 text-warning">
          <Clock className="w-3 h-3" /> Pendiente
        </span>
        <span className="flex items-center gap-1.5 text-destructive">
          <AlertTriangle className="w-3 h-3" /> Atrasado
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <X className="w-3 h-3" /> Sin registrar
        </span>
      </div>

      {/* Matriz de aportes */}
      <div className="space-y-3">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-50 bg-muted !text-left">Socio</TableHead>
                {months.map(month => (
                  <TableHead key={month.value} className="text-center text-xs min-w-18">
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActiveMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={months.length + 1} className="h-28 text-center text-sm text-muted-foreground">
                    No hay socios que coincidan con la búsqueda o el filtro.
                  </TableCell>
                </TableRow>
              ) : stats.activeMembers.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="sticky left-0 z-10 bg-card !text-left [&>div.flex]:!justify-start">
                    <div className="flex items-center gap-2">
                      <MemberAvatar name={member.name} photo={member.profilePhoto} />
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
                          className={`mx-auto size-10 rounded-full flex items-center justify-center transition-colors ${getCellStyle(status)}`}
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
          <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
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

          <div className="space-y-4">
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

          <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/10 bg-primary/5">
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

          <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
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
      <Modal.Backdrop variant="blur" isOpen={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditModal(false);
          setSelectedContribution(null);
        }
      }}>
        <Modal.Container size="md" className="modal--wide">
          <Modal.Dialog>
            <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Editar Aporte</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4 py-4">
            <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
              <p className="text-sm text-muted-foreground">Socio</p>
              <p className="font-semibold text-foreground">{editMember?.name}</p>
              <p className="text-sm text-muted-foreground mt-2">Mes</p>
              <p className="font-semibold text-foreground">
                {selectedContribution?.month ? new Date(selectedContribution.month + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>

            <div className="space-y-4">
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

            <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/10 bg-primary/5">
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

            <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
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

          </Modal.Body>
          <Modal.Footer className="modal--actions-inline flex w-full items-center !justify-end !gap-2 !px-4 !py-3">
            <Button className="inline-flex items-center justify-center gap-2" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="size-4 shrink-0" />
              Eliminar
            </Button>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit}>
              Guardar Cambios
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

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
