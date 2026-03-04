import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { FormModal, ConfirmModal } from '@/shared/components/custom-modal';
import { DataTable } from '@/shared/components/data-table';
import { formatCurrency } from '@/core/lib/formatters';
import { useRefundForm } from './hooks/useRefundForm';
import { getRefundColumns } from './columns';
import { Plus, UserMinus, DollarSign, TrendingDown } from 'lucide-react';
import { DatePicker } from '@/shared/ui/date-picker';

export function RefundsTab() {
  const { members, refunds, config } = useApp();
  const form = useRefundForm();
  const [search, setSearch] = useState('');

  const memberOptions = useMemo(
    () => members.map(m => ({ value: m.id, label: m.name })),
    [members]
  );

  const columns = useMemo(
    () => getRefundColumns({
      currencyCode: config.currencyCode,
      onEdit: form.openEdit,
      onDelete: form.openDelete,
    }),
    [config.currencyCode, form.openEdit, form.openDelete]
  );

  const filteredRefunds = useMemo(
    () => refunds.filter(r =>
      !search ||
      r.memberName.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase())
    ),
    [refunds, search]
  );

  const totalRefunded = useMemo(
    () => refunds.reduce((sum, r) => sum + r.amount, 0),
    [refunds]
  );

  return (
    <>
      <div className="space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <UserMinus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Devoluciones</p>
                  <p className="text-2xl font-bold text-foreground">{refunds.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Devuelto</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(totalRefunded, config.currencyCode)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <TrendingDown className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Promedio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(refunds.length > 0 ? totalRefunded / refunds.length : 0, config.currencyCode)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={form.openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Devolución
          </Button>
        </div>

        {/* Tabla */}
        <DataTable
          data={filteredRefunds}
          columns={columns}
          keyExtractor={(r) => r.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o motivo..."
          emptyMessage="No hay devoluciones registradas"
        />
      </div>

      {/* Modal de formulario de devolución */}
      <FormModal
        isOpen={form.showForm}
        onClose={form.closeForm}
        onSubmit={form.submit}
        title={form.selected ? 'Editar Devolución' : 'Nueva Devolución por Retiro'}
        submitText={form.selected ? 'Guardar Cambios' : 'Registrar Devolución'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Socio *</Label>
            <Select
              value={form.formData.memberId}
              onValueChange={(value) => form.setFormData({ ...form.formData, memberId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un socio" />
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
            <Label>Motivo del retiro *</Label>
            <Textarea
              value={form.formData.reason}
              onChange={(e) => form.setFormData({ ...form.formData, reason: e.target.value })}
              placeholder="Describa el motivo del retiro..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Monto a devolver *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.formData.amount || ''}
              onChange={(e) => form.setFormData({ ...form.formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de depósito</Label>
            <DatePicker
              value={form.formData.depositDate}
              onChange={(value) => form.setFormData({ ...form.formData, depositDate: value })}
            />
          </div>
        </div>
      </FormModal>

      {/* Modal de confirmación de eliminación de devolución */}
      <ConfirmModal
        isOpen={form.showDelete}
        onClose={form.closeDelete}
        onConfirm={form.confirmDelete}
        title="Eliminar Devolución"
        message={`¿Está seguro de que desea eliminar esta devolución de "${form.selected?.memberName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </>
  );
}
