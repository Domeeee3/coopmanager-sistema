import { useCallback, useMemo, useState } from 'react';
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
import { useMemberForm } from './hooks/useMemberForm';
import { getMemberBaseColumns, getUnifiedActionsColumn } from './columns';
import { MemberPhotoField } from './MemberPhotoField';
import { User, Phone, Plus, Users, UserMinus, PiggyBank } from 'lucide-react';
import { Member } from '@/core/types';

type StatusFilter = 'all' | 'active' | 'inactive';

export function MembersTab() {
  const { members, contributions, refunds, config } = useApp();
  const form = useMemberForm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [showInactivateConfirm, setShowInactivateConfirm] = useState(false);
  const [memberToInactivate, setMemberToInactivate] = useState<Member | null>(null);

  const memberFormModal = useOverlayState({
    isOpen: form.showForm,
    onOpenChange: (isOpen) => {
      if (!isOpen) form.closeForm();
    },
  });
  const inactivateModal = useOverlayState({
    isOpen: showInactivateConfirm,
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        setShowInactivateConfirm(false);
        setMemberToInactivate(null);
      }
    },
  });

  const handleInactivateRequest = useCallback((member: Member) => {
    setMemberToInactivate(member);
    setShowInactivateConfirm(true);
  }, []);

  const confirmInactivate = useCallback(() => {
    if (memberToInactivate) {
      form.markInactive(memberToInactivate);
      setShowInactivateConfirm(false);
      setMemberToInactivate(null);
    }
  }, [memberToInactivate, form.markInactive]);

  const baseColumns = useMemo(
    () => getMemberBaseColumns({ contributions, refunds, currencyCode: config.currencyCode }),
    [contributions, refunds, config.currencyCode]
  );

  const columns = useMemo(
    () => [
      ...baseColumns,
      getUnifiedActionsColumn({
        onEdit: form.openEdit,
        onInactivate: handleInactivateRequest,
        onRestore: form.restoreMember,
      }),
    ],
    [baseColumns, form.openEdit, handleInactivateRequest, form.restoreMember]
  );

  const activeCount = useMemo(() => members.filter(m => m.status === 'active').length, [members]);
  const inactiveCount = useMemo(() => members.filter(m => m.status === 'inactive').length, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.phone.includes(search);
      }
      return true;
    });
  }, [members, statusFilter, search]);

  const filterButtons: { label: string; value: StatusFilter; count: number }[] = [
    { label: 'Todos', value: 'all', count: members.length },
    { label: 'Activos', value: 'active', count: activeCount },
    { label: 'Retirados', value: 'inactive', count: inactiveCount },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Socios activos"
            value={activeCount}
            icon={Users}
            tone="primary"
          />
          <StatCard
            label="Socios retirados"
            value={inactiveCount}
            icon={UserMinus}
            tone="warning"
          />
          <StatCard
            label="Total de socios"
            value={members.length}
            icon={PiggyBank}
            tone="success"
          />
        </div>

        <DataTable
          data={filteredMembers}
          columns={columns}
          keyExtractor={(member) => member.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o teléfono..."
          toolbar={(
            <>
              <Select
                className="w-full sm:w-52"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                aria-label="Filtrar socios por estado"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {filterButtons.map((filter) => (
                      <ListBox.Item key={filter.value} id={filter.value} textValue={filter.label}>
                        {filter.label} ({filter.count})
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Button className="sm:ml-auto" onPress={form.openCreate}>
                <Plus className="size-4" />
                Nuevo socio
              </Button>
            </>
          )}
          emptyMessage={
            statusFilter === 'active'
              ? 'No hay socios activos'
              : statusFilter === 'inactive'
                ? 'No hay socios retirados'
                : 'No hay socios registrados'
          }
        />
      </div>

      <Modal state={memberFormModal}>
        <Modal.Backdrop>
          <Modal.Container size="md" scroll="inside">
            <Modal.Dialog>
              <form onSubmit={(event) => { event.preventDefault(); void form.submit(); }}>
                <Modal.Header>
                  <Modal.Heading>{form.selected ? 'Editar socio' : 'Nuevo socio'}</Modal.Heading>
                  <Modal.CloseTrigger aria-label="Cerrar formulario de socio" />
                </Modal.Header>
                <Modal.Body className="space-y-4">
                  <MemberPhotoField
                    name={form.formData.name}
                    photo={form.formData.profilePhoto}
                    previewDataUrl={form.photoDataUrl}
                    onSelect={form.setPhotoDataUrl}
                    onRemove={form.clearProfilePhoto}
                  />

                  <TextField fullWidth>
                    <Label>Nombre completo <span className="text-destructive" aria-hidden="true">*</span></Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={form.formData.name}
                        onChange={(event) => form.setFormData({ ...form.formData, name: event.target.value })}
                        placeholder="María Fernanda López"
                      />
                    </div>
                  </TextField>

                  <TextField fullWidth>
                    <Label>Teléfono</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={form.formData.phone}
                        onChange={(event) => form.setFormData({ ...form.formData, phone: event.target.value })}
                        placeholder="0987654321"
                      />
                    </div>
                  </TextField>

                  <DatePicker
                    label="Fecha de ingreso"
                    value={form.formData.joinDate}
                    onChange={(value) => form.setFormData({ ...form.formData, joinDate: value })}
                  />

                  <TextField fullWidth>
                    <Label>Notas</Label>
                    <TextArea
                      value={form.formData.notes}
                      onChange={(event) => form.setFormData({ ...form.formData, notes: event.target.value })}
                      placeholder="Ej.: Tesorera de la cooperativa."
                      rows={3}
                    />
                  </TextField>
                </Modal.Body>
                <Modal.Footer>
                  <Button type="button" variant="outline" onPress={form.closeForm}>Cancelar</Button>
                  <Button type="submit">{form.selected ? 'Guardar cambios' : 'Crear socio'}</Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>


      <Modal state={inactivateModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Confirmar retiro de socio</Modal.Heading>
                <Modal.CloseTrigger aria-label="Cerrar confirmación" />
              </Modal.Header>
              <Modal.Body>
                <p>¿Estás seguro de marcar a &quot;{memberToInactivate?.name ?? ''}&quot; como retirado?</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="outline" onPress={() => { setShowInactivateConfirm(false); setMemberToInactivate(null); }}>Cancelar</Button>
                <Button variant="primary" onPress={confirmInactivate}>Retirar socio</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
