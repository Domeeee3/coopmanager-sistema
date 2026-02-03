import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal, { FormModal, ConfirmModal } from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Expense, ExpenseFormData, ExpenseCategory } from '../types';
import { Plus, Trash2, FileText, Receipt, DollarSign, Building, Wrench, Package, MoreHorizontal } from 'lucide-react';

export function Expenses() {
  const { expenses, config, addExpense, deleteExpense, showToast } = useApp();
  const [search, setSearch] = useState('');
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

  // Calcular totales por categoría
  const totalsByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
          <div className={`p-2 rounded-lg ${
            expense.category === 'administrative' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' :
            expense.category === 'maintenance' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
            expense.category === 'services' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
            expense.category === 'supplies' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
            'bg-slate-100 dark:bg-slate-700 text-slate-600'
          }`}>
            {categoryIcons[expense.category]}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{expense.description}</p>
            <p className="text-sm text-slate-500">{categoryLabels[expense.category]}</p>
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
        <span className="font-semibold text-danger-600 dark:text-danger-400">
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
        <span className="text-slate-500 text-sm">{expense.notes}</span>
      ) : (
        <span className="text-slate-300 dark:text-slate-600">-</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '80px',
      render: (expense: Expense) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedExpense(expense);
            setShowDelete(true);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gastos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Registro de gastos administrativos
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenForm()}>
          Nuevo Gasto
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Gastos</p>
              <p className="text-xl font-bold text-danger-600">
                -{formatCurrency(totalExpenses, config.currencyCode)}
              </p>
            </div>
          </div>
        </Card>

        {categoryOptions.slice(0, 2).map((cat) => (
          <Card key={cat.value} variant="glass" padding="md">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                cat.value === 'administrative' ? 'bg-sky-100 dark:bg-sky-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
              }`}>
                {categoryIcons[cat.value as ExpenseCategory]}
              </div>
              <div>
                <p className="text-sm text-slate-500">{cat.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  -{formatCurrency(totalsByCategory[cat.value] || 0, config.currencyCode)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desglose por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Desglose por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categoryOptions.map((cat) => {
              const amount = totalsByCategory[cat.value] || 0;
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={cat.value} className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className={`inline-flex p-2 rounded-lg mb-2 ${
                    cat.value === 'administrative' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' :
                    cat.value === 'maintenance' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                    cat.value === 'services' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                    cat.value === 'supplies' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-600'
                  }`}>
                    {categoryIcons[cat.value as ExpenseCategory]}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {cat.label}
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(amount, config.currencyCode)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card padding="none">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Input
            placeholder="Buscar gastos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Receipt className="w-4 h-4" />}
          />
        </div>
        <Table
          data={expenses.filter(e => {
            if (!search) return true;
            return e.description.toLowerCase().includes(search.toLowerCase()) ||
                   e.category.toLowerCase().includes(search.toLowerCase());
          })}
          columns={columns}
          keyExtractor={(expense) => expense.id}
          onRowClick={(expense) => handleOpenForm(expense)}
          emptyMessage="No hay gastos registrados"
        />
      </Card>

      {/* Modal de formulario */}
      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        title={selectedExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
        submitText={selectedExpense ? 'Guardar Cambios' : 'Registrar Gasto'}
      >
        <div className="space-y-4">
          <Input
            label="Descripción *"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descripción del gasto"
            leftIcon={<FileText className="w-4 h-4" />}
          />
          <Input
            label="Monto *"
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            leftIcon={<DollarSign className="w-4 h-4" />}
          />
          <Select
            label="Categoría"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
            options={categoryOptions}
          />
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
          <Textarea
            label="Notas"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Notas adicionales..."
            rows={3}
          />
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
