import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
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
import { DataTable, Column } from '@/shared/components/data-table';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { TableActionButton } from '@/shared/components/TableActionButton';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import { Expense, ExpenseFormData, ExpenseCategory } from '@/core/types';
import { Plus, Trash2, Edit2, FileText, DollarSign, Building, Wrench, Package, MoreHorizontal } from 'lucide-react';
import { DatePicker } from '@/shared/ui/date-picker';
import { ListBox, Select as HeroSelect } from '@heroui/react';

type CategoryFilter = 'all' | ExpenseCategory;

export function Expenses() {
  const { expenses, config, addExpense, updateExpense, deleteExpense, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState<ExpenseFormData>({
    description: '',
    amount: 0,
    category: 'administrative',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const categoryOptions = [
    { value: 'administrative', label: 'Administrativo' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'services', label: 'Servicios' },
    { value: 'supplies', label: 'Suministros' },
    { value: 'other', label: 'Otro' },
  ];

  const categoryIcons: Record<ExpenseCategory, React.ReactNode> = {
    administrative: <FileText className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />,
    services: <Building className="w-4 h-4" />,
    supplies: <Package className="w-4 h-4" />,
    other: <MoreHorizontal className="w-4 h-4" />,
  };

  const categoryLabels: Record<ExpenseCategory, string> = {
    administrative: 'Administrativo',
    maintenance: 'Mantenimiento',
    services: 'Servicios',
    supplies: 'Suministros',
    other: 'Otro',
  };

  const categoryTones: Record<ExpenseCategory, "primary" | "warning" | "danger" | "default"> = {
    administrative: "warning",
    maintenance: "danger",
    services: "primary",
    supplies: "warning",
    other: "default",
  };

  const categoryStatIcons = {
    administrative: FileText,
    maintenance: Wrench,
    services: Building,
    supplies: Package,
    other: MoreHorizontal,
  };

  // Totales
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalsByCategory = useMemo(() => expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>), [expenses]);

  // Filtros combinados
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [expenses, categoryFilter, search]);

  // Filter pills data
  const filterButtons: { label: string; value: CategoryFilter }[] = [
    { label: 'Todos', value: 'all' },
    ...categoryOptions.map(c => ({
      label: c.label,
      value: c.value as CategoryFilter,
    })),
  ];

  const handleOpenForm = (expense?: Expense) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        notes: expense.notes || '',
      });
    } else {
      setSelectedExpense(null);
      setFormData({
        description: '',
        amount: 0,
        category: 'administrative',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.description || formData.amount <= 0) {
      showToast('error', 'Error de validación', 'Por favor complete los campos obligatorios.');
      return;
    }

    if (selectedExpense) updateExpense(selectedExpense.id, formData);
    else addExpense(formData);
    setShowForm(false);
  };

  const handleDelete = () => {
    if (selectedExpense) {
      deleteExpense(selectedExpense.id);
      setShowDelete(false);
      setSelectedExpense(null);
    }
  };

  const columns = [
    {
      key: 'description',
      header: 'Descripción',
      sortable: true,
      align: "left" as const,
      render: (expense: Expense) => (
        <div className="flex !justify-start items-center gap-3">
          <span className="text-primary">
            {categoryIcons[expense.category]}
          </span>
          <div>
            <p className="font-medium text-foreground">{expense.description}</p>
            <p className="text-sm text-muted-foreground">{categoryLabels[expense.category]}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      sortable: true,
      align: 'right' as const,
      render: (expense: Expense) => (
        <span className="font-semibold text-destructive">
          -{formatCurrency(expense.amount, config.currencyCode)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      sortable: true,
      render: (expense: Expense) => formatDate(expense.date),
    },
    {
      key: 'notes',
      header: 'Notas',
      render: (expense: Expense) => expense.notes ? (
        <span className="text-muted-foreground text-sm">{expense.notes}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '100px',
      render: (expense: Expense) => (
        <div className="flex items-center gap-1">
          <TableActionButton label="Editar gasto" icon={Edit2} onPress={() => handleOpenForm(expense)} />
          <TableActionButton label="Eliminar gasto" icon={Trash2} tone="danger" onPress={() => { setSelectedExpense(expense); setShowDelete(true); }} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gastos"
        description="Registro de gastos administrativos"
        actions={
          <Button onClick={() => handleOpenForm()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Gasto
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          className="col-span-2 sm:col-span-3 lg:col-span-1"
          label="Total"
          value={<>-{formatCurrency(totalExpenses, config.currencyCode)}</>}
          icon={DollarSign}
          tone="danger"
        />
        {categoryOptions.map((category) => {
          const expenseCategory = category.value as ExpenseCategory;

          return (
            <StatCard
              key={category.value}
              label={category.label}
              value={formatCurrency(totalsByCategory[category.value] || 0, config.currencyCode)}
              icon={categoryStatIcons[expenseCategory]}
              tone={categoryTones[expenseCategory]}
            />
          );
        })}
      </div>

      <DataTable
        data={filteredExpenses}
        columns={columns}
        keyExtractor={(expense: Expense) => expense.id}
        onRowClick={(expense: Expense) => handleOpenForm(expense)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar gastos..."
        toolbar={(
          <HeroSelect
            className="w-full sm:w-60"
            value={categoryFilter}
            onChange={(value) => setCategoryFilter(value as CategoryFilter)}
            aria-label="Filtrar gastos por categoría"
          >
            <HeroSelect.Trigger>
              <HeroSelect.Value />
              <HeroSelect.Indicator />
            </HeroSelect.Trigger>
            <HeroSelect.Popover>
              <ListBox>
                {filterButtons.map((filter) => (
                  <ListBox.Item key={filter.value} id={filter.value} textValue={filter.label}>
                    {filter.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </HeroSelect.Popover>
          </HeroSelect>
        )}
        emptyMessage={
          categoryFilter !== 'all'
            ? `No hay gastos en ${categoryLabels[categoryFilter as ExpenseCategory]}`
            : 'No hay gastos registrados'
        }
      />

      {/* Modal de formulario */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        title={selectedExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
        submitText={selectedExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descripción <span className="text-destructive" aria-hidden="true">*</span></Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Compra de suministros de oficina"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Monto <span className="text-destructive" aria-hidden="true">*</span></Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="25.00"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DatePicker
            label="Fecha"
            value={formData.date}
            onChange={(value) => setFormData({ ...formData, date: value })}
          />
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Factura 001-001-000123456"
              rows={3}
            />
          </div>
        </div>
      </FormModal>

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={showDelete}
        onClose={() => {
          setShowDelete(false);
          setSelectedExpense(null);
        }}
        onConfirm={handleDelete}
        title="Eliminar Gasto"
        message={`¿Está seguro de que desea eliminar "${selectedExpense?.description}" por ${formatCurrency(selectedExpense?.amount || 0, config.currencyCode)}?`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

export default Expenses;
