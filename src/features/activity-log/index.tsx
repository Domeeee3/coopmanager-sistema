import React, { useMemo, useState } from 'react';
import { useApp } from '@/core/store/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { DataTable, Column } from '@/shared/components/data-table';
import { formatDate } from '@/core/lib/formatters';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import {
  Activity,
  UserPlus,
  Edit,
  Trash2,
  DollarSign,
  CreditCard,
  FileText,
  Settings,
  AlertCircle,
  Calendar,
  Clock,
} from 'lucide-react';
import { ActivityLog as ActivityLogEntry } from '@/core/types';

const activityIcons: Record<string, React.ReactNode> = {
  member_add: <UserPlus className="w-4 h-4" />,
  member_edit: <Edit className="w-4 h-4" />,
  member_delete: <Trash2 className="w-4 h-4" />,
  member_inactive: <AlertCircle className="w-4 h-4" />,
  contribution_add: <DollarSign className="w-4 h-4" />,
  contribution_pay: <DollarSign className="w-4 h-4" />,
  contribution_edit: <Edit className="w-4 h-4" />,
  contribution_delete: <Trash2 className="w-4 h-4" />,
  loan_add: <CreditCard className="w-4 h-4" />,
  loan_pay: <DollarSign className="w-4 h-4" />,
  loan_retention_pay: <DollarSign className="w-4 h-4" />,
  loan_refinance: <Edit className="w-4 h-4" />,
  loan_cancel: <Trash2 className="w-4 h-4" />,
  expense_add: <FileText className="w-4 h-4" />,
  expense_delete: <Trash2 className="w-4 h-4" />,
  refund_add: <DollarSign className="w-4 h-4" />,
  refund_edit: <Edit className="w-4 h-4" />,
  refund_delete: <Trash2 className="w-4 h-4" />,
  config_update: <Settings className="w-4 h-4" />,
  cashbox_adjust: <DollarSign className="w-4 h-4" />,
  data_clear: <Trash2 className="w-4 h-4" />,
};

export function ActivityLog() {
  const { activities } = useApp();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const typeOptions = [
    { value: 'all', label: 'Todas las actividades' },
    { value: 'member', label: 'Socios' },
    { value: 'contribution', label: 'Aportes' },
    { value: 'loan', label: 'Préstamos' },
    { value: 'expense', label: 'Gastos' },
    { value: 'refund', label: 'Devoluciones' },
    { value: 'config', label: 'Configuración' },
  ];

  const filteredActivities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesType = filterType === 'all' || activity.type.startsWith(filterType);
      const matchesSearch = !query ||
        activity.description.toLowerCase().includes(query) ||
        activity.details?.toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [activities, filterType, search]);

  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [filteredActivities]);

  const columns: Column<ActivityLogEntry>[] = [
    {
      key: 'operation',
      header: 'Operación',
      width: '42%',
      align: 'left',
      render: (activity) => (
        <div className="flex min-w-0 !justify-start items-center gap-3">
          <span className="shrink-0 text-primary">
            {activityIcons[activity.type] || <Activity className="w-4 h-4" />}
          </span>
          <span className="truncate font-medium text-foreground">{activity.description}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      width: '140px',
      render: (activity) => formatDate(activity.timestamp),
    },
    {
      key: 'time',
      header: 'Hora',
      width: '110px',
      render: (activity) => new Date(activity.timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    },
    {
      key: 'details',
      header: 'Detalles',
      render: (activity) => {
        const parsedDetails = activity.details ? JSON.parse(activity.details) : null;

        return parsedDetails ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:underline">
              Ver detalles técnicos
            </summary>
            <pre className="mt-2 max-w-md overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-2 text-xs text-foreground">
              {JSON.stringify(parsedDetails, null, 2)}
            </pre>
          </details>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Registro de Actividades"
        description="Historial completo de todas las operaciones del sistema"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total de Registros"
          value={activities.length}
          icon={Activity}
          tone="primary"
        />
        <StatCard
          label="Hoy"
          value={activities.filter(a =>
            a.timestamp.startsWith(new Date().toISOString().slice(0, 10))
          ).length}
          icon={Calendar}
          tone="warning"
        />
        <StatCard
          label="Esta Semana"
          value={activities.filter(a => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(a.timestamp) > weekAgo;
          }).length}
          icon={Clock}
          tone="danger"
        />
      </div>

      <DataTable
        data={sortedActivities}
        columns={columns}
        keyExtractor={(activity) => activity.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar actividades..."
        toolbar={(
          <div className="w-full sm:w-60">
            <Select
              value={filterType}
              onValueChange={setFilterType}
              aria-label="Filtrar actividades por tipo"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        emptyMessage="No hay actividades registradas"
      />
    </div>
  );
}

export default ActivityLog;
