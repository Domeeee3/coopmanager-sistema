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
import { DataTable, Column } from '@/shared/components/data-table';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import { Expense, ExpenseFormData, ExpenseCategory } from '@/core/types';
import { Plus, Trash2, FileText, DollarSign, Building, Wrench, Package, MoreHorizontal } from 'lucide-react';
import { DatePicker } from '@/shared/ui/date-picker';

type CategoryFilter = 'all' | ExpenseCategory;

export function Expenses() {
  const { expenses, config, addExpense, deleteExpense, showToast } = useApp();
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

  const categoryColors: Record<ExpenseCategory, { bg: string; icon: string }> = {
    administrative: { bg: 'bg-orange-100', icon: 'text-orange-700' },
    maintenance: { bg: 'bg-red-100', icon: 'text-red-700' },
    services: { bg: 'bg-cyan-100', icon: 'text-cyan-700' },
    supplies: { bg: 'bg-orange-100', icon: 'text-orange-700' },
    other: { bg: 'bg-gray-100', icon: 'text-gray-700' },
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
  const filterButtons: { label: string; value: CategoryFilter; amount: number }[] = [
    { label: 'Todos', value: 'all', amount: totalExpenses },
    ...categoryOptions.map(c => ({
      label: c.label,
      value: c.value as CategoryFilter,
      amount: totalsByCategory[c.value] || 0,
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

    addExpense(formData);
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
      render: (expense: Expense) => (
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${categoryColors[expense.category].bg}`}>
            <div className={categoryColors[expense.category].icon}>
              {categoryIcons[expense.category]}
            </div>
          </div>
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
      width: '80px',
      render: (expense: Expense) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedExpense(expense);
            setShowDelete(true);
          }}
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-rose-100">
            <FileText className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gastos</h1>
            <p className="text-muted-foreground mt-1">Registro de gastos administrativos</p>
          </div>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="col-span-2 sm:col-span-3 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-destructive">
              -{formatCurrency(totalExpenses, config.currencyCode)}
            </p>
          </CardContent>
        </Card>
        {categoryOptions.map((c) => (
          <Card key={c.value}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-muted-foreground">{categoryIcons[c.value as ExpenseCategory]}</span>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(totalsByCategory[c.value] || 0, config.currencyCode)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros por categoría */}
      <div className="flex flex-wrap items-center gap-1 bg-muted rounded-lg p-1">
        {filterButtons.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategoryFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              categoryFilter === f.value
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        data={filteredExpenses}
        columns={columns}
        keyExtractor={(expense: Expense) => expense.id}
        onRowClick={(expense: Expense) => handleOpenForm(expense)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar gastos..."
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
            <Label>Descripción *</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del gasto"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Monto *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
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
          <div className="space-y-2">
            <Label>Fecha</Label>
            <DatePicker
              value={formData.date}
              onChange={(value) => setFormData({ ...formData, date: value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
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
