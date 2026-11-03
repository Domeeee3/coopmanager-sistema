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
import { RowActionsMenu } from '@/shared/components/RowActionsMenu';
import { formatCurrency, formatDate, formatPercentage } from '@/core/lib/formatters';
import { canEditLoanTerms, getLoanSchedule, getOpenLoans, getOutstandingBalance, isInstallmentPaid, isLoanOpen, loanHasPayments } from '@/core/lib/loans';
import { AmortizationEntry, Loan, LoanFormData, Member } from '@/core/types';
import { calculateFrenchAmortization } from '@/core/hooks/useFinance';
import {
  Plus, CreditCard, DollarSign, Calendar as CalendarIcon,
  RefreshCw, TrendingUp, Calculator, ArrowLeft, Trash2, AlertTriangle, MessageSquare, Pencil, Ban
} from 'lucide-react';
import { RefinanceModal } from './components/RefinanceModal';

type ViewMode = 'members' | 'member-loans' | 'loan-detail';
type LoanFilter = "all" | "active" | "pending_retention" | "paid";

interface MemberLoanSummary {
  member: Member;
  totalLoans: number;
  activeLoans: number;
  pendingRetentionLoans: number;
  retentionChargedLoans: number;
  paidLoans: number;
  totalLoaned: number;
  totalDebt: number;
}

interface PaymentTarget {
  installmentNumber: number;
  mode: 'create' | 'edit';
}

const todayISO = () => new Date().toISOString().split('T')[0];

