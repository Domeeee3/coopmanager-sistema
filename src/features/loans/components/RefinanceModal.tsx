import React, { useState } from 'react';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { useApp } from '@/core/store/AppContext';
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
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container className="sm:max-w-[425px]">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Refinanciar Préstamo</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar refinanciación" />
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <div className="p-4 rounded-[var(--radius)] border border-border bg-muted">
                <p className="text-sm text-muted-foreground">
                  El préstamo actual será cerrado y se creará uno nuevo con el saldo pendiente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-[var(--radius)] border border-border bg-card">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Actual</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(loan.remainingPrincipal, config.currencyCode)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cuota Actual</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(loan.monthlyPayment, config.currencyCode)}</p>
                </div>
              </div>

              <TextField fullWidth type="number">
                <Label>Nuevo plazo (meses)</Label>
                <Input
                  min={1}
                  step={1}
                  value={newTerm}
                  onChange={(e) => setNewTerm(parseInt(e.target.value) || 1)}
                  placeholder="12"
                />
              </TextField>

              <div className="p-4 rounded-[var(--radius)] border border-border bg-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nueva Cuota Estimada</span>
                  <span className="text-xl font-bold text-foreground">{formatCurrency(newAmortization.monthlyPayment, config.currencyCode)}</span>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="gap-3">
              <Button variant="outline" onPress={onClose}>Cancelar</Button>
              <Button onPress={() => onConfirm(newTerm)}>Confirmar</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
