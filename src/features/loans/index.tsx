import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
import { AlertDialog, Button, Chip, Card, Checkbox, Input, Label, ListBox, ProgressBar, Select, Table, TextArea, TextField } from '@heroui/react';
import { FormModal } from '@/shared/components/custom-modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { tableStyles } from '@/shared/components/table-styles';
import { DataTable, Column } from '@/shared/components/data-table';
import { DatePicker } from "@/shared/ui/date-picker";
import { StatCard } from '@/shared/components/StatCard';
import { MemberAvatar } from '@/shared/components/MemberAvatar';
import { TableActionButton } from '@/shared/components/TableActionButton';
import { formatCurrency, formatDate, formatPercentage } from '@/core/lib/formatters';
import { Loan, LoanFormData, Member } from '@/core/types';
import { calculateFrenchAmortization } from '@/core/hooks/useFinance';
import {
  Plus, CreditCard, DollarSign, Calendar as CalendarIcon,
  RefreshCw, Eye, TrendingUp, Calculator, ArrowLeft, Trash2, AlertTriangle, MessageSquare, Undo2
} from 'lucide-react';
import { RefinanceModal } from './components/RefinanceModal';

type ViewMode = 'members' | 'member-loans' | 'loan-detail';
type LoanFilter = "all" | "active" | "pending_retention" | "paid";

interface MemberLoanSummary {
  member: Member;
  totalLoans: number;
  activeLoans: number;
  pendingRetentionLoans: number;
  paidLoans: number;
  totalLoaned: number;
  totalDebt: number;
}

