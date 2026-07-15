import React from 'react';
import { Button, Card, ProgressBar } from '@heroui/react';
import { useApp } from '@/core/store/AppContext';
import { StatusBadge } from '@/shared/components/status-badge';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import { Loan } from '@/core/types';
import { ChevronRight, Trash2 } from 'lucide-react';

interface LoanCardProps {
  loan: Loan;
  onSelect: (loan: Loan) => void;
  onDelete: (loan: Loan) => void;
  transactions: any[];
}

export function LoanCard({ loan, onSelect, onDelete, transactions }: LoanCardProps) {
  const { config } = useApp();
  const isPaid = loan.remainingPrincipal <= 0.01;
  const hasPayments = transactions.some(t => t.referenceId === loan.id && t.type === 'loan_payment');
  const progress = (loan.paidInstallments / loan.totalInstallments) * 100;

  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${isPaid ? 'opacity-60' : ''}`}
      onClick={() => onSelect(loan)}
    >
      <Card.Content className="p-4 flex items-center gap-4">
        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground">
              {formatCurrency(loan.amount, config.currencyCode)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(loan.startDate)} · {loan.termMonths} meses
            </span>
          </div>
          {loan.notes && (
            <p className="text-[11px] text-muted-foreground italic mt-1 mb-2 leading-tight border-l-2 border-primary/20 pl-2 text-wrap whitespace-pre-wrap">
              {loan.notes}
            </p>
          )}
          {/* Barra de progreso compacta */}
          <div className="flex items-center gap-3">
            <ProgressBar value={progress} aria-label="Progreso del préstamo" size="sm" className="flex-1">
              <ProgressBar.Track>
                <ProgressBar.Fill className={isPaid ? 'bg-success' : 'bg-primary'} />
              </ProgressBar.Track>
            </ProgressBar>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {loan.paidInstallments}/{loan.totalInstallments}
            </span>
          </div>
          {/* Cuota y saldo en línea */}
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span>Cuota: {formatCurrency(loan.monthlyPayment, config.currencyCode)}</span>
            <span>Saldo: <span className="font-medium text-foreground">{formatCurrency(loan.remainingPrincipal, config.currencyCode)}</span></span>
          </div>
        </div>

        {/* Badge + acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={loan.status} />
          {!hasPayments && (
            <Button
              variant="ghost"
              size="sm" isIconOnly
              className="h-8 w-8 hover:text-destructive"
              onPress={() => onDelete(loan)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </Card.Content>
    </Card>
  );
}
