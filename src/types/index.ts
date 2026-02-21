// Tipos principales para CoopManager
// Sistema de Gestión para Cooperativa Cerrada de Ahorro y Crédito

// ==================== CONFIGURACIÓN ====================
export interface AppConfig {
  monthlyShareAmount: number;      // Aporte mensual de capital (ej. $25)
  monthlyExpenseAmount: number;    // Gastos administrativos mensuales (ej. $5)
  penaltyAmount: number;           // Multa por pago tardío (ej. $5)
  penaltyDayThreshold: number;     // Día del mes para considerar multa (ej. 3)
  monthlyInterestRate: number;     // Tasa mensual de interés para préstamos (%)
  transferFee: number;             // Cargo fijo por transferencia bancaria ($0.41)
  retentionRate: number;           // Porcentaje de retención por suministros (1%)
  currencySymbol: string;          // Símbolo de moneda
  currencyCode: string;            // Código de moneda (ej. USD)
  openingBalance: number;          // Saldo inicial de años anteriores
}

// ==================== SOCIOS ====================
export type MemberStatus = 'active' | 'inactive' | 'suspended';

export interface Member {
  id: string;
  name: string;
  phone: string;
  joinDate: string;                // ISO date string
  status: MemberStatus;
  totalContributions: number;      // Total de aportes históricos
  currentBalance: number;          // Balance actual (aportes - retiros)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberFormData {
  name: string;
  phone: string;
  joinDate: string;
  notes?: string;
}

// ==================== DEVOLUCIONES POR RETIRO ====================
export interface Refund {
  id: string;
  memberId: string;
  memberName: string;
  reason: string;                  // Motivo del retiro
  amount: number;                  // Monto de devolución
  depositDate: string;             // Fecha de depósito
  createdAt: string;
  updatedAt: string;
}

export interface RefundFormData {
  memberId: string;
  reason: string;
  amount: number;
  depositDate: string;
}

// ==================== APORTES ====================
export type ContributionStatus = 'pending' | 'paid' | 'late' | 'penalty';

export interface Contribution {
  id: string;
  memberId: string;
  month: string;                   // Formato: "2024-01" (año-mes)
  shareAmount: number;             // Monto de aporte (valor histórico)
  expenseAmount: number;           // Gastos administrativos (valor histórico)
  penaltyAmount: number;           // Multa aplicada
  totalAmount: number;             // Total a pagar
  status: ContributionStatus;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
}

export interface ContributionFormData {
  memberId: string;
  month: string;
  shareAmount: number;
  expenseAmount: number;
  penaltyAmount?: number;
}

// ==================== PRÉSTAMOS ====================
export type LoanStatus = 'pending_retention' | 'active' | 'paid' | 'refinanced' | 'defaulted' | 'cancelled';

export interface Loan {
  id: string;
  memberId: string;
  memberName: string;              // Denormalizado para顯示
  amount: number;                  // Capital prestado
  monthlyInterestRate: number;     // Tasa mensual %
  termMonths: number;              // Plazo en meses
  monthlyPayment: number;          // Cuota fija (Sistema Francés)
  transferFee: number;             // Cargo por transferencia por cuota
  totalInterest: number;           // Interés total del préstamo
  totalAmount: number;             // Capital + Intereses + Transferencias
  retentionAmount: number;         // 1% de retención por suministros
  retentionPaid: boolean;          // Si ya se cobró la retención
  paidPrincipal: number;           // Capital pagado hasta ahora
  remainingPrincipal: number;      // Capital pendiente
  paidInstallments: number;        // Cuotas pagadas
  totalInstallments: number;       // Total de cuotas
  startDate: string;
  endDate: string;
  status: LoanStatus;
  refinancedFromId?: string;       // ID del préstamo original si fue refinanciado
  notes?: string;
  schedule: AmortizationEntry[];   // Tabla de amortización completa
  createdAt: string;
}

export interface LoanFormData {
  memberId: string;
  amount: number;
  monthlyInterestRate: number;
  termMonths: number;
  startDate: string;
  notes?: string;
  retentionAmount?: number; // Monto de retención opcional
  retentionPaid?: boolean; // Si la retención fue pagada al aprobar
}

// ==================== AMORTIZACIÓN ====================
export interface AmortizationEntry {
  installmentNumber: number;
  dueDate: string;
  principal: number;
  interest: number;
  transferFee: number;
  payment: number;
  balance: number;
  status: 'pending' | 'paid' | 'late' | 'penalty' | 'partial';
  paidDate?: string;
  penaltyAmount?: number;
}

export interface AmortizationSchedule {
  loanId: string;
  entries: AmortizationEntry[];
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
}

// ==================== GASTOS ====================
export type ExpenseCategory = 'administrative' | 'maintenance' | 'services' | 'supplies' | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  receipt?: string;                // Referencia a comprobante
  notes?: string;
  createdAt: string;
}

export interface ExpenseFormData {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
}

// ==================== TRANSACCIONES (Caja) ====================
export type TransactionType = 
  | 'contribution'        // Aporte de socio
  | 'loan_payment'        // Pago de cuota de préstamo
  | 'penalty'             // Multa cobrada
  | 'retention'           // Retención por suministros (1%)
  | 'loan_approval'       // Aprobación de préstamo (desembolso)
  | 'loan_cancel'         // Cancelación de préstamo (devuelve capital)
  | 'expense'             // Gasto administrativo
  | 'refund'              // Reintegro
  | 'manual_adjustment';  // Ajuste manual de caja

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId?: string;            // ID de referencia (miembro, préstamo, etc.)
  date: string;
  createdAt: string;
}

// ==================== AUDITORÍA ====================
export type ActivityType = 
  | 'member_add' | 'member_edit' | 'member_delete' | 'member_inactive'
  | 'contribution_add' | 'contribution_pay' | 'contribution_edit' | 'contribution_delete'
  | 'loan_add' | 'loan_pay' | 'loan_retention_pay' | 'loan_refinance' | 'loan_cancel' | 'loan_delete'
  | 'expense_add' | 'expense_delete'
  | 'refund_add' | 'refund_edit' | 'refund_delete'
  | 'config_update' | 'cashbox_adjust' | 'annual_closing'
  | 'data_clear';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  description: string;
  details?: string;              // Detalles adicionales JSON
  userId?: string;               // Para futuras implementaciones
  referenceId?: string;          // ID del elemento afectado
  timestamp: string;
}

// ==================== ESTADÍSTICAS ====================
export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalLoans: number;
  activeLoans: number;
  totalLoaned: number;
  totalContributions: number;
  totalInterestEarned: number;
  totalPenalties: number;
  totalExpenses: number;
  availableCash: number;
  delinquencyRate: number;
}

// ==================== NOTIFICACIONES ====================
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ==================== UI STATE ====================
export interface FontSizeSettings {
  base: number;                    // Multiplicador (1 = normal, 1.2 = 120%)
  step: number;                    // Incremento por click
  min: number;
  max: number;
}

export interface ThemeSettings {
  mode: 'light' | 'dark';
}