export function Loans() {
  const {
    loans,
    members,
    config,
    transactions,
    addLoan,
    payRetention,
    prepayLoan,
    refinanceLoan,
    deleteLoan,
    deleteLoanPayment,
    showToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('members');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [loanFilter, setLoanFilter] = useState<LoanFilter>("all");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showRefinance, setShowRefinance] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [appliedLatePaymentPenalty, setAppliedLatePaymentPenalty] = useState(false);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // Annul payment modal states
  const [isAnnulModalOpen, setIsAnnulModalOpen] = useState(false);
  const [loanToAnnul, setLoanToAnnul] = useState<Loan | null>(null);

  const [formData, setFormData] = useState<LoanFormData>({
    memberId: '',
    amount: 0,
    monthlyInterestRate: config.monthlyInterestRate,
    termMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    retentionPaid: false,
  });

  const [simulatedLoan, setSimulatedLoan] = useState<ReturnType<typeof calculateFrenchAmortization> | null>(null);

  // Prefill payment with the smaller of cuota mensual or saldo pendiente
  // Also initialize late payment penalty based on current date
  React.useEffect(() => {
    if (selectedLoan && showPayment) {
      const suggested = Math.min(selectedLoan.remainingPrincipal, selectedLoan.monthlyPayment);
      setPaymentAmount(suggested.toFixed(2));
      
      const today = new Date();
      const currentDay = today.getDate();
      const dueDay = config.loanPaymentDueDay ?? 18;
      setAppliedLatePaymentPenalty(currentDay >= dueDay);
    }
  }, [selectedLoan, showPayment, config.loanPaymentDueDay]);

  // Simular préstamo
  React.useEffect(() => {
    if (formData.amount > 0 && formData.termMonths > 0) {
      const result = calculateFrenchAmortization(
        formData.amount,
        formData.monthlyInterestRate,
        formData.termMonths,
        formData.startDate,
        config.transferFee
      );
      setSimulatedLoan(result);
    }
  }, [formData.amount, formData.monthlyInterestRate, formData.termMonths, formData.startDate, config.transferFee]);

  // Resumen de préstamos por socio para la vista principal
  const memberLoanSummaries = useMemo<MemberLoanSummary[]>(() => {
    return members
      .filter((member) => member.status === "active")
      .map((member) => {
        const memberLoans = loans.filter((loan) => loan.memberId === member.id);
        const activeLoans = memberLoans.filter((loan) => loan.status === "active");
        const pendingRetentionLoans = memberLoans.filter((loan) => loan.status === "pending_retention");
        const paidLoans = memberLoans.filter((loan) => loan.status === "paid");

        if (memberLoans.length === 0) return null;

        return {
          member,
          totalLoans: memberLoans.length,
          activeLoans: activeLoans.length,
          pendingRetentionLoans: pendingRetentionLoans.length,
          paidLoans: paidLoans.length,
          totalLoaned: memberLoans.reduce((sum, loan) => sum + loan.amount, 0),
          totalDebt: activeLoans.reduce((sum, loan) => sum + loan.remainingPrincipal, 0),
        };
      })
      .filter((summary): summary is MemberLoanSummary => summary !== null);
  }, [members, loans]);

  const loanFilterOptions = useMemo<Array<{ value: LoanFilter; label: string; count: number }>>(() => [
    { value: "all", label: "Todos", count: memberLoanSummaries.length },
    { value: "active", label: "Con préstamos activos", count: memberLoanSummaries.filter((summary) => summary.activeLoans > 0).length },
    { value: "pending_retention", label: "Retención pendiente", count: memberLoanSummaries.filter((summary) => summary.pendingRetentionLoans > 0).length },
    { value: "paid", label: "Préstamos pagados", count: memberLoanSummaries.filter((summary) => summary.totalLoans > 0 && summary.activeLoans === 0 && summary.pendingRetentionLoans === 0 && summary.paidLoans > 0).length },
  ], [memberLoanSummaries]);

  const filteredMemberLoanSummaries = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return memberLoanSummaries.filter((summary) => {
      const matchesSearch = !query || summary.member.name.toLowerCase().includes(query) || summary.member.phone.includes(query);
      const matchesFilter = loanFilter === "all"
        || (loanFilter === "active" && summary.activeLoans > 0)
        || (loanFilter === "pending_retention" && summary.pendingRetentionLoans > 0)
        || (loanFilter === "paid" && summary.activeLoans === 0 && summary.pendingRetentionLoans === 0 && summary.paidLoans > 0);

      return matchesSearch && matchesFilter;
    });
  }, [memberLoanSummaries, memberSearch, loanFilter]);

  // Préstamos del socio seleccionado
  const memberLoans = useMemo(() => {
    if (!selectedMember) return [];
    return loans
      .filter(l => l.memberId === selectedMember.id)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [loans, selectedMember]);

  // Clasificar préstamos
  const activeLoans = useMemo(() =>
    memberLoans.filter(loan => loan.remainingPrincipal > 0.01), [memberLoans]
  );
  const paidLoans = useMemo(() =>
    memberLoans.filter(loan => loan.remainingPrincipal <= 0.01), [memberLoans]
  );

  // Actualizar selectedLoan cuando cambie el array de loans
  React.useEffect(() => {
    if (selectedLoan) {
      const updatedLoan = loans.find(l => l.id === selectedLoan.id);
      if (updatedLoan) {
        setSelectedLoan(updatedLoan);
      }
    }
  }, [loans]);

  // Tabla de amortización
  const amortizationSchedule = useMemo(() => {
    if (!selectedLoan) return null;
    return calculateFrenchAmortization(
      selectedLoan.amount,
      selectedLoan.monthlyInterestRate,
      selectedLoan.termMonths,
      selectedLoan.startDate,
      selectedLoan.transferFee || config.transferFee
    );
  }, [selectedLoan]);

  // Handlers
  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setViewMode('member-loans');
  };

  const handleSelectLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setViewMode('loan-detail');
  };

  const handleBack = () => {
    if (viewMode === 'loan-detail') {
      setViewMode('member-loans');
      setSelectedLoan(null);
    } else if (viewMode === 'member-loans') {
      setViewMode('members');
      setSelectedMember(null);
    }
  };

  const handleOpenForm = (member?: Member) => {
    setFormData({
      memberId: member?.id || '',
      amount: 0,
      monthlyInterestRate: config.monthlyInterestRate,
      termMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      notes: '',
      retentionPaid: false,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.memberId || formData.amount <= 0) {
      showToast('error', 'Error de validación', 'Complete todos los campos.');
      return;
    }

    // Calcular el monto de retención usando la tasa de interés mensual
    const retentionToPass = formData.amount * formData.monthlyInterestRate / 100;

    addLoan({
      ...formData,
      retentionAmount: retentionToPass,
    });
    setShowForm(false);
  };

  const handlePayment = () => {
    if (!selectedLoan) return;
    const amount = parseFloat(paymentAmount);

    // Permitir pagos de $0.00 solo si el saldo pendiente es $0.00
    const isZeroPaymentAllowed = Math.abs(selectedLoan.remainingPrincipal) <= 0.01 && amount === 0;

    if (isNaN(amount) || (amount <= 0 && !isZeroPaymentAllowed)) {
      showToast('error', 'Error', 'Ingrese un monto válido');
      return;
    }
    if (amount > selectedLoan.remainingPrincipal && Math.abs(selectedLoan.remainingPrincipal) > 0.01) {
      showToast('error', 'Monto excesivo', `El pago no puede exceder el saldo pendiente de ${formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}`);
      return;
    }
    prepayLoan(selectedLoan.id, amount, appliedLatePaymentPenalty);
    setShowPayment(false);
    setPaymentAmount('');
    setAppliedLatePaymentPenalty(false);
  };

  const handleFinalizeLoan = () => {
    if (!selectedLoan) return;
    // Pago de $0.00 para forzar el cierre cuando el saldo ya es cero
    prepayLoan(selectedLoan.id, 0);
    setShowPayment(false);
    setPaymentAmount('');
  };

  const handleRefinanceSubmit = (newTermMonths: number) => {
    if (selectedLoan) {
      refinanceLoan(selectedLoan.id, newTermMonths);
      setShowRefinance(false);
      setViewMode('member-loans');
    }
  };

  const handleDeleteLoan = (loan: Loan) => {
    setLoanToDelete(loan);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (loanToDelete) {
      deleteLoan(loanToDelete.id);
      setIsDeleteModalOpen(false);
      setLoanToDelete(null);
    }
  };

  const handleAnnulPayment = (loan: Loan) => {
    setLoanToAnnul(loan);
    setIsAnnulModalOpen(true);
  };

  const handleConfirmAnnul = () => {
    if (loanToAnnul) {
      deleteLoanPayment(loanToAnnul.id);
      setIsAnnulModalOpen(false);
      setLoanToAnnul(null);
    }
  };

  const memberOptions = members
    .filter(m => m.status === 'active')
    .map(m => ({ value: m.id, label: m.name }));

  // Stats
  const stats = useMemo(() => ({
    totalActive: loans.filter(l => l.status === 'active').length,
    totalLoaned: loans.reduce((sum, l) => sum + l.amount, 0),
    totalInterest: loans.reduce((sum, l) => sum + l.totalInterest, 0),
    totalPending: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.remainingPrincipal, 0),
  }), [loans]);

  const loanColumns: Column<Loan>[] = [
    {
      key: "status",
      header: "Estado",
      render: (loan) => {
        const status = {
          pending_retention: { label: "Retención pendiente", className: "bg-warning/10 text-warning" },
          active: { label: "Activo", className: "bg-primary/10 text-primary" },
          paid: { label: "Pagado", className: "bg-success/10 text-success" },
          refinanced: { label: "Refinanciado", className: "bg-secondary/10 text-secondary" },
          defaulted: { label: "En mora", className: "bg-destructive/10 text-destructive" },
          cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
        }[loan.status];

        return <Chip size="sm" variant="soft" className={status.className}>{status.label}</Chip>;
      },
    },
    {
      key: "amount",
      header: "Monto",
      align: "right",
      render: (loan) => formatCurrency(loan.amount, config.currencyCode),
    },
    {
      key: "monthlyPayment",
      header: "Cuota mensual",
      align: "right",
      render: (loan) => formatCurrency(loan.monthlyPayment, config.currencyCode),
    },
    {
      key: "remainingPrincipal",
      header: "Saldo pendiente",
      align: "right",
      render: (loan) => (
        <span className={loan.remainingPrincipal > 0.01 ? "font-medium text-destructive" : "font-medium text-success"}>
          {formatCurrency(loan.remainingPrincipal, config.currencyCode)}
        </span>
      ),
    },
    {
      key: "termMonths",
      header: "Plazo",
      align: "center",
      render: (loan) => loan.termMonths + " meses",
    },
    {
      key: "startDate",
      header: "Inicio",
      render: (loan) => formatDate(loan.startDate),
    },
    {
      key: "actions",
      header: "Acciones",
      align: "center",
      width: "88px",
      render: (loan) => {
        const hasPayments = transactions.some(
          (transaction) => transaction.referenceId === loan.id && transaction.type === "loan_payment",
        );

        return hasPayments ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <TableActionButton
            label="Eliminar préstamo"
            icon={Trash2}
            tone="danger"
            onPress={() => handleDeleteLoan(loan)}
          />
        );
      },
    },
  ];

  const memberLoanColumns: Column<MemberLoanSummary>[] = [
    {
      key: "member",
      header: "Socio",
      width: "28%",
      align: "left",
      render: ({ member }) => (
        <div className="flex !justify-start items-center gap-3">
          <MemberAvatar name={member.name} photo={member.profilePhoto} />
          <div>
            <p className="font-medium text-foreground">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.phone || "Sin teléfono"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "loans",
      header: "Préstamos",
      width: "17%",
      align: "center",
      render: ({ totalLoans, activeLoans, paidLoans }) => {
        if (totalLoans === 0) return <span className="text-muted-foreground">—</span>;
        return <span>{activeLoans} activo(s) · {paidLoans} pagado(s)</span>;
      },
    },
    {
      key: "pendingRetentionLoans",
      header: "Retención",
      width: "14%",
      align: "center",
      render: ({ pendingRetentionLoans }) => pendingRetentionLoans,
    },
    {
      key: "totalLoaned",
      header: "Total otorgado",
      width: "16%",
      align: "right",
      render: ({ totalLoaned }) => formatCurrency(totalLoaned, config.currencyCode),
    },
    {
      key: "totalDebt",
      header: "Saldo pendiente",
      width: "15%",
      align: "right",
      render: ({ totalDebt }) => (
        <span className={totalDebt > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
          {formatCurrency(totalDebt, config.currencyCode)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "10%",
      align: "center",
      render: ({ totalLoans, activeLoans, pendingRetentionLoans, paidLoans }) => {
        if (totalLoans === 0) return <Chip size="sm" variant="soft" className="bg-muted text-muted-foreground">Sin préstamos</Chip>;
        if (pendingRetentionLoans > 0) return <Chip size="sm" variant="soft" className="bg-warning/10 text-warning">Pendiente</Chip>;
        if (activeLoans > 0) return <Chip size="sm" variant="soft" className="bg-primary/10 text-primary">Activo</Chip>;
        return <Chip size="sm" variant="soft" className="bg-success/10 text-success">Pagado</Chip>;
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={
          viewMode === "members"
            ? "Préstamos"
            : viewMode === "member-loans"
              ? selectedMember?.name || ""
              : viewMode === "loan-detail"
                ? "Préstamo #" + selectedLoan?.id.slice(0, 8)
                : ""
        }
        description={
          viewMode === "members"
            ? "Seleccione una fila para ver los préstamos del socio"
            : viewMode === "member-loans"
              ? memberLoans.length + " préstamo(s) registrado(s)"
              : viewMode === "loan-detail"
                ? "Iniciado el " + formatDate(selectedLoan?.startDate || "")
                : ""
        }
        actions={
          <>
            {viewMode !== "members" && (
              <Button variant="ghost" size="sm" onPress={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            )}
            {viewMode === "members" && (
              <Button onPress={() => handleOpenForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Préstamo
              </Button>
            )}
            {viewMode === "member-loans" && selectedMember && (
              <Button onPress={() => handleOpenForm(selectedMember)}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Préstamo
              </Button>
            )}
          </>
        }
      />

      {/* Vista: Lista de Socios */}
      {viewMode === 'members' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Activos"
              value={stats.totalActive}
              icon={CreditCard}
              tone="primary"
            />
            <StatCard
              label="Total Prestado"
              value={formatCurrency(stats.totalLoaned, config.currencyCode)}
              icon={DollarSign}
              tone="success"
            />
            <StatCard
              label="Interés Total"
              value={formatCurrency(stats.totalInterest, config.currencyCode)}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              label="Por Cobrar"
              value={formatCurrency(stats.totalPending, config.currencyCode)}
              icon={CalendarIcon}
              tone="warning"
            />
          </div>

          <DataTable
            data={filteredMemberLoanSummaries}
            columns={memberLoanColumns}
            keyExtractor={({ member }) => member.id}
            searchValue={memberSearch}
            onSearchChange={setMemberSearch}
            searchPlaceholder="Buscar socio por nombre o teléfono..."
            toolbar={(
              <Select
                className="w-full sm:w-56"
                value={loanFilter}
                onChange={(value) => setLoanFilter(value as LoanFilter)}
                aria-label="Filtrar préstamos"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {loanFilterOptions.map((filter) => (
                      <ListBox.Item key={filter.value} id={filter.value} textValue={filter.label}>
                        {filter.label} ({filter.count})
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
            onRowClick={({ member }) => handleSelectMember(member)}
            emptyMessage="No hay socios que coincidan con los filtros"
          />
        </>
      )}

      {/* Vista: Préstamos del Socio */}
      {viewMode === 'member-loans' && selectedMember && (
        <div className="space-y-6">
          {memberLoans.length === 0 ? (
            <Card className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Este socio no tiene préstamos registrados</p>
              <Button className="mt-4" onPress={() => handleOpenForm(selectedMember)}>
                Crear Primer Préstamo
              </Button>
            </Card>
          ) : (
            <>
              {activeLoans.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Activos</h3>
                  <DataTable
                    data={activeLoans}
                    columns={loanColumns}
                    keyExtractor={(loan) => loan.id}
                    onRowClick={handleSelectLoan}
                    emptyMessage="No hay préstamos activos"
                  />
                </div>
              )}

              {paidLoans.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Pagados</h3>
                  <DataTable
                    data={paidLoans}
                    columns={loanColumns}
                    keyExtractor={(loan) => loan.id}
                    onRowClick={handleSelectLoan}
                    emptyMessage="No hay préstamos pagados"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Vista: Detalle del Préstamo */}
      {viewMode === 'loan-detail' && selectedLoan && amortizationSchedule && (
        <div className="space-y-6">
          {/* Alerta de retención pendiente */}
          {selectedLoan.status === 'pending_retention' && (
            <div className="bg-warning/10 border border-warning/30 rounded-[var(--radius)] p-4">
              <div className="flex items-start gap-4">
                <Calculator className="w-5 h-5 text-warning shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning mb-1">
                    Retención por Suministros Pendiente
                  </h3>
                  <p className="text-sm text-warning mb-3">
                    Se debe cobrar {formatCurrency(selectedLoan.retentionAmount, config.currencyCode)} ({formatPercentage(config.retentionRate)}) antes de desembolsar el préstamo.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => payRetention(selectedLoan.id)}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Registrar Pago de Retención
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Info del préstamo */}
          <Card>
            <Card.Content className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedLoan.amount, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedLoan.monthlyPayment, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasa Mensual</p>
                  <p className="text-xl font-bold text-foreground">{formatPercentage(selectedLoan.monthlyInterestRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}</p>
                </div>
              </div>

              {/* Notas */}
              {selectedLoan.notes && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Notas del Préstamo</p>
                      <p className="text-base text-foreground">{selectedLoan.notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span>{selectedLoan.paidInstallments}/{selectedLoan.totalInstallments} cuotas pagadas</span>
                  <span className="font-semibold">{((selectedLoan.paidInstallments / selectedLoan.totalInstallments) * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar
                  value={(selectedLoan.paidInstallments / selectedLoan.totalInstallments) * 100}
                  aria-label="Progreso del préstamo"
                >
                  <ProgressBar.Track className="h-3">
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>
              </div>

              {/* Actions */}
              {selectedLoan.remainingPrincipal > 0.01 && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                  <Button
                    onPress={() => setShowPayment(true)}
                    isDisabled={selectedLoan.status === 'pending_retention'}
                    className={selectedLoan.status === 'pending_retention' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Registrar Pago
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => setShowRefinance(true)}
                    isDisabled={selectedLoan.status === 'pending_retention'}
                    className={selectedLoan.status === 'pending_retention' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refinanciar
                  </Button>
                  {selectedLoan.paidInstallments > 0 && (
                    <Button
                      variant="danger"
                      onPress={() => handleAnnulPayment(selectedLoan)}
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      Anular último pago
                    </Button>
                  )}
                </div>
              )}
              {/* If fully paid, still allow annulling */}
              {selectedLoan.remainingPrincipal <= 0.01 && selectedLoan.paidInstallments > 0 && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                  <Button
                    variant="danger"
                    onPress={() => handleAnnulPayment(selectedLoan)}
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Anular último pago
                  </Button>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Tabla de amortización */}
          <Card>
            <Card.Header>
              <Card.Title>Tabla de Amortización</Card.Title>
            </Card.Header>
            <Card.Content>
              <Table className={tableStyles.root}>
                <Table.ScrollContainer className={tableStyles.scroll}>
                  <Table.Content aria-label="Tabla de Amortización">
                    <Table.Header className={tableStyles.header}>
                      <Table.Column id="installment" isRowHeader className={tableStyles.column}>#</Table.Column>
                      <Table.Column id="fecha" className={tableStyles.column}>Fecha</Table.Column>
                      <Table.Column id="capital" className={tableStyles.column + " text-right"}>Capital</Table.Column>
                      <Table.Column id="inter-s" className={tableStyles.column + " text-right"}>Interés</Table.Column>
                      <Table.Column id="transfer" className={tableStyles.column + " text-right"}>Transfer.</Table.Column>
                      <Table.Column id="total-cuota" className={tableStyles.column + " text-right"}>Total Cuota</Table.Column>
                      <Table.Column id="saldo" className={tableStyles.column + " text-right"}>Saldo</Table.Column>
                      <Table.Column id="estado" className={tableStyles.column + " text-center"}>Estado</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {amortizationSchedule.schedule.map((entry) => {
                      const isPaid = entry.installmentNumber <= selectedLoan.paidInstallments;
                      const hadPenalty = isPaid && selectedLoan.lastPaymentPenalty && selectedLoan.lastPaymentPenalty > 0 && entry.installmentNumber === selectedLoan.paidInstallments;
                      return (
                        <Table.Row
                          key={entry.installmentNumber}
                          id={String(entry.installmentNumber)}
                          className={tableStyles.row + (isPaid ? " [&_.table__cell]:bg-muted/50" : "")}
                        >
                          <Table.Cell className={tableStyles.cell + " font-medium"}>{entry.installmentNumber}</Table.Cell>
                          <Table.Cell className={tableStyles.cell}>{formatDate(entry.dueDate)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.principal, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.interest, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.transferFee, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right font-medium"}>{formatCurrency(entry.payment, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.balance, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-center"}>
                            {isPaid ? (
                              <Chip
                                size="sm"
                                variant="soft"
                                className={
                                  hadPenalty
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-success/10 text-success'
                                }
                              >
                                Pagado
                              </Chip>
                            ) : (
                              <Chip size="sm" variant="soft" className="bg-warning/10 text-warning">
                                Pendiente
                              </Chip>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
              </Table>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Modal nuevo préstamo */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        title="Nuevo Préstamo"
        submitText="Aprobar Préstamo"
        className="sm:max-w-6xl"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <Select
              fullWidth
              placeholder="Seleccionar socio..."
              selectedKey={formData.memberId || null}
              onSelectionChange={(key) => setFormData({ ...formData, memberId: String(key) })}
            >
              <Label>Socio <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {memberOptions.map(opt => (
                    <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label}>
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField fullWidth type="number">
              <Label>Monto <span className="text-destructive" aria-hidden="true">*</span></Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={formData.amount || ''}
                  onChange={(event) => setFormData({ ...formData, amount: parseFloat(event.target.value) || 0 })}
                  className="pl-9"
                />
              </div>
            </TextField>

            <Select
              fullWidth
              selectedKey={String(formData.monthlyInterestRate)}
              onSelectionChange={(key) => setFormData({ ...formData, monthlyInterestRate: parseFloat(String(key)) })}
            >
              <Label>Tasa de Interés Mensual</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="1" textValue="1%">1%<ListBox.ItemIndicator /></ListBox.Item>
                  <ListBox.Item id="2" textValue="2%">2%<ListBox.ItemIndicator /></ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField fullWidth type="number">
              <Label>Plazo (meses)</Label>
              <Input
                value={formData.termMonths || ''}
                onChange={(event) => setFormData({ ...formData, termMonths: parseInt(event.target.value) || 0 })}
              />
            </TextField>

            <DatePicker
              label="Fecha de inicio"
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
            />

            <TextField fullWidth>
              <Label>Notas</Label>
              <TextArea
                value={formData.notes}
                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              />
            </TextField>

            <Checkbox
              isSelected={formData.retentionPaid}
              onChange={(checked) => setFormData({ ...formData, retentionPaid: checked })}
              className="w-full rounded-[var(--radius)] border border-warning/30 bg-warning/10 p-3 transition-colors hover:bg-warning/15"
            >
              <Checkbox.Content className="flex items-center gap-3">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Confirmar pago de retención por suministros
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marque esta casilla si el socio ya pagó la retención de {formatCurrency(formData.amount * formData.monthlyInterestRate / 100, config.currencyCode)} ({formatPercentage(formData.monthlyInterestRate)} del monto del préstamo).
                  </p>
                </div>
              </Checkbox.Content>
            </Checkbox>
          </div>

          <aside className="min-w-0 rounded-[var(--radius)] border border-border bg-muted/35 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] bg-primary/10 text-primary">
                <Calculator className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Simulación del préstamo</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Los valores se actualizan al modificar el monto, tasa o plazo.</p>
              </div>
            </div>

            {simulatedLoan && formData.amount > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-[var(--radius)] border border-border bg-background p-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Retención</p>
                    <p className="font-semibold tabular-nums text-foreground">{formatCurrency(formData.amount * formData.monthlyInterestRate / 100, config.currencyCode)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cuota mensual</p>
                    <p className="font-semibold tabular-nums text-foreground">{formatCurrency(simulatedLoan.monthlyPayment, config.currencyCode)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interés total</p>
                    <p className="font-semibold tabular-nums text-foreground">{formatCurrency(simulatedLoan.totalInterest, config.currencyCode)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Transferencias</p>
                    <p className="font-semibold tabular-nums text-foreground">{formatCurrency(simulatedLoan.totalTransferFees, config.currencyCode)}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(config.transferFee, config.currencyCode)} / cuota</p>
                  </div>
                  <div className="col-span-2 border-t border-border pt-3">
                    <p className="text-muted-foreground">Total a pagar</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {formatCurrency(simulatedLoan.monthlyPayment * formData.termMonths, config.currencyCode)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium text-foreground">Cuotas proyectadas</h4>
                    <span className="text-xs text-muted-foreground">{formData.termMonths} meses</span>
                  </div>
                  <div className="max-h-72 overflow-auto rounded-[var(--radius)] border border-border bg-background">
                    <Table className={tableStyles.root}>
                      <Table.ScrollContainer className={tableStyles.scroll}>
                        <Table.Content aria-label="Tabla de amortización simulada">
                          <Table.Header className={tableStyles.header}>
                            <Table.Column id="installment" isRowHeader className={tableStyles.column}>#</Table.Column>
                            <Table.Column id="fecha" className={tableStyles.column}>Fecha</Table.Column>
                            <Table.Column id="capital" className={tableStyles.column + " text-right"}>Capital</Table.Column>
                            <Table.Column id="inter-s" className={tableStyles.column + " text-right"}>Interés</Table.Column>
                            <Table.Column id="transfer" className={tableStyles.column + " text-right"}>Transfer.</Table.Column>
                            <Table.Column id="cuota" className={tableStyles.column + " text-right"}>Cuota</Table.Column>
                            <Table.Column id="saldo" className={tableStyles.column + " text-right"}>Saldo</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {simulatedLoan.schedule.map((entry) => (
                              <Table.Row key={entry.installmentNumber} id={String(entry.installmentNumber)} className={tableStyles.row}>
                                <Table.Cell className={tableStyles.cell}>{entry.installmentNumber}</Table.Cell>
                                <Table.Cell className={tableStyles.cell}>{formatDate(entry.dueDate)}</Table.Cell>
                                <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.principal, config.currencyCode)}</Table.Cell>
                                <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.interest, config.currencyCode)}</Table.Cell>
                                <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.transferFee || 0, config.currencyCode)}</Table.Cell>
                                <Table.Cell className={tableStyles.cell + " text-right font-medium"}>{formatCurrency(entry.payment, config.currencyCode)}</Table.Cell>
                                <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.balance, config.currencyCode)}</Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-56 place-items-center rounded-[var(--radius)] border border-dashed border-border bg-background/60 p-6 text-center">
                <div>
                  <Calculator className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-foreground">Ingresa el monto del préstamo</p>
                  <p className="mt-1 text-xs text-muted-foreground">Aquí aparecerán el valor de las cuotas y el calendario de pagos.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </FormModal>

      {/* Modal de pago */}
      <FormModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSubmit={handlePayment}
        title="Registrar Pago"
        submitText={selectedLoan && Math.abs(selectedLoan.remainingPrincipal) <= 0.01 ? "Finalizar Préstamo" : "Confirmar Pago"}
      >
        {selectedLoan && (
          <div className="space-y-4">
            {/* Late payment warning */}
            {(() => {
              const today = new Date();
              const currentDay = today.getDate();
              const dueDay = config.loanPaymentDueDay ?? 18;
              return currentDay >= dueDay && selectedLoan.remainingPrincipal > 0.01 ? (
                <div className="p-4 rounded-[var(--radius)] border border-border bg-muted space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm font-medium text-destructive">
                      Pago tardío: Hoy es día {currentDay}. Día límite: {dueDay}.
                    </p>
                  </div>
                  <Checkbox
                    id="apply-penalty"
                    isSelected={appliedLatePaymentPenalty}
                    onChange={(checked) => setAppliedLatePaymentPenalty(checked)}
                    className="pl-6"
                  >
                    <Checkbox.Content className="flex items-center gap-2">
                      <Checkbox.Control className="h-4 w-4">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="text-sm text-foreground cursor-pointer font-normal">
                        Aplicar multa de {formatCurrency(config.penaltyAmount, config.currencyCode)}
                      </span>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              ) : null;
            })()}
            <div className="p-4 rounded-[var(--radius)] border border-border bg-muted">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo pendiente</span>
                <span className="font-bold text-foreground">{formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Cuota mensual</span>
                <span className="font-medium text-foreground">{formatCurrency(selectedLoan.monthlyPayment, config.currencyCode)}</span>
              </div>
            </div>
            {Math.abs(selectedLoan.remainingPrincipal) <= 0.01 ? (
              <div className="p-4 rounded-[var(--radius)] border border-success/30 bg-success/10 text-sm text-success">
                🎉 El préstamo está completamente pagado. Confirme para marcarlo como finalizado.
              </div>
            ) : selectedLoan.monthlyPayment > selectedLoan.remainingPrincipal ? (
              <div className="p-3 rounded-[var(--radius)] border border-warning/30 bg-warning/10 text-sm text-warning">
                La cuota mensual es mayor que el saldo pendiente. Se sugiere pagar {formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)} para cerrar el préstamo.
              </div>
            ) : null}
            {Math.abs(selectedLoan.remainingPrincipal) > 0.01 && (
              <div className="space-y-2">
                <TextField fullWidth type="number">
                <Label>Monto a pagar</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    step="0.01"
                    max={selectedLoan.remainingPrincipal}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Sugerido: ${formatCurrency(Math.min(selectedLoan.remainingPrincipal, selectedLoan.monthlyPayment), config.currencyCode)} (máx: ${formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)})`}
                    className="pl-9"
                  />
                </div>
                </TextField>
                {paymentAmount && (() => {
                  const baseAmount = parseFloat(paymentAmount) || 0;
                  const penaltyAmount = appliedLatePaymentPenalty ? (config.penaltyAmount ?? 5) : 0;
                  const totalAmount = baseAmount + penaltyAmount;
                  return penaltyAmount > 0 ? (
                    <div className="mt-2 p-3 rounded-[var(--radius)] border border-border bg-muted text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Capital a pagar:</span>
                        <span>{formatCurrency(baseAmount, config.currencyCode)}</span>
                      </div>
                      <div className="flex justify-between text-warning font-medium mt-1">
                        <span>+ Multa:</span>
                        <span>{formatCurrency(penaltyAmount, config.currencyCode)}</span>
                      </div>
                      <div className="border-t border-border mt-1 pt-1 flex justify-between font-bold text-foreground">
                        <span>Total a pagar a Caja:</span>
                        <span>{formatCurrency(totalAmount, config.currencyCode)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {Math.abs(selectedLoan.remainingPrincipal) <= 0.01 && (
              <div className="p-3 rounded-[var(--radius)] border border-border bg-muted text-sm text-muted-foreground">
                El préstamo ya está pagado. Haga clic en "Finalizar Préstamo" para completar el proceso.
              </div>
            )}
            {Math.abs(selectedLoan.remainingPrincipal) > 0.01 && (
              <div className="p-3 rounded-[var(--radius)] border border-border bg-muted text-sm text-muted-foreground">
                El pago se aplicará directamente al capital pendiente. Máximo: <strong>{formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}</strong>
              </div>
            )}
          </div>
        )}
      </FormModal>

      {/* Modal refinanciamiento */}
      <RefinanceModal
        isOpen={showRefinance}
        onClose={() => setShowRefinance(false)}
        onConfirm={handleRefinanceSubmit}
        loan={selectedLoan}
      />

      {/* Delete Confirmation Modal */}
      <AlertDialog isOpen={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container className="sm:max-w-106.25">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Confirmar eliminación</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <AlertDialog.Icon status="danger">
                    <AlertTriangle className="w-6 h-6" />
                  </AlertDialog.Icon>
                  <div>
                    <p className="text-foreground font-medium">¿Estás seguro de eliminar este préstamo?</p>
                    <p className="text-sm text-muted-foreground">Esta acción es irreversible y afectará los saldos contables.</p>
                  </div>
                </div>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="outline" onPress={() => setIsDeleteModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="danger" onPress={handleConfirmDelete}>
                  Eliminar
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      {/* Modal de confirmación de anulación de pago */}
      <AlertDialog isOpen={isAnnulModalOpen} onOpenChange={(open) => { if (!open) { setIsAnnulModalOpen(false); setLoanToAnnul(null); } }}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container className="sm:max-w-106.25">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Anular último pago</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="space-y-4 py-4">
                <div className="p-4 rounded-[var(--radius)] border border-border bg-muted">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">¿Anular el último pago?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        El préstamo volverá al estado anterior y la caja se ajustará automáticamente.
                      </p>
                    </div>
                  </div>
                </div>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="outline" onPress={() => { setIsAnnulModalOpen(false); setLoanToAnnul(null); }}>
                  Cancelar
                </Button>
                <Button variant="danger" onPress={handleConfirmAnnul}>
                  Confirmar Anulación
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}

export default Loans;
