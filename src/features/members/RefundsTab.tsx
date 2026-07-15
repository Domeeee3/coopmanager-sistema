import { useMemo, useState } from 'react';
import {
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  useOverlayState,
} from '@heroui/react';
import { useApp } from '@/core/store/AppContext';
import { DataTable } from '@/shared/components/data-table';
import { DatePicker } from "@/shared/ui/date-picker";
import { StatCard } from '@/shared/components/StatCard';
import { formatCurrency } from '@/core/lib/formatters';
import { useRefundForm } from './hooks/useRefundForm';
import { getRefundColumns } from './columns';
import { Plus, UserMinus, DollarSign, TrendingDown } from 'lucide-react';

export function RefundsTab() {
  const { members, refunds, config } = useApp();
  const form = useRefundForm();
  const [search, setSearch] = useState('');

  const refundFormModal = useOverlayState({
    isOpen: form.showForm,
    onOpenChange: (isOpen) => {
      if (!isOpen) form.closeForm();
    },
  });
  const deleteModal = useOverlayState({
    isOpen: form.showDelete,
    onOpenChange: (isOpen) => {
      if (!isOpen) form.closeDelete();
    },
  });

  const memberOptions = useMemo(
    () => members.map(member => ({ value: member.id, label: member.name })),
    [members]
  );

  const columns = useMemo(
    () => getRefundColumns({
      currencyCode: config.currencyCode,
      members,
      onEdit: form.openEdit,
      onDelete: form.openDelete,
    }),
    [config.currencyCode, members, form.openEdit, form.openDelete]
  );

  const filteredRefunds = useMemo(
    () => refunds.filter(refund =>
      !search ||
      refund.memberName.toLowerCase().includes(search.toLowerCase()) ||
      refund.reason.toLowerCase().includes(search.toLowerCase())
    ),
    [refunds, search]
  );

  const totalRefunded = useMemo(
    () => refunds.reduce((sum, refund) => sum + refund.amount, 0),
    [refunds]
  );

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total de devoluciones"
            value={refunds.length}
            icon={UserMinus}
            tone="primary"
          />
          <StatCard
            label="Monto devuelto"
            value={formatCurrency(totalRefunded, config.currencyCode)}
            icon={DollarSign}
            tone="warning"
          />
          <StatCard
            label="Promedio"
            value={formatCurrency(refunds.length > 0 ? totalRefunded / refunds.length : 0, config.currencyCode)}
            icon={TrendingDown}
            tone="success"
          />
        </div>

        <DataTable
          data={filteredRefunds}
          columns={columns}
          keyExtractor={(refund) => refund.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o motivo..."
          toolbar={(
            <Button className="sm:ml-auto" onPress={form.openCreate}>
              <Plus className="size-4" />
              Nueva devolución
            </Button>
          )}
          emptyMessage="No hay devoluciones registradas"
        />
      </div>

      <Modal state={refundFormModal}>
        <Modal.Backdrop>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog>
              <form onSubmit={(event) => { event.preventDefault(); form.submit(); }}>
                <Modal.Header>
                  <Modal.Heading>{form.selected ? 'Editar devolución' : 'Nueva devolución por retiro'}</Modal.Heading>
                  <Modal.CloseTrigger aria-label="Cerrar formulario de devolución" />
                </Modal.Header>
                <Modal.Body className="space-y-4">
                  <Select
                    fullWidth
                    placeholder="Seleccione un socio"
                    selectedKey={form.formData.memberId || null}
                    onSelectionChange={(key) => form.setFormData({ ...form.formData, memberId: String(key) })}
                  >
                    <Label>Socio <span className="text-destructive" aria-hidden="true">*</span></Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {memberOptions.map((option) => (
                          <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                            {option.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <TextField fullWidth>
                    <Label>Motivo del retiro <span className="text-destructive" aria-hidden="true">*</span></Label>
                    <TextArea
                      value={form.formData.reason}
                      onChange={(event) => form.setFormData({ ...form.formData, reason: event.target.value })}
                      placeholder="Retiro voluntario de la cooperativa"
                      rows={3}
                    />
                  </TextField>

                  <TextField fullWidth type="number">
                    <Label>Monto a devolver <span className="text-destructive" aria-hidden="true">*</span></Label>
                    <Input
                      min="0"
                      step="0.01"
                      value={form.formData.amount || ''}
                      onChange={(event) => form.setFormData({ ...form.formData, amount: parseFloat(event.target.value) || 0 })}
                      placeholder="150.00"
                    />
                  </TextField>

                  <DatePicker
                    label="Fecha de depósito"
                    value={form.formData.depositDate}
                    onChange={(value) => form.setFormData({ ...form.formData, depositDate: value })}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="outline" onPress={form.closeForm}>Cancelar</Button>
                  <Button type="submit">{form.selected ? 'Guardar cambios' : 'Registrar devolución'}</Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal state={deleteModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Eliminar devolución</Modal.Heading>
                <Modal.CloseTrigger aria-label="Cerrar confirmación" />
              </Modal.Header>
              <Modal.Body>
                <p>¿Está seguro de que desea eliminar esta devolución de &quot;{form.selected?.memberName ?? ''}&quot;? Esta acción no se puede deshacer.</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={form.closeDelete}>Cancelar</Button>
                <Button variant="danger" onPress={() => { form.confirmDelete(); form.closeDelete(); }}>Eliminar</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
