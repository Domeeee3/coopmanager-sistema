import React, { useState } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { formatCurrency } from '@/core/lib/formatters';
import { Loan } from '@/core/types';
import { calculateFrenchAmortization } from '@/core/hooks/useFinance';

interface RefinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (termMonths: number) => void;
  loan: Loan | null;
}

export function RefinanceModal({ isOpen, onClose, onConfirm, loan }: RefinanceModalProps) {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>=
          <DialogTitle>Refinanciar Préstamo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              El préstamo actual será cerrado y se creará uno nuevo con el saldo pendiente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Actual</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(loan.remainingPrincipal, config.currencyCode)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cuota Actual</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(loan.monthlyPayment, config.currencyCode)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nuevo plazo (meses)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={newTerm}
              onChange={(e) => setNewTerm(parseInt(e.target.value) || 1)}
              placeholder="Ej: 12"
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nueva Cuota Estimada</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(newAmortization.monthlyPayment, config.currencyCode)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="secondary" onClick={() => onConfirm(newTerm)}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
