import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { useApp } from '@/core/store/AppContext';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import { buildRefinancePlan, getPendingInstallmentCount } from '@/core/lib/loans';
import { Loan } from '@/core/types';

interface RefinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newPendingInstallments: number) => void;
  loan: Loan | null;
}

export function RefinanceModal({ isOpen, onClose, onConfirm, loan }: RefinanceModalProps) {
  const { config } = useApp();
  const pendingCount = loan ? getPendingInstallmentCount(loan) : 0;
  const [newPending, setNewPending] = useState(pendingCount + 1);

  useEffect(() => {
    if (isOpen) setNewPending(pendingCount + 1);
  }, [isOpen, pendingCount]);

  const plan = useMemo(() => (loan ? buildRefinancePlan(loan, newPending) : null), [loan, newPending]);

  if (!loan) return null;

  const money = (value: number) => formatCurrency(value, config.currencyCode);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop variant="blur">
        <Modal.Container className="sm:max-w-[460px]">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Refinanciar préstamo</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar refinanciación" />
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <div className="rounded-[var(--radius)] border border-border bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  Se alarga el plazo del mismo préstamo. Las cuotas pagadas se conservan y se cobra interés sólo por los meses agregados, sobre el capital pendiente. No se registra movimiento de caja.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-[var(--radius)] border border-border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo pendiente</p>
                  <p className="text-lg font-bold text-foreground">{money(loan.remainingPrincipal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cuotas pendientes</p>
                  <p className="text-lg font-bold text-foreground">{pendingCount} de {money(loan.monthlyPayment)}</p>
                </div>
              </div>

              <TextField fullWidth type="number">
                <Label>Nuevo número de cuotas pendientes</Label>
                <Input
                  min={pendingCount + 1}
                  step={1}
                  value={newPending || ''}
                  onChange={(event) => setNewPending(parseInt(event.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Debe ser mayor que {pendingCount}.</p>
              </TextField>

              {plan ? (
                <div className="space-y-2 rounded-[var(--radius)] border border-border bg-muted p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meses agregados</span>
                    <span className="tabular-nums text-foreground">{plan.addedMonths}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Interés adicional ({money(plan.pendingCapital)} × {loan.monthlyInterestRate}% × {plan.addedMonths})
                    </span>
                    <span className="tabular-nums text-foreground">{money(plan.extraInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nuevo saldo pendiente</span>
                    <span className="tabular-nums text-foreground">{money(plan.newBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última cuota</span>
                    <span className="tabular-nums text-foreground">{formatDate(plan.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="font-medium text-foreground">Nueva cuota mensual</span>
                    <span className="text-xl font-bold tabular-nums text-foreground">{money(plan.monthlyPayment)}</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--radius)] border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                  Ingrese un número de cuotas mayor que {pendingCount}.
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="gap-3">
              <Button variant="outline" onPress={onClose}>Cancelar</Button>
              <Button isDisabled={!plan} onPress={() => plan && onConfirm(plan.newPendingInstallments)}>Confirmar</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
