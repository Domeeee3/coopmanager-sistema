import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal, { FormModal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/Badge';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import { Loan, LoanFormData, Member } from '../types';
import { calculateFrenchAmortization } from '../hooks/useFinance';
import { 
  Plus, CreditCard, DollarSign, Calendar, 
  RefreshCw, Eye, TrendingUp, Calculator, ChevronRight, ArrowLeft, User, Trash2, AlertTriangle, MessageSquare
} from 'lucide-react';

type ViewMode = 'members' | 'member-loans' | 'loan-detail';

interface LoanCardProps {
  loan: Loan;
  onSelect: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
  transactions: any[]; // Ajustar tipo si es necesario
}

function LoanCard({ loan, onSelect, onDelete, transactions }: LoanCardProps) {
  const { config } = useApp();
  const isPaid = loan.remainingPrincipal <= 0.01;
  const hasPayments = transactions.some(t => t.referenceId === loan.id && t.type === 'loan_payment');

  return (
    <Card 
      hover={!isPaid} 
      className={`cursor-pointer relative ${isPaid ? 'bg-slate-50 dark:bg-slate-800/50 opacity-75' : ''}`} 
      onClick={() => onSelect(loan)}
    >
      {!hasPayments && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(loan); }}
          className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              loan.status === 'active' ? 'bg-warning-100 dark:bg-warning-900/30' :
              loan.status === 'paid' ? 'bg-success-100 dark:bg-success-900/30' :
              'bg-slate-100 dark:bg-slate-800'
            }`}>
              <CreditCard className={`w-5 h-5 ${
                loan.status === 'active' ? 'text-warning-600' :
                loan.status === 'paid' ? 'text-success-600' :
                'text-slate-500'
              }`} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(loan.amount, config.currencyCode)}
              </p>
              <p className="text-sm text-slate-500">
                {formatDate(loan.startDate)} • {loan.termMonths} meses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isPaid && <StatusBadge status="paid" />}
            <StatusBadge status={loan.status} />
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
        
        {/* Notas */}
        {loan.notes && (
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            Nota: {loan.notes}
          </p>
        )}
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{loan.paidInstallments}/{loan.totalInstallments} cuotas</span>
            <span className="font-medium">{((loan.paidInstallments / loan.totalInstallments) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                loan.status === 'paid' ? 'bg-success-500' : 'bg-primary-600'
              }`}
              style={{ width: `${(loan.paidInstallments / loan.totalInstallments) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Cuota: {formatCurrency(loan.monthlyPayment, config.currencyCode)}</span>
            <span className="text-slate-500">Saldo: <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(loan.remainingPrincipal, config.currencyCode)}</span></span>
          </div>
        </div>
      </div>
    </Card>
  );
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
  
  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  
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
  React.useEffect(() => {
    if (selectedLoan && showPayment) {
      const suggested = Math.min(selectedLoan.remainingPrincipal, selectedLoan.monthlyPayment);
      setPaymentAmount(suggested.toFixed(2));
    }
  }, [selectedLoan, showPayment]);

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
    prepayLoan(selectedLoan.id, amount);
    setShowPayment(false);
    setPaymentAmount('');
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
            <Button variant="ghost" size="sm" onClick={handleBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Volver
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {viewMode === 'members' && 'Préstamos'}
              {viewMode === 'member-loans' && selectedMember?.name}
              {viewMode === 'loan-detail' && `Préstamo #${selectedLoan?.id.slice(0, 8)}`}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {viewMode === 'members' && 'Seleccione un socio para ver sus préstamos'}
              {viewMode === 'member-loans' && `${memberLoans.length} préstamo(s) registrado(s)`}
              {viewMode === 'loan-detail' && `Iniciado el ${formatDate(selectedLoan?.startDate || '')}`}
            </p>
          </div>
        </div>
        
        {viewMode === 'members' && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenForm()}>
            Nuevo Préstamo
          </Button>
        )}
        {viewMode === 'member-loans' && selectedMember && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenForm(selectedMember)}>
            Nuevo Préstamo
          </Button>
        )}
      </div>

      {/* Vista: Lista de Socios */}
      {viewMode === 'members' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="glass" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Activos</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalActive}</p>
                </div>
              </div>
            </Card>
            <Card variant="glass" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Prestado</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalLoaned, config.currencyCode)}</p>
                </div>
              </div>
            </Card>
            <Card variant="glass" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Interés Total</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalInterest, config.currencyCode)}</p>
                </div>
              </div>
            </Card>
            <Card variant="glass" padding="md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-danger-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Por Cobrar</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalPending, config.currencyCode)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Lista de socios */}
          <Card padding="none">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {memberLoansData.map(({ member, totalLoans, activeLoans, totalDebt }) => (
                <button
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-slate-500">
                        {activeLoans > 0 ? (
                          <span className="text-warning-600">{activeLoans} préstamo(s) activo(s)</span>
                        ) : totalLoans > 0 ? (
                          <span className="text-success-600">{totalLoans} préstamo(s) pagado(s)</span>
                        ) : (
                          <span>Sin préstamos</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {totalDebt > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Saldo pendiente</p>
                        <p className="font-bold text-danger-600">{formatCurrency(totalDebt, config.currencyCode)}</p>
                      </div>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </button>
              ))}
              {memberLoansData.length === 0 && (
                <div className="p-8 text-center text-slate-500">
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
              <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Este socio no tiene préstamos registrados</p>
              <Button className="mt-4" onClick={() => handleOpenForm(selectedMember)}>
                Crear Primer Préstamo
              </Button>
            </Card>
          ) : (
            <>
              {/* Préstamos Activos */}
              {activeLoans.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Préstamos Activos</h3>
                  <div className="space-y-4">
                    {activeLoans.map(loan => (
                      <LoanCard key={loan.id} loan={loan} onSelect={handleSelectLoan} onDelete={handleDeleteLoan} transactions={transactions} />
                    ))}
                  </div>
                </div>
              )}

              {/* Préstamos Pagados */}
              {paidLoans.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Préstamos Pagados</h3>
                  <div className="space-y-4">
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
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-warning-300 dark:border-warning-700 rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-200 dark:bg-amber-800/50 rounded-lg">
                  <Calculator className="w-6 h-6 text-warning-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-warning-900 dark:text-warning-100 mb-1">
                    Retención por Suministros Pendiente
                  </h3>
                  <p className="text-sm text-warning-700 dark:text-warning-300 mb-3">
                    Se debe cobrar {formatCurrency(selectedLoan.retentionAmount, config.currencyCode)} ({formatPercentage(config.retentionRate)}) antes de desembolsar el préstamo.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => payRetention(selectedLoan.id)}
                    leftIcon={<DollarSign className="w-4 h-4" />}
                  >
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
                  <p className="text-sm text-slate-500">Monto</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedLoan.amount, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cuota Mensual</p>
                  <p className="text-xl font-bold text-primary-600">{formatCurrency(selectedLoan.monthlyPayment, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tasa Mensual</p>
                  <p className="text-xl font-bold text-warning-600">{formatPercentage(selectedLoan.monthlyInterestRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Saldo Pendiente</p>
                  <p className="text-xl font-bold text-danger-600">{formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}</p>
                </div>
              </div>
              
              {/* Notas */}
              {selectedLoan.notes && (
                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas del Préstamo</p>
                      <p className="text-base text-slate-900 dark:text-white">{selectedLoan.notes}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Progress */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm mb-2">
                  <span>{selectedLoan.paidInstallments}/{selectedLoan.totalInstallments} cuotas pagadas</span>
                  <span className="font-semibold">{((selectedLoan.paidInstallments / selectedLoan.totalInstallments) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-success-500 h-3 rounded-full transition-all"
                    style={{ width: `${(selectedLoan.paidInstallments / selectedLoan.totalInstallments) * 100}%` }}
                  />
                </div>
              </div>
              
              {/* Actions */}
              {selectedLoan.remainingPrincipal > 0.01 && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <Button 
                    onClick={() => setShowPayment(true)} 
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    disabled={selectedLoan.status === 'pending_retention'}
                    className={selectedLoan.status === 'pending_retention' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Registrar Pago
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowRefinance(true)} 
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    disabled={selectedLoan.status === 'pending_retention'}
                    className={selectedLoan.status === 'pending_retention' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Refinanciar
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
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-right">Capital</th>
                      <th className="px-4 py-3 text-right">Interés</th>
                      <th className="px-4 py-3 text-right">Transfer.</th>
                      <th className="px-4 py-3 text-right">Total Cuota</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {amortizationSchedule.schedule.map((entry) => {
                      const isPaid = entry.installmentNumber <= selectedLoan.paidInstallments;
                      return (
                        <tr
                          key={entry.installmentNumber}
                          className={isPaid ? 'bg-success-50/50 dark:bg-success-900/10' : ''}
                        >
                          <td className="px-4 py-3 font-medium">{entry.installmentNumber}</td>
                          <td className="px-4 py-3">{formatDate(entry.dueDate)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(entry.principal, config.currencyCode)}</td>
                          <td className="px-4 py-3 text-right text-warning-600">{formatCurrency(entry.interest, config.currencyCode)}</td>
                          <td className="px-4 py-3 text-right text-primary-600">{formatCurrency(entry.transferFee, config.currencyCode)}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(entry.payment, config.currencyCode)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(entry.balance, config.currencyCode)}</td>
                          <td className="px-4 py-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                                Pagado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
        width="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Socio *"
            value={formData.memberId}
            onChange={(value) => setFormData({ ...formData, memberId: value })}
            options={memberOptions}
            placeholder="Seleccionar socio..."
          />
          <Input
            label="Monto *"
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
          <Select
            label="Tasa de Interés Mensual"
            value={String(formData.monthlyInterestRate)}
            onChange={(value) => setFormData({ ...formData, monthlyInterestRate: parseFloat(value) })}
            options={[
              { value: '1', label: '1%' },
              { value: '2', label: '2%' },
            ]}
          />
          <Input
            label="Plazo (meses)"
            type="number"
            value={formData.termMonths || ''}
            onChange={(e) => setFormData({ ...formData, termMonths: parseInt(e.target.value) || 0 })}
          />
          <Input
            label="Fecha de inicio"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
          <Input
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {/* Checkbox para confirmar retención pagada */}
        <div className="mt-4">
          <label className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            <input
              type="checkbox"
              checked={formData.retentionPaid}
              onChange={(e) => setFormData({ ...formData, retentionPaid: e.target.checked })}
              className="w-4 h-4 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500 focus:ring-2"
            />
            <div>
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Confirmar pago de retención por suministros
              </span>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Marque esta casilla si el socio ya pagó la retención de {formatCurrency(formData.amount * formData.monthlyInterestRate / 100, config.currencyCode)} ({formatPercentage(formData.monthlyInterestRate)} del monto del préstamo).
              </p>
            </div>
          </label>
        </div>

        {simulatedLoan && formData.amount > 0 && (
          <div className="mt-6 space-y-3">
            {/* Retención por Suministros - Calculada automáticamente */}
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
              <p className="text-sm text-warning-900 dark:text-warning-100 font-medium mb-2">
                ⚠️ Retención por Suministros
              </p>
              <div className="text-left">
                <span className="text-sm">Monto a pagar: </span>
                <span className="text-lg font-bold text-warning-900 dark:text-warning-100">
                  {formatCurrency(formData.amount * formData.monthlyInterestRate / 100, config.currencyCode)}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <h4 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Simulación
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Cuota Mensual</p>
                  <p className="text-lg font-bold text-primary-600">{(simulatedLoan.totalAmount / formData.termMonths).toFixed(3)} {config.currencyCode}</p>
                  <p className="text-xs text-slate-950 mt-1">(Redondeado a {formatCurrency(simulatedLoan.monthlyPayment, config.currencyCode)})</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Interés Total</p>
                  <p className="text-lg font-bold text-warning-600">{formatCurrency(simulatedLoan.totalInterest, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Transferencias</p>
                  <p className="text-lg font-bold text-primary-600">{formatCurrency(config.transferFee * 12, config.currencyCode)}</p>
                  <p className="text-xs text-slate-950 mt-1">${config.transferFee} × 12</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total a Pagar</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(simulatedLoan.monthlyPayment * formData.termMonths, config.currencyCode)}</p>
                </div>
              </div>
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
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo pendiente</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-slate-500">Cuota mensual</span>
                <span className="font-medium text-primary-600">{formatCurrency(selectedLoan.monthlyPayment, config.currencyCode)}</span>
              </div>
            </div>
            {Math.abs(selectedLoan.remainingPrincipal) <= 0.01 ? (
              <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg text-sm text-success-800 dark:text-success-200">
                🎉 El préstamo está completamente pagado. Confirme para marcarlo como finalizado.
              </div>
            ) : selectedLoan.monthlyPayment > selectedLoan.remainingPrincipal ? (
              <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg text-sm text-warning-800 dark:text-warning-200">
                La cuota mensual es mayor que el saldo pendiente. Se sugiere pagar {formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)} para cerrar el préstamo.
              </div>
            ) : null}
            {Math.abs(selectedLoan.remainingPrincipal) > 0.01 && (
              <Input
                label="Monto a pagar"
                type="number"
                step="0.01"
                max={selectedLoan.remainingPrincipal}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                leftIcon={<DollarSign className="w-4 h-4" />}
                placeholder={`Sugerido: ${formatCurrency(Math.min(selectedLoan.remainingPrincipal, selectedLoan.monthlyPayment), config.currencyCode)} (máx: ${formatCurrency(selectedLoan.remainingPrincipal, config.currencyCode)})`}
              />
            )}
            {Math.abs(selectedLoan.remainingPrincipal) <= 0.01 && (
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm text-primary-700 dark:text-primary-300">
                💡 El préstamo ya está pagado. Haga clic en "Finalizar Préstamo" para completar el proceso.
              </div>
            )}
            {Math.abs(selectedLoan.remainingPrincipal) > 0.01 && (
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm text-primary-700 dark:text-primary-300">
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
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar eliminación"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-full">
              <AlertTriangle className="w-6 h-6 text-danger-600" />
            </div>
            <div>
              <p className="text-slate-900 dark:text-white font-medium">¿Estás seguro de eliminar este préstamo?</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Esta acción es irreversible y afectará los saldos contables.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Componente modal de refinanciamiento
function RefinanceModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loan 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (termMonths: number) => void;
  loan: Loan | null;
}) {
  const { config } = useApp();
  const [newTerm, setNewTerm] = useState(24);

  if (!loan) return null;

  const newAmortization = calculateFrenchAmortization(
    loan.remainingPrincipal,
    config.monthlyInterestRate,
    newTerm,
    new Date().toISOString().split('T')[0],
    config.transferFee
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Refinanciar Préstamo"
      size="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            El préstamo actual será cerrado y se creará uno nuevo con el saldo pendiente.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div>
            <p className="text-sm text-slate-500">Saldo Actual</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(loan.remainingPrincipal, config.currencyCode)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Cuota Actual</p>
            <p className="text-lg font-bold text-primary-600">{formatCurrency(loan.monthlyPayment, config.currencyCode)}</p>
          </div>
        </div>

        <Input
          label="Nuevo plazo (meses)"
          type="number"
          min={1}
          step={1}
          value={newTerm}
          onChange={(e) => setNewTerm(parseInt(e.target.value) || 1)}
          placeholder="Ej: 12"
        />

        <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm text-success-700 dark:text-success-300">Nueva Cuota Estimada</span>
            <span className="text-xl font-bold text-success-700 dark:text-success-300">{formatCurrency(newAmortization.monthlyPayment, config.currencyCode)}</span>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={() => onConfirm(newTerm)}>Confirmar</Button>
        </div>
      </div>
    </Modal>
  );
}

export default Loans;
