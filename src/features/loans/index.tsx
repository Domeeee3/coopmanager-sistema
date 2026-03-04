import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { FormModal } from '@/shared/components/custom-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/shared/ui/dialog';
import { StatusBadge } from '@/shared/components/status-badge';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { Checkbox } from '@/shared/ui/checkbox';
import { formatCurrency, formatDate, formatPercentage } from '@/core/lib/formatters';
import { Loan, LoanFormData, Member } from '@/core/types';
import { calculateFrenchAmortization } from '@/core/hooks/useFinance';
import {
  Plus, CreditCard, DollarSign, Calendar as CalendarIcon,
  RefreshCw, Eye, TrendingUp, Calculator, ChevronRight, ArrowLeft, User, Trash2, AlertTriangle, MessageSquare, Undo2
} from 'lucide-react';
import { DatePicker } from '@/shared/ui/date-picker';
import { LoanCard } from './components/LoanCard';
import { RefinanceModal } from './components/RefinanceModal';

type ViewMode = 'members' | 'member-loans' | 'loan-detail';

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

  // Préstamos agrupados por socio
  const memberLoansData = useMemo(() => {
    const activeMembers = members.filter(m => m.status === 'active');
    return activeMembers.map(member => {
      const memberLoans = loans.filter(l => l.memberId === member.id);
      const activeLoans = memberLoans.filter(l => l.status === 'active');
      const totalDebt = activeLoans.reduce((sum, l) => sum + l.remainingPrincipal, 0);
      return {
        member,
        totalLoans: memberLoans.length,
        activeLoans: activeLoans.length,
        totalDebt,
        loans: memberLoans.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
      };
    }).filter(m => m.totalLoans > 0 || true); // Show all active members
  }, [members, loans]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {viewMode !== 'members' && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-foreground" />
              <h1 className="text-2xl font-bold text-foreground">
                {viewMode === 'members'
                  ? 'Préstamos'
                  : viewMode === 'member-loans'
                  ? selectedMember?.name
                  : viewMode === 'loan-detail'
                  ? `Préstamo #${selectedLoan?.id.slice(0, 8)}`
                  : ''}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {viewMode === 'members'
                ? 'Seleccione un socio para ver sus préstamos'
                : viewMode === 'member-loans'
                ? `${memberLoans.length} préstamo(s) registrado(s)`
                : viewMode === 'loan-detail'
                ? `Iniciado el ${formatDate(selectedLoan?.startDate || '')}`
                : ''}
            </p>
          </div>
        </div>

        {viewMode === 'members' && (
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Préstamo
          </Button>
        )}
        {viewMode === 'member-loans' && selectedMember && (
          <Button onClick={() => handleOpenForm(selectedMember)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Préstamo
          </Button>
        )}
      </div>

      {/* Vista: Lista de Socios */}
      {viewMode === 'members' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100">
                    <CreditCard className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activos</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalActive}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100">
                    <DollarSign className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Prestado</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalLoaned, config.currencyCode)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100">
                    <TrendingUp className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interés Total</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalInterest, config.currencyCode)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100">
                    <CalendarIcon className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Por Cobrar</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalPending, config.currencyCode)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de socios */}
          <Card>
            <div className="divide-y divide-border">
              {memberLoansData.map(({ member, totalLoans, activeLoans, totalDebt }) => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {activeLoans > 0 ? (
                          <span className="text-foreground">{activeLoans} préstamo(s) activo(s)</span>
                        ) : totalLoans > 0 ? (
                          <span className="text-foreground">{totalLoans} préstamo(s) pagado(s)</span>
                        ) : (
                          <span>Sin préstamos</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {totalDebt > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Saldo pendiente</p>
                        <p className="font-bold text-destructive">{formatCurrency(totalDebt, config.currencyCode)}</p>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {memberLoansData.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No hay socios registrados
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Vista: Préstamos del Socio */}
      {viewMode === 'member-loans' && selectedMember && (
        <div className="space-y-6">
          {memberLoans.length === 0 ? (
            <Card className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Este socio no tiene préstamos registrados</p>
              <Button className="mt-4" onClick={() => handleOpenForm(selectedMember)}>
                Crear Primer Préstamo
              </Button>
            </Card>
          ) : (
            <>
              {/* Préstamos Activos */}
              {activeLoans.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Activos</h3>
                  <div className="space-y-2">
                    {activeLoans.map(loan => (
                      <LoanCard key={loan.id} loan={loan} onSelect={handleSelectLoan} onDelete={handleDeleteLoan} transactions={transactions} />
                    ))}
                  </div>
                </div>
              )}

              {/* Préstamos Pagados */}
              {paidLoans.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Pagados</h3>
                  <div className="space-y-2">
                    {paidLoans.map(loan => (
                      <LoanCard key={loan.id} loan={loan} onSelect={handleSelectLoan} onDelete={handleDeleteLoan} transactions={transactions} />
                    ))}
                  </div>
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
            <div className="bg-yellow-50 border-2 border-yellow-600 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-yellow-100">
                  <Calculator className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 mb-1">
                    Retención por Suministros Pendiente
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    Se debe cobrar {formatCurrency(selectedLoan.retentionAmount, config.currencyCode)} ({formatPercentage(config.retentionRate)}) antes de desembolsar el préstamo.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => payRetention(selectedLoan.id)}
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
            <CardContent className="p-6">
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
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${(selectedLoan.paidInstallments / selectedLoan.totalInstallments) * 100}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              {selectedLoan.remainingPrincipal > 0.01 && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                  <Button
                    onClick={() => setShowPayment(true)}
                    disabled={selectedLoan.status === 'pending_retention'}
                    className={selectedLoan.status === 'pending_retention' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Registrar Pago
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRefinance(true)}
                    disabled={selectedLoan.status === 'pending_retention'}
                    className={selectedLoan.status === 'pending_retention' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refinanciar
                  </Button>
                  {selectedLoan.paidInstallments > 0 && (
                    <Button
                      variant="destructive"
                      onClick={() => handleAnnulPayment(selectedLoan)}
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
                    variant="destructive"
                    onClick={() => handleAnnulPayment(selectedLoan)}
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Anular último pago
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de amortización */}
          <Card>
            <CardHeader>
              <CardTitle>Tabla de Amortización</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Interés</TableHead>
                      <TableHead className="text-right">Transfer.</TableHead>
                      <TableHead className="text-right">Total Cuota</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {amortizationSchedule.schedule.map((entry) => {
                      const isPaid = entry.installmentNumber <= selectedLoan.paidInstallments;
                      const hadPenalty = isPaid && selectedLoan.lastPaymentPenalty && selectedLoan.lastPaymentPenalty > 0 && entry.installmentNumber === selectedLoan.paidInstallments;
                      return (
                        <TableRow
                          key={entry.installmentNumber}
                          className={isPaid ? 'bg-muted/50' : ''}
                        >
                          <TableCell className="font-medium">{entry.installmentNumber}</TableCell>
                          <TableCell>{formatDate(entry.dueDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.principal, config.currencyCode)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.interest, config.currencyCode)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.transferFee, config.currencyCode)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(entry.payment, config.currencyCode)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.balance, config.currencyCode)}</TableCell>
                          <TableCell className="text-center">
                            {isPaid ? (
                              <Badge
                                className={
                                  hadPenalty
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }
                              >
                                Pagado
                              </Badge>
                            ) : (
                              <div className="inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-800 border-2 border-yellow-600 text-xs font-medium">
                                Pendiente
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
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
        className="sm:max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Socio *</Label>
            <Select
              value={formData.memberId}
              onValueChange={(value) => setFormData({ ...formData, memberId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar socio..." />
              </SelectTrigger>
              <SelectContent>
                {memberOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tasa de Interés Mensual</Label>
            <Select
              value={String(formData.monthlyInterestRate)}
              onValueChange={(value) => setFormData({ ...formData, monthlyInterestRate: parseFloat(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1%</SelectItem>
                <SelectItem value="2">2%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plazo (meses)</Label>
            <Input
              type="number"
              value={formData.termMonths || ''}
              onChange={(e) => setFormData({ ...formData, termMonths: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de inicio</Label>
            <DatePicker
              value={formData.startDate}
              onChange={(value) => setFormData({ ...formData, startDate: value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        {/* Checkbox para confirmar retención pagada */}
        <div className="mt-4">
          <label className="flex items-center gap-3 p-3 bg-yellow-50 border-2 border-yellow-600 rounded-lg cursor-pointer hover:bg-accent transition-colors">
            <Checkbox
              checked={formData.retentionPaid}
              onCheckedChange={(checked) => setFormData({ ...formData, retentionPaid: checked as boolean })}
            />
            <div>
              <span className="text-sm font-medium text-yellow-800">
                Confirmar pago de retención por suministros
              </span>
              <p className="text-xs text-yellow-700 mt-1">
                Marque esta casilla si el socio ya pagó la retención de {formatCurrency(formData.amount * formData.monthlyInterestRate / 100, config.currencyCode)} ({formatPercentage(formData.monthlyInterestRate)} del monto del préstamo).
              </p>
            </div>
          </label>
        </div>

        {simulatedLoan && formData.amount > 0 && (
          <div className="mt-4 space-y-3">
            {/* Resumen rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-muted rounded-lg text-sm">
              <div>
                <p className="text-muted-foreground">Retención</p>
                <p className="font-bold text-foreground">{formatCurrency(formData.amount * formData.monthlyInterestRate / 100, config.currencyCode)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cuota mensual</p>
                <p className="font-bold text-foreground">{formatCurrency(simulatedLoan.monthlyPayment, config.currencyCode)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Interés total</p>
                <p className="font-bold text-foreground">{formatCurrency(simulatedLoan.totalInterest, config.currencyCode)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gastos de transferencia</p>
                <p className="font-bold text-foreground">
                  {formatCurrency(simulatedLoan.totalTransferFees, config.currencyCode)} total
                  <br />
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatCurrency(config.transferFee, config.currencyCode)} / cuota
                  </span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total a pagar</p>
                <p className="font-bold text-foreground">
                  {formatCurrency(
                    simulatedLoan.monthlyPayment * formData.termMonths,
                    config.currencyCode
                  )}
                </p>
              </div>
            </div>

            {/* Tabla de amortización */}
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2">#</TableHead>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2">Fecha</TableHead>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2 text-right">Capital</TableHead>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2 text-right">Interés</TableHead>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2 text-right">Transfer.</TableHead>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2 text-right">Cuota</TableHead>
                    <TableHead className="sticky top-0 bg-muted z-10 py-2 text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulatedLoan.schedule.map((entry) => (
                    <TableRow key={entry.installmentNumber}>
                      <TableCell className="py-1.5">{entry.installmentNumber}</TableCell>
                      <TableCell className="py-1.5">{formatDate(entry.dueDate)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatCurrency(entry.principal, config.currencyCode)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatCurrency(entry.interest, config.currencyCode)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatCurrency(entry.transferFee || 0, config.currencyCode)}</TableCell>
                      <TableCell className="py-1.5 text-right font-medium">{formatCurrency(entry.payment, config.currencyCode)}</TableCell>
                      <TableCell className="py-1.5 text-right">{formatCurrency(entry.balance, config.currencyCode)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
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
                <div className="p-3 bg-muted rounded-lg border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm font-medium text-destructive">
                      Pago tardío: Hoy es día {currentDay}. Día límite: {dueDay}.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <Checkbox
                      id="apply-penalty"
                      checked={appliedLatePaymentPenalty}
                      onCheckedChange={(checked) => setAppliedLatePaymentPenalty(checked as boolean)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="apply-penalty" className="text-sm text-foreground cursor-pointer font-normal">
                      Aplicar multa de {formatCurrency(config.penaltyAmount, config.currencyCode)}
                    </Label>
                  </div>
                </div>
              ) : null;
            })()}
            <div className="p-4 bg-muted rounded-lg">
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
              <div className="p-4 bg-success/10 rounded-lg text-sm text-success">
                🎉 El préstamo está completamente pagado. Confirme para marcarlo como finalizado.
              </div>
            ) : selectedLoan.monthlyPayment > selectedLoan.remainingPrincipal ? (
              <div className="p-3 bg-warning/10 rounded-lg text-sm text-warning">
                La cuota mensual es mayor que el saldo pendiente. Se sugiere pagar {formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)} para cerrar el préstamo.
              </div>
            ) : null}
            {Math.abs(selectedLoan.remainingPrincipal) > 0.01 && (
              <div className="space-y-2">
                <Label>Monto a pagar</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    max={selectedLoan.remainingPrincipal}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Sugerido: ${formatCurrency(Math.min(selectedLoan.remainingPrincipal, selectedLoan.monthlyPayment), config.currencyCode)} (máx: ${formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)})`}
                    className="pl-9"
                  />
                </div>
                {paymentAmount && (() => {
                  const baseAmount = parseFloat(paymentAmount) || 0;
                  const penaltyAmount = appliedLatePaymentPenalty ? (config.penaltyAmount ?? 5) : 0;
                  const totalAmount = baseAmount + penaltyAmount;
                  return penaltyAmount > 0 ? (
                    <div className="mt-2 p-2 bg-amber-50 rounded text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Capital a pagar:</span>
                        <span>{formatCurrency(baseAmount, config.currencyCode)}</span>
                      </div>
                      <div className="flex justify-between text-amber-700 font-medium mt-1">
                        <span>+ Multa:</span>
                        <span>{formatCurrency(penaltyAmount, config.currencyCode)}</span>
                      </div>
                      <div className="border-t border-amber-200 mt-1 pt-1 flex justify-between font-bold text-foreground">
                        <span>Total a pagar a Caja:</span>
                        <span>{formatCurrency(totalAmount, config.currencyCode)}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {Math.abs(selectedLoan.remainingPrincipal) <= 0.01 && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                💡 El préstamo ya está pagado. Haga clic en "Finalizar Préstamo" para completar el proceso.
              </div>
            )}
            {Math.abs(selectedLoan.remainingPrincipal) > 0.01 && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                💡 El pago se aplicará directamente al capital pendiente. Máximo: <strong>{formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}</strong>
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
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-foreground font-medium">¿Estás seguro de eliminar este préstamo?</p>
                <p className="text-sm text-muted-foreground">Esta acción es irreversible y afectará los saldos contables.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de anulación de pago */}
      <Dialog open={isAnnulModalOpen} onOpenChange={(open) => { if (!open) { setIsAnnulModalOpen(false); setLoanToAnnul(null); } }}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>Anular último pago</DialogTitle>
          </DialogHeader>
                <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAnnulModalOpen(false); setLoanToAnnul(null); }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmAnnul}>
              <Undo2 className="w-4 h-4 mr-2" />
              Confirmar Anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Loans;