const loanStatusStyles: Record<Loan['status'], { label: string; className: string }> = {
  pending_retention: { label: "Retención pendiente", className: "bg-warning/10 text-warning" },
  active: { label: "Activo", className: "bg-primary/10 text-primary" },
  paid: { label: "Pagado", className: "bg-success/10 text-success" },
  refinanced: { label: "Refinanciado", className: "bg-secondary/10 text-secondary" },
  defaulted: { label: "En mora", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

function getRetentionBadge(loan: Loan) {
  if (loan.status === 'pending_retention') return { label: "Pendiente", className: "bg-warning/10 text-warning" };
  if (loan.retentionPaid && loan.retentionAmount > 0) return { label: "Cobrada", className: "bg-success/10 text-success" };
  return { label: "No cobrada", className: "bg-muted text-muted-foreground" };
}

export function Loans() {
  const {
    loans,
    members,
    config,
    transactions,
    addLoan,
    editLoan,
    payRetention,
    waiveRetention,
    payLoanInstallment,
    updateLoanPayment,
    deleteLoanPayment,
    refinanceLoan,
    deleteLoan,
    showToast,
  } = useApp();

  const [viewMode, setViewMode] = useState<ViewMode>('members');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [loanFilter, setLoanFilter] = useState<LoanFilter>("all");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [showRefinance, setShowRefinance] = useState(false);

  // Payment modal states
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [applyPenalty, setApplyPenalty] = useState(false);

  // Delete modal states
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  const createEmptyForm = (memberId = ''): LoanFormData => ({
    memberId,
    amount: 0,
    monthlyInterestRate: config.monthlyInterestRate,
    termMonths: 12,
    startDate: todayISO(),
    notes: '',
    transferFee: config.transferFee,
    chargeRetention: false,
  });

  const [formData, setFormData] = useState<LoanFormData>(() => createEmptyForm());

  const formTransferFee = formData.transferFee ?? config.transferFee;
  const formRetentionAmount = formData.amount * (Number(config.retentionRate) || 0) / 100;

  // Simular préstamo
  const simulatedLoan = useMemo(() => {
    if (!(formData.amount > 0 && formData.termMonths > 0)) return null;
    return calculateFrenchAmortization(
      formData.amount,
      formData.monthlyInterestRate,
      formData.termMonths,
      formData.startDate,
      formTransferFee,
    );
  }, [formData.amount, formData.monthlyInterestRate, formData.termMonths, formData.startDate, formTransferFee]);

  // Resumen de préstamos por socio para la vista principal
  const memberLoanSummaries = useMemo<MemberLoanSummary[]>(() => {
    return members
      .filter((member) => member.status === "active")
      .map((member) => {
        const memberLoans = loans.filter((loan) => loan.memberId === member.id);
        if (memberLoans.length === 0) return null;

        const openLoans = memberLoans.filter(isLoanOpen);

        return {
          member,
          totalLoans: memberLoans.length,
          activeLoans: openLoans.length,
          pendingRetentionLoans: memberLoans.filter((loan) => loan.status === "pending_retention").length,
          retentionChargedLoans: memberLoans.filter((loan) => loan.retentionPaid && loan.retentionAmount > 0).length,
          paidLoans: memberLoans.filter((loan) => loan.status === "paid").length,
          totalLoaned: memberLoans.reduce((sum, loan) => sum + loan.amount, 0),
          totalDebt: getOutstandingBalance(memberLoans),
        };
      })
      .filter((summary): summary is MemberLoanSummary => summary !== null);
  }, [members, loans]);

  const loanFilterOptions = useMemo<Array<{ value: LoanFilter; label: string; count: number }>>(() => [
    { value: "all", label: "Todos", count: memberLoanSummaries.length },
    { value: "active", label: "Con préstamos activos", count: memberLoanSummaries.filter((summary) => summary.activeLoans > 0).length },
    { value: "pending_retention", label: "Retención pendiente", count: memberLoanSummaries.filter((summary) => summary.pendingRetentionLoans > 0).length },
    { value: "paid", label: "Préstamos pagados", count: memberLoanSummaries.filter((summary) => summary.activeLoans === 0 && summary.paidLoans > 0).length },
  ], [memberLoanSummaries]);

  const filteredMemberLoanSummaries = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();

    return memberLoanSummaries.filter((summary) => {
      const matchesSearch = !query || summary.member.name.toLowerCase().includes(query) || summary.member.phone.includes(query);
      const matchesFilter = loanFilter === "all"
        || (loanFilter === "active" && summary.activeLoans > 0)
        || (loanFilter === "pending_retention" && summary.pendingRetentionLoans > 0)
        || (loanFilter === "paid" && summary.activeLoans === 0 && summary.paidLoans > 0);

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
  const activeLoans = useMemo(() => memberLoans.filter(isLoanOpen), [memberLoans]);
  const closedLoans = useMemo(() => memberLoans.filter(loan => !isLoanOpen(loan)), [memberLoans]);

  // Mantener sincronizado el préstamo seleccionado con el store
  React.useEffect(() => {
    if (selectedLoan) {
      const updatedLoan = loans.find(l => l.id === selectedLoan.id);
      if (updatedLoan) {
        setSelectedLoan(updatedLoan);
      } else {
        setSelectedLoan(null);
        setViewMode(selectedMember ? 'member-loans' : 'members');
      }
    }
  }, [loans]);

  // Tabla de pagos guardada del préstamo (con el estado de cada cuota)
  const loanSchedule = useMemo(() => (selectedLoan ? getLoanSchedule(selectedLoan) : []), [selectedLoan]);
  const nextPendingInstallment = loanSchedule.find(entry => !isInstallmentPaid(entry));
  const scheduleTotals = useMemo(() => loanSchedule.reduce(
    (totals, entry) => ({
      principal: totals.principal + entry.principal,
      interest: totals.interest + entry.interest,
      transferFee: totals.transferFee + (entry.transferFee || 0),
      payment: totals.payment + entry.payment,
    }),
    { principal: 0, interest: 0, transferFee: 0, payment: 0 },
  ), [loanSchedule]);

  const paymentEntry: AmortizationEntry | undefined = paymentTarget
    ? loanSchedule.find(entry => entry.installmentNumber === paymentTarget.installmentNumber)
    : undefined;
  const penaltyValue = Number(config.penaltyAmount ?? 5) || 0;

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
    setEditingLoan(null);
    setFormData(createEmptyForm(member?.id));
    setShowForm(true);
  };

  const handleOpenEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      memberId: loan.memberId,
      amount: loan.amount,
      monthlyInterestRate: loan.monthlyInterestRate,
      termMonths: loan.termMonths,
      startDate: loan.startDate,
      notes: loan.notes || '',
      transferFee: loan.transferFee,
      chargeRetention: loan.retentionPaid && loan.retentionAmount > 0,
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLoan(null);
  };

  const editingLocked = editingLoan ? !canEditLoanTerms(editingLoan, transactions) : false;

  const handleSubmit = () => {
    if (editingLoan && editingLocked) {
      editLoan(editingLoan.id, formData);
      handleCloseForm();
      return;
    }
    if (!formData.memberId || !(formData.amount > 0) || !(formData.termMonths >= 1)) {
      showToast('error', 'Error de validación', 'Complete socio, monto y plazo.');
      return;
    }
    if (!(formTransferFee >= 0)) {
      showToast('error', 'Error de validación', 'El costo de transferencia no puede ser negativo.');
      return;
    }

    if (editingLoan) {
      editLoan(editingLoan.id, formData);
    } else {
      addLoan(formData);
    }
    handleCloseForm();
  };

  const isLatePaymentDay = () => new Date().getDate() >= (config.loanPaymentDueDay ?? 18);

  const handleOpenPayment = (installmentNumber: number) => {
    setPaymentTarget({ installmentNumber, mode: 'create' });
    setPaymentDate(todayISO());
    setApplyPenalty(isLatePaymentDay());
  };

  const handleOpenEditPayment = (entry: AmortizationEntry) => {
    setPaymentTarget({ installmentNumber: entry.installmentNumber, mode: 'edit' });
    setPaymentDate(entry.paidDate || todayISO());
    setApplyPenalty((entry.penaltyAmount ?? 0) > 0);
  };

  const handleClosePayment = () => setPaymentTarget(null);

  const handlePaymentSubmit = () => {
    if (!selectedLoan || !paymentTarget) return;
    if (!paymentDate) {
      showToast('error', 'Fecha requerida', 'Seleccione la fecha del pago.');
      return;
    }
    const penaltyAmount = applyPenalty ? (paymentTarget.mode === 'edit' && paymentEntry?.penaltyAmount ? paymentEntry.penaltyAmount : penaltyValue) : 0;
    const payment = { paidDate: paymentDate, penaltyAmount };
    if (paymentTarget.mode === 'edit') {
      updateLoanPayment(selectedLoan.id, paymentTarget.installmentNumber, payment);
    } else {
      payLoanInstallment(selectedLoan.id, paymentTarget.installmentNumber, payment);
    }
    setPaymentTarget(null);
  };

  const handleConfirmDeletePayment = () => {
    if (selectedLoan && paymentToDelete !== null) {
      deleteLoanPayment(selectedLoan.id, paymentToDelete);
    }
    setPaymentToDelete(null);
  };

  const handleRefinanceSubmit = (newTermMonths: number) => {
    if (selectedLoan) {
      refinanceLoan(selectedLoan.id, newTermMonths);
      setShowRefinance(false);
      setViewMode('member-loans');
    }
  };

  const handleConfirmDelete = () => {
    if (loanToDelete) {
      deleteLoan(loanToDelete.id);
      setLoanToDelete(null);
    }
  };

  const memberOptions = members
    .filter(m => m.status === 'active' || m.id === formData.memberId)
    .map(m => ({ value: m.id, label: m.name }));

  const interestRateOptions = Array.from(new Set([1, 2, formData.monthlyInterestRate].filter((rate) => rate > 0))).sort((a, b) => a - b);

  // Stats
  const stats = useMemo(() => ({
    totalActive: getOpenLoans(loans).length,
    totalLoaned: loans.reduce((sum, l) => sum + l.amount, 0),
    totalInterest: loans.reduce((sum, l) => sum + l.totalInterest, 0),
    totalPending: getOutstandingBalance(loans),
  }), [loans]);

  const loanColumns: Column<Loan>[] = [
    {
      key: "status",
      header: "Estado",
      render: (loan) => {
        const status = loanStatusStyles[loan.status];
        const hasPayments = loanHasPayments(loan, transactions);

        return (
          <div className="flex items-center gap-2">
            <Chip size="sm" variant="soft" className={status.className}>{status.label}</Chip>
            <RowActionsMenu
              label={`Acciones del préstamo de ${loan.memberName}`}
              actions={[
                { id: "edit", label: "Editar", icon: Pencil, onAction: () => handleOpenEdit(loan) },
                {
                  id: "delete",
                  label: hasPayments ? "Eliminar (tiene pagos)" : "Eliminar",
                  icon: Trash2,
                  tone: "danger",
                  isDisabled: hasPayments,
                  onAction: () => setLoanToDelete(loan),
                },
              ]}
            />
          </div>
        );
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
        <span className={loan.remainingPrincipal > 0.005 ? "font-medium text-destructive" : "font-medium text-success"}>
          {formatCurrency(loan.remainingPrincipal, config.currencyCode)}
        </span>
      ),
    },
    {
      key: "retention",
      header: "Retención",
      align: "center",
      render: (loan) => {
        const badge = getRetentionBadge(loan);
        return <Chip size="sm" variant="soft" className={badge.className}>{badge.label}</Chip>;
      },
    },
    {
      key: "termMonths",
      header: "Plazo",
      align: "center",
      render: (loan) => `${loan.paidInstallments}/${loan.termMonths} cuotas`,
    },
    {
      key: "startDate",
      header: "Inicio",
      render: (loan) => formatDate(loan.startDate),
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
      key: "retention",
      header: "Retención",
      width: "14%",
      align: "center",
      render: ({ pendingRetentionLoans, retentionChargedLoans }) => {
        if (pendingRetentionLoans > 0) return <Chip size="sm" variant="soft" className="bg-warning/10 text-warning">Pendiente ({pendingRetentionLoans})</Chip>;
        if (retentionChargedLoans > 0) return <Chip size="sm" variant="soft" className="bg-success/10 text-success">Cobrada ({retentionChargedLoans})</Chip>;
        return <Chip size="sm" variant="soft" className="bg-muted text-muted-foreground">No cobrada</Chip>;
      },
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
      render: ({ totalLoans, activeLoans, pendingRetentionLoans }) => {
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

              {closedLoans.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">Pagados y cerrados</h3>
                  <DataTable
                    data={closedLoans}
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
      {viewMode === 'loan-detail' && selectedLoan && (
        <div className="space-y-6">
          {/* Alerta de retención pendiente (préstamos creados antes de que fuera opcional) */}
          {selectedLoan.status === 'pending_retention' && (
            <div className="bg-warning/10 border border-warning/30 rounded-[var(--radius)] p-4">
              <div className="flex items-start gap-4">
                <Calculator className="w-5 h-5 text-warning shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-warning mb-1">
                    Retención por suministros pendiente
                  </h3>
                  <p className="text-sm text-warning mb-3">
                    La retención es opcional. Puede cobrar {formatCurrency(selectedLoan.retentionAmount, config.currencyCode)} o dejar el préstamo sin retención.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="sm" onPress={() => payRetention(selectedLoan.id)}>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Cobrar retención
                    </Button>
                    <Button variant="secondary" size="sm" onPress={() => waiveRetention(selectedLoan.id)}>
                      <Ban className="w-4 h-4 mr-2" />
                      No cobrar retención
                    </Button>
                  </div>
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
                  <p className="text-sm text-muted-foreground">Cuota mensual</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedLoan.monthlyPayment, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total a cobrar</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedLoan.totalAmount, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo pendiente</p>
                  <p className={"text-xl font-bold " + (selectedLoan.remainingPrincipal > 0.005 ? "text-destructive" : "text-success")}>
                    {formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tasa mensual</p>
                  <p className="font-semibold text-foreground">{formatPercentage(selectedLoan.monthlyInterestRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interés total</p>
                  <p className="font-semibold text-foreground">{formatCurrency(selectedLoan.totalInterest, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transferencia</p>
                  <p className="font-semibold text-foreground">{formatCurrency(scheduleTotals.transferFee, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Retención</p>
                  {(() => {
                    const badge = getRetentionBadge(selectedLoan);
                    return (
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="soft" className={badge.className}>{badge.label}</Chip>
                        {selectedLoan.retentionAmount > 0 && (
                          <span className="text-sm text-muted-foreground">{formatCurrency(selectedLoan.retentionAmount, config.currencyCode)}</span>
                        )}
                      </div>
                    );
                  })()}
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
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
                <Button
                  onPress={() => nextPendingInstallment && handleOpenPayment(nextPendingInstallment.installmentNumber)}
                  isDisabled={!nextPendingInstallment || !isLoanOpen(selectedLoan)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  {nextPendingInstallment ? `Registrar pago (cuota ${nextPendingInstallment.installmentNumber})` : 'Préstamo pagado'}
                </Button>
                {selectedLoan.status === 'active' && (
                  <Button variant="secondary" onPress={() => setShowRefinance(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refinanciar
                  </Button>
                )}
                <Button variant="secondary" onPress={() => handleOpenEdit(selectedLoan)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
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
                      <Table.Column id="fecha" className={tableStyles.column}>Vence</Table.Column>
                      <Table.Column id="capital" className={tableStyles.column + " text-right"}>Capital</Table.Column>
                      <Table.Column id="inter-s" className={tableStyles.column + " text-right"}>Interés</Table.Column>
                      <Table.Column id="transfer" className={tableStyles.column + " text-right"}>Transfer.</Table.Column>
                      <Table.Column id="total-cuota" className={tableStyles.column + " text-right"}>Total Cuota</Table.Column>
                      <Table.Column id="saldo" className={tableStyles.column + " text-right"}>Saldo</Table.Column>
                      <Table.Column id="estado" className={tableStyles.column + " text-center"}>Estado</Table.Column>
                      <Table.Column id="acciones" className={tableStyles.column + " text-center"}>Acciones</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {[
                        ...loanSchedule.map((entry) => {
                          const isPaid = isInstallmentPaid(entry);
                          return (
                            <Table.Row
                              key={entry.installmentNumber}
                              id={String(entry.installmentNumber)}
                              className={tableStyles.row + (isPaid ? " [&>td]:!bg-success/10 even:[&>td]:!bg-success/10" : "")}
                            >
                              <Table.Cell className={tableStyles.cell + " font-medium"}>{entry.installmentNumber}</Table.Cell>
                              <Table.Cell className={tableStyles.cell}>{formatDate(entry.dueDate)}</Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.principal, config.currencyCode)}</Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.interest, config.currencyCode)}</Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.transferFee || 0, config.currencyCode)}</Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-right font-medium"}>{formatCurrency(entry.payment, config.currencyCode)}</Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(entry.balance, config.currencyCode)}</Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-center"}>
                                {isPaid ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <Chip size="sm" variant="soft" className="bg-success/15 text-success">Pagado</Chip>
                                    {(entry.paidDate || (entry.penaltyAmount ?? 0) > 0) && (
                                      <span className="text-xs text-muted-foreground">
                                        {entry.paidDate ? formatDate(entry.paidDate) : ''}
                                        {(entry.penaltyAmount ?? 0) > 0 ? ` · multa ${formatCurrency(entry.penaltyAmount ?? 0, config.currencyCode)}` : ''}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Chip size="sm" variant="soft" className="bg-warning/10 text-warning">Pendiente</Chip>
                                )}
                              </Table.Cell>
                              <Table.Cell className={tableStyles.cell + " text-center"}>
                                <div className="flex items-center justify-center gap-1">
                                  {isPaid ? (
                                    <>
                                      <TableActionButton
                                        label={`Editar pago de la cuota ${entry.installmentNumber}`}
                                        icon={Pencil}
                                        onPress={() => handleOpenEditPayment(entry)}
                                      />
                                      <TableActionButton
                                        label={`Eliminar pago de la cuota ${entry.installmentNumber}`}
                                        icon={Trash2}
                                        tone="danger"
                                        onPress={() => setPaymentToDelete(entry.installmentNumber)}
                                      />
                                    </>
                                  ) : isLoanOpen(selectedLoan) ? (
                                    <TableActionButton
                                      label={`Registrar pago de la cuota ${entry.installmentNumber}`}
                                      icon={DollarSign}
                                      onPress={() => handleOpenPayment(entry.installmentNumber)}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              </Table.Cell>
                            </Table.Row>
                          );
                        }),
                        <Table.Row key="totals" id="totals" className={tableStyles.row + " font-semibold [&>td]:!bg-muted even:[&>td]:!bg-muted"}>
                          <Table.Cell className={tableStyles.cell}>Total</Table.Cell>
                          <Table.Cell className={tableStyles.cell}>{''}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(scheduleTotals.principal, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(scheduleTotals.interest, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(scheduleTotals.transferFee, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell + " text-right"}>{formatCurrency(scheduleTotals.payment, config.currencyCode)}</Table.Cell>
                          <Table.Cell className={tableStyles.cell}>{''}</Table.Cell>
                          <Table.Cell className={tableStyles.cell}>{''}</Table.Cell>
                          <Table.Cell className={tableStyles.cell}>{''}</Table.Cell>
                        </Table.Row>,
                      ]}
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
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        title={editingLoan ? "Editar Préstamo" : "Nuevo Préstamo"}
        submitText={editingLoan ? (editingLocked ? "Guardar notas" : "Guardar cambios") : "Aprobar Préstamo"}
        className="sm:max-w-6xl"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            {editingLocked && (
              <div className="flex items-start gap-3 rounded-[var(--radius)] border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>{editingLoan && loanHasPayments(editingLoan, transactions)
                  ? 'Este préstamo tiene pagos registrados: sólo se pueden corregir las notas. Elimine los pagos para modificar los montos.'
                  : 'Este préstamo está cerrado: sólo se pueden corregir las notas.'}</p>
              </div>
            )}
            <Select
              fullWidth
              isDisabled={editingLocked}
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

            <TextField fullWidth type="number" isDisabled={editingLocked}>
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
              isDisabled={editingLocked}
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
                  {interestRateOptions.map((rate) => (
                    <ListBox.Item key={rate} id={String(rate)} textValue={`${rate}%`}>{rate}%<ListBox.ItemIndicator /></ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField fullWidth type="number" isDisabled={editingLocked}>
              <Label>Plazo (meses)</Label>
              <Input
                value={formData.termMonths || ''}
                onChange={(event) => setFormData({ ...formData, termMonths: parseInt(event.target.value) || 0 })}
              />
            </TextField>

            <TextField fullWidth type="number" isDisabled={editingLocked}>
              <Label>Costo de transferencia</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  step="0.01"
                  min={0}
                  value={formData.transferFee ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFormData({ ...formData, transferFee: value === '' ? 0 : Math.max(0, parseFloat(value) || 0) });
                  }}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Varía según el banco de destino. Se divide entre las {formData.termMonths || 0} cuotas.
              </p>
            </TextField>

            <DatePicker
              label="Fecha de inicio"
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
              isDisabled={editingLocked}
            />

            <TextField fullWidth>
              <Label>Notas</Label>
              <TextArea
                value={formData.notes}
                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
              />
            </TextField>

            <Checkbox
              isSelected={formData.chargeRetention === true}
              isDisabled={editingLocked}
              onChange={(checked) => setFormData({ ...formData, chargeRetention: checked })}
              className="w-full rounded-[var(--radius)] border border-border bg-muted/35 p-3 transition-colors hover:bg-muted/60"
            >
              <Checkbox.Content className="flex items-center gap-3">
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Cobrar retención por suministros (opcional)
                  </span>
                  {editingLoan?.status === 'pending_retention' && !editingLocked && (
                    <p className="mt-1 text-xs text-warning">Este préstamo tiene la retención pendiente: si guarda sin marcar la casilla, la retención no se cobrará.</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.chargeRetention
                      ? `Se cobrará ${formatCurrency(formRetentionAmount, config.currencyCode)} (${formatPercentage(config.retentionRate)} del monto) al aprobar el préstamo.`
                      : `No se cobra retención. Márquela para cobrar ${formatCurrency(formRetentionAmount, config.currencyCode)} (${formatPercentage(config.retentionRate)} del monto).`}
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
                    <p className="font-semibold tabular-nums text-foreground">
                      {formData.chargeRetention ? formatCurrency(formRetentionAmount, config.currencyCode) : 'No se cobra'}
                    </p>
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
                    <p className="text-xs text-muted-foreground">Fraccionada en {formData.termMonths} cuota(s)</p>
                  </div>
                  <div className="col-span-2 border-t border-border pt-3">
                    <p className="text-muted-foreground">Total a cobrar (capital + interés + transferencia)</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {formatCurrency(simulatedLoan.totalAmount, config.currencyCode)}
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
        isOpen={paymentTarget !== null}
        onClose={handleClosePayment}
        onSubmit={handlePaymentSubmit}
        title={paymentTarget?.mode === 'edit' ? `Editar pago - Cuota ${paymentTarget.installmentNumber}` : `Registrar pago - Cuota ${paymentTarget?.installmentNumber ?? ''}`}
        submitText={paymentTarget?.mode === 'edit' ? "Guardar cambios" : "Confirmar pago"}
      >
        {selectedLoan && paymentEntry && paymentTarget && (() => {
          const currentPenalty = paymentTarget.mode === 'edit' && paymentEntry.penaltyAmount ? paymentEntry.penaltyAmount : penaltyValue;
          const penalty = applyPenalty ? currentPenalty : 0;
          const balanceAfter = paymentTarget.mode === 'edit'
            ? selectedLoan.remainingPrincipal
            : Math.max(0, selectedLoan.remainingPrincipal - paymentEntry.payment);
          const paymentDay = paymentDate ? Number(paymentDate.split('-')[2]) : new Date().getDate();
          const dueDay = config.loanPaymentDueDay ?? 18;

          return (
            <div className="space-y-4">
              <div className="space-y-2 rounded-[var(--radius)] border border-border bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital</span>
                  <span className="tabular-nums text-foreground">{formatCurrency(paymentEntry.principal, config.currencyCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interés</span>
                  <span className="tabular-nums text-foreground">{formatCurrency(paymentEntry.interest, config.currencyCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transferencia</span>
                  <span className="tabular-nums text-foreground">{formatCurrency(paymentEntry.transferFee || 0, config.currencyCode)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span className="text-foreground">Cuota</span>
                  <span className="tabular-nums text-foreground">{formatCurrency(paymentEntry.payment, config.currencyCode)}</span>
                </div>
              </div>

              <DatePicker
                label="Fecha de pago"
                value={paymentDate}
                onChange={setPaymentDate}
              />

              <div className="space-y-2 rounded-[var(--radius)] border border-border bg-muted p-4">
                {paymentDay >= dueDay && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm font-medium text-destructive">
                      Pago tardío: día {paymentDay}. Día límite: {dueDay}.
                    </p>
                  </div>
                )}
                <Checkbox
                  id="apply-penalty"
                  isSelected={applyPenalty}
                  onChange={setApplyPenalty}
                >
                  <Checkbox.Content className="flex items-center gap-2">
                    <Checkbox.Control className="h-4 w-4">
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <span className="text-sm text-foreground cursor-pointer font-normal">
                      Aplicar multa de {formatCurrency(currentPenalty, config.currencyCode)}
                    </span>
                  </Checkbox.Content>
                </Checkbox>
              </div>

              <div className="space-y-1 rounded-[var(--radius)] border border-border bg-muted p-4 text-sm">
                <div className="flex justify-between font-bold text-foreground">
                  <span>Ingreso a caja</span>
                  <span className="tabular-nums">{formatCurrency(paymentEntry.payment + penalty, config.currencyCode)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Saldo pendiente {paymentTarget.mode === 'edit' ? 'actual' : 'después del pago'}</span>
                  <span className="tabular-nums">{formatCurrency(balanceAfter, config.currencyCode)}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </FormModal>

      {/* Modal refinanciamiento */}
      <RefinanceModal
        isOpen={showRefinance}
        onClose={() => setShowRefinance(false)}
        onConfirm={handleRefinanceSubmit}
        loan={selectedLoan}
      />

      {/* Confirmación de eliminación de préstamo */}
      <AlertDialog isOpen={loanToDelete !== null} onOpenChange={(open) => { if (!open) setLoanToDelete(null); }}>
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
                    <p className="text-foreground font-medium">¿Eliminar el préstamo de {loanToDelete?.memberName}?</p>
                    <p className="text-sm text-muted-foreground">
                      Se anulará el desembolso de {formatCurrency(loanToDelete?.amount ?? 0, config.currencyCode)}
                      {loanToDelete?.retentionPaid && loanToDelete.retentionAmount > 0 ? ` y la retención de ${formatCurrency(loanToDelete.retentionAmount, config.currencyCode)}` : ''}, y la caja volverá a su valor anterior. Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="outline" onPress={() => setLoanToDelete(null)}>
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

      {/* Confirmación de eliminación de pago */}
      <AlertDialog isOpen={paymentToDelete !== null} onOpenChange={(open) => { if (!open) setPaymentToDelete(null); }}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container className="sm:max-w-106.25">
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Eliminar pago</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <AlertDialog.Icon status="danger">
                    <AlertTriangle className="w-6 h-6" />
                  </AlertDialog.Icon>
                  <div>
                    <p className="font-medium text-foreground">¿Eliminar el pago de la cuota {paymentToDelete}?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      El monto se retirará de la caja, la cuota volverá a Pendiente y el saldo pendiente aumentará.
                    </p>
                  </div>
                </div>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="outline" onPress={() => setPaymentToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onPress={handleConfirmDeletePayment}>
                  Eliminar pago
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
