import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal, { FormModal, ConfirmModal } from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Member, MemberFormData, Refund, RefundFormData } from '../types';
import { Plus, Edit2, Trash2, User, Phone, Calendar, Users, UserX, ArrowLeftCircle } from 'lucide-react';

type TabType = 'members' | 'refunds';

export function Members() {
  const { 
    members, 
    contributions,
    addMember, 
    updateMember, 
    deleteMember, 
    showToast, 
    config,
    refunds,
    addRefund,
    updateRefund,
    deleteRefund
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    phone: '',
    joinDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Estados para devoluciones
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showRefundDelete, setShowRefundDelete] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [refundFormData, setRefundFormData] = useState<RefundFormData>({
    memberId: '',
    reason: '',
    amount: 0,
    depositDate: new Date().toISOString().split('T')[0],
  });

  // Opciones de socios para el select
  const memberOptions = members.map(m => ({ value: m.id, label: m.name }));

  // Sincronizar estado de miembros con devoluciones
  React.useEffect(() => {
    members.forEach(member => {
      const hasRefund = refunds.some(r => r.memberId === member.id);
      if (hasRefund && member.status === 'active') {
        updateMember(member.id, { status: 'inactive' });
      }
    });
  }, [members, refunds, updateMember]);

  // Calcular automáticamente el monto total de aportes pagados al seleccionar socio ($5 por mes)
  React.useEffect(() => {
    try {
      if (refundFormData.memberId) {
        const memberContributions = contributions.filter(c => c.memberId === refundFormData.memberId && c.status === 'paid');
        const totalAmount = memberContributions.reduce((sum, c) => sum + (Number(c.shareAmount || 0) + Number(c.expenseAmount || 0)), 0);
        setRefundFormData(prev => ({ ...prev, amount: totalAmount }));
      } else {
        setRefundFormData(prev => ({ ...prev, amount: 0.00 }));
      }
    } catch (error) {
      console.error('Error calculating refund amount:', error);
      setRefundFormData(prev => ({ ...prev, amount: 0.00 }));
    }
  }, [refundFormData.memberId, contributions]);

  const handleOpenForm = (member?: Member) => {
    if (member) {
      setSelectedMember(member);
      setFormData({
        name: member.name,
        phone: member.phone,
        joinDate: member.joinDate,
        notes: member.notes || '',
      });
    } else {
      setSelectedMember(null);
      setFormData({
        name: '',
        phone: '',
        joinDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedMember(null);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      showToast('error', 'Error de validación', 'Por favor ingrese el nombre del socio.');
      return;
    }

    if (selectedMember) {
      updateMember(selectedMember.id, formData);
    } else {
      addMember(formData);
    }
    handleCloseForm();
  };

  const handleDelete = () => {
    if (selectedMember) {
      deleteMember(selectedMember.id);
      setShowDelete(false);
      setSelectedMember(null);
    }
  };

  // Funciones para devoluciones
  const handleOpenRefundForm = (refund?: Refund) => {
    if (refund) {
      setSelectedRefund(refund);
      setRefundFormData({
        memberId: refund.memberId,
        reason: refund.reason,
        amount: refund.amount,
        depositDate: refund.depositDate,
      });
    } else {
      setSelectedRefund(null);
      setRefundFormData({
        memberId: '',
        reason: '',
        amount: 0,
        depositDate: new Date().toISOString().split('T')[0],
      });
    }
    setShowRefundForm(true);
  };

  const handleCloseRefundForm = () => {
    setShowRefundForm(false);
    setSelectedRefund(null);
  };

  const handleRefundSubmit = () => {
    if (!refundFormData.memberId) {
      showToast('error', 'Error de validación', 'Por favor seleccione un socio.');
      return;
    }
    if (!refundFormData.reason) {
      showToast('error', 'Error de validación', 'Por favor ingrese el motivo.');
      return;
    }
    if (refundFormData.amount <= 0) {
      showToast('error', 'Error de validación', 'El monto debe ser mayor a 0.');
      return;
    }

    if (selectedRefund) {
      updateRefund(selectedRefund.id, refundFormData);
    } else {
      addRefund(refundFormData);
    }
    handleCloseRefundForm();
  };

  const handleRefundDelete = () => {
    if (selectedRefund) {
      deleteRefund(selectedRefund.id);
      setShowRefundDelete(false);
      setSelectedRefund(null);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      render: (member: Member) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
            <p className="text-sm text-slate-500">{member.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (member: Member) => member.phone || '-',
    },
    {
      key: 'joinDate',
      header: 'Fecha Ingreso',
      sortable: true,
      render: (member: Member) => formatDate(member.joinDate),
    },
    {
      key: 'totalContributions',
      header: 'Total Aportes',
      sortable: true,
      align: 'right' as const,
      render: (member: Member) => {
        const totalContributions = (contributions || []).filter(c => c.memberId === member.id && c.status === 'paid').reduce((sum, c) => sum + (Number(c.shareAmount || 0) + Number(c.expenseAmount || 0)), 0);
        const totalRefunds = (refunds || []).filter(r => r.memberId === member.id).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const netContributions = Math.max(0, totalContributions - totalRefunds);
        return formatCurrency(netContributions, config.currencyCode);
      },
    },
    {
      key: 'penalties',
      header: 'Multas',
      sortable: true,
      align: 'right' as const,
      render: (member: Member) => {
        const totalPenalties = (contributions || []).filter(c => c.memberId === member.id && c.status === 'paid').reduce((sum, c) => sum + (Number(c.penaltyAmount) || 0), 0);
        return formatCurrency(totalPenalties, config.currencyCode);
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (member: Member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '120px',
      render: (member: Member) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenForm(member);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {member.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateMember(member.id, { status: 'inactive' });
                showToast('warning', 'Socio retirado', `${member.name} fue marcado como inactivo.`);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors"
              title="Marcar como inactivo"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMember(member);
              setShowDelete(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const refundColumns = [
    {
      key: 'member',
      header: 'Socio',
      render: (refund: Refund) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
            <ArrowLeftCircle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
          </div>
          <span className="font-medium text-slate-900 dark:text-white">
            {refund.memberName}
          </span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (refund: Refund) => refund.reason,
    },
    {
      key: 'amount',
      header: 'Devolución',
      align: 'right' as const,
      render: (refund: Refund) => (
        <span className="font-semibold text-amber-600">
          {formatCurrency(refund.amount, config.currencyCode)}
        </span>
      ),
    },
    {
      key: 'depositDate',
      header: 'Fecha Depósito',
      render: (refund: Refund) => formatDate(refund.depositDate),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '120px',
      render: (refund: Refund) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenRefundForm(refund);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRefund(refund);
              setShowRefundDelete(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título y Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Socios
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestión de miembros de la cooperativa
          </p>
        </div>
        {activeTab === 'members' ? (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenForm()}>
            Nuevo Socio
          </Button>
        ) : (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenRefundForm()}>
            Nueva Devolución
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('members')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${activeTab === 'members' 
              ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}
          `}
        >
          <Users className="w-4 h-4" />
          Socios
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${activeTab === 'refunds' 
              ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}
          `}
        >
          <ArrowLeftCircle className="w-4 h-4" />
          Devoluciones por Retiro
        </button>
      </div>

      {/* Contenido de las tabs */}
      {activeTab === 'members' ? (
        <div className="space-y-8">
          {/* Socios Activos */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Socios Activos</h3>
            <Card padding="none">
              <Table
                data={members.filter(m => m.status === 'active')}
                columns={columns.filter(col => col.key !== 'actions').concat({
                  key: 'actions',
                  header: 'Acciones',
                  width: '80px',
                  render: (member: Member) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenForm(member);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  ),
                })}
                keyExtractor={(member: Member) => member.id}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre o teléfono..."
                onRowClick={(member: Member) => handleOpenForm(member)}
                emptyMessage="No hay socios activos"
              />
            </Card>
          </div>

          {/* Socios Retirados */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Socios Retirados</h3>
            <Card padding="none" className="bg-gray-100">
              <Table
                data={members.filter(m => m.status === 'inactive')}
                columns={columns.filter(col => col.key !== 'actions').concat({
                  key: 'actions',
                  header: 'Acciones',
                  width: '80px',
                  render: (member: Member) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMember(member);
                        setShowDelete(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ),
                })}
                keyExtractor={(member: Member) => member.id}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre o teléfono..."
                onRowClick={(member: Member) => handleOpenForm(member)}
                emptyMessage="No hay socios retirados"
              />
            </Card>
          </div>
        </div>
      ) : (
        <Card padding="none">
          <Table
            data={refunds}
            columns={refundColumns}
            keyExtractor={(refund: Refund) => refund.id}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por nombre o motivo..."
            onRowClick={(refund: Refund) => handleOpenRefundForm(refund)}
            emptyMessage="No hay devoluciones registradas"
          />
        </Card>
      )}

      {/* Modal de formulario de socio */}
      <FormModal
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        title={selectedMember ? 'Editar Socio' : 'Nuevo Socio'}
        submitText={selectedMember ? 'Guardar Cambios' : 'Crear Socio'}
      >
        <div className="space-y-4">
          <Input
            label="Nombre completo *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ingrese el nombre completo"
            leftIcon={<User className="w-4 h-4" />}
          />
          <Input
            label="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="555-123-4567"
            leftIcon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Fecha de ingreso"
            type="date"
            value={formData.joinDate}
            onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales sobre el socio..."
            rows={3}
          />
        </div>
      </FormModal>

      {/* Modal de confirmación de eliminación de socio */}
      <ConfirmModal
        isOpen={showDelete}
        onClose={() => {
          setShowDelete(false);
          setSelectedMember(null);
        }}
        onConfirm={handleDelete}
        title="Confirmar eliminación"
        message={`¿Estás seguro de eliminar este socio?`}
        confirmText="Eliminar"
        variant="danger"
      />

      {/* Modal de formulario de devolución */}
      <FormModal
        isOpen={showRefundForm}
        onClose={handleCloseRefundForm}
        onSubmit={handleRefundSubmit}
        title={selectedRefund ? 'Editar Devolución' : 'Nueva Devolución por Retiro'}
        submitText={selectedRefund ? 'Guardar Cambios' : 'Registrar Devolución'}
      >
        <div className="space-y-4">
          <Select
            label="Socio *"
            value={refundFormData.memberId}
            onChange={(value) => setRefundFormData({ ...refundFormData, memberId: value })}
            options={memberOptions}
            placeholder="Seleccione un socio"
          />
          <Textarea
            label="Motivo del retiro *"
            value={refundFormData.reason}
            onChange={(e) => setRefundFormData({ ...refundFormData, reason: e.target.value })}
            placeholder="Describa el motivo del retiro..."
            rows={3}
          />
          <Input
            label="Monto a devolver *"
            type="number"
            min="0"
            step="0.01"
            value={refundFormData.amount || ''}
            onChange={(e) => setRefundFormData({ ...refundFormData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
          <Input
            label="Fecha de depósito"
            type="date"
            value={refundFormData.depositDate}
            onChange={(e) => setRefundFormData({ ...refundFormData, depositDate: e.target.value })}
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </FormModal>

      {/* Modal de confirmación de eliminación de devolución */}
      <ConfirmModal
        isOpen={showRefundDelete}
        onClose={() => {
          setShowRefundDelete(false);
          setSelectedRefund(null);
        }}
        onConfirm={handleRefundDelete}
        title="Eliminar Devolución"
        message={`¿Está seguro de que desea eliminar esta devolución de "${selectedRefund?.memberName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

export default Members;
