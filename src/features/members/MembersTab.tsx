import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { FormModal, ConfirmModal } from '@/shared/components/custom-modal';
import { DataTable } from '@/shared/components/data-table';
import { formatCurrency } from '@/core/lib/formatters';
import { useMemberForm } from './hooks/useMemberForm';
import { getMemberBaseColumns, getUnifiedActionsColumn } from './columns';
import { User, Phone, Plus, Users, UserMinus, PiggyBank, Search, Filter } from 'lucide-react';
import { DatePicker } from '@/shared/ui/date-picker';
import { Member } from '@/core/types';

type StatusFilter = 'all' | 'active' | 'inactive';

export function MembersTab() {
  const { members, contributions, refunds, config } = useApp();
  const form = useMemberForm();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Confirmación para inactivar
  const [showInactivateConfirm, setShowInactivateConfirm] = useState(false);
  const [memberToInactivate, setMemberToInactivate] = useState<Member | null>(null);

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

  // Columnas unificadas
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
        onDelete: form.openDelete,
      }),
    ],
    [baseColumns, form.openEdit, handleInactivateRequest, form.openDelete]
  );

  // Conteos
  const activeCount = useMemo(() => members.filter(m => m.status === 'active').length, [members]);
  const inactiveCount = useMemo(() => members.filter(m => m.status === 'inactive').length, [members]);

  // Filtro combinado: status + búsqueda
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      // Search filter
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
        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Socios Activos</p>
                  <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <UserMinus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Socios Retirados</p>
                  <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-muted">
                  <PiggyBank className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Socios</p>
                  <p className="text-2xl font-bold text-foreground">{members.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar: filtros + búsqueda + botón nuevo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Status filter pills */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {filterButtons.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-xs opacity-70">({f.count})</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <Button size="sm" onClick={form.openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Socio
          </Button>
        </div>

        {/* Tabla unificada */}
        <DataTable
          data={filteredMembers}
          columns={columns}
          keyExtractor={(m) => m.id}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o teléfono..."
          emptyMessage={
            statusFilter === 'active'
              ? 'No hay socios activos'
              : statusFilter === 'inactive'
              ? 'No hay socios retirados'
              : 'No hay socios registrados'
          }
        />
      </div>

      {/* Modal de formulario */}
      <FormModal
        isOpen={form.showForm}
        onClose={form.closeForm}
        onSubmit={form.submit}
        title={form.selected ? 'Editar Socio' : 'Nuevo Socio'}
        submitText={form.selected ? 'Guardar Cambios' : 'Crear Socio'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.formData.name}
                onChange={(e) => form.setFormData({ ...form.formData, name: e.target.value })}
                placeholder="Ingrese el nombre completo"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={form.formData.phone}
                onChange={(e) => form.setFormData({ ...form.formData, phone: e.target.value })}
                placeholder="555-123-4567"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha de ingreso</Label>
            <DatePicker
              value={form.formData.joinDate}
              onChange={(value) => form.setFormData({ ...form.formData, joinDate: value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={form.formData.notes}
              onChange={(e) => form.setFormData({ ...form.formData, notes: e.target.value })}
              placeholder="Notas adicionales sobre el socio..."
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={form.showDelete}
        onClose={form.closeDelete}
        onConfirm={form.confirmDelete}
        title="Confirmar eliminación"
        message={`¿Estás seguro de eliminar a "${form.selected?.name ?? ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Confirmación de inactivar/retirar */}
      <ConfirmModal
        isOpen={showInactivateConfirm}
        onClose={() => { setShowInactivateConfirm(false); setMemberToInactivate(null); }}
        onConfirm={confirmInactivate}
        title="Confirmar retiro de socio"
        message={`¿Estás seguro de marcar a "${memberToInactivate?.name ?? ''}" como retirado?`}
        confirmText="Retirar Socio"
        variant="warning"
      />
    </>
  );
}
