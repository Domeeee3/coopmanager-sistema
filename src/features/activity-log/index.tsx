import React, { useMemo, useState } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { formatDate } from '@/core/lib/formatters';
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
  Clock
} from 'lucide-react';
import { ActivityType } from '@/core/types';

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

// three representative colors: green for payments, amber for penalties, rose for expenses
  const categoryColor = {
    payment: 'bg-emerald-100 text-emerald-600',
    penalty: 'bg-amber-100 text-amber-600',
    expense: 'bg-rose-100 text-rose-600',
  };

  const activityColors: Record<string, string> = {
    member_add: categoryColor.payment,
    member_edit: categoryColor.payment,
    member_delete: categoryColor.expense,
    member_inactive: categoryColor.penalty,
    contribution_add: categoryColor.payment,
    contribution_pay: categoryColor.payment,
    contribution_edit: categoryColor.payment,
    contribution_delete: categoryColor.penalty,
    loan_add: categoryColor.payment,
    loan_pay: categoryColor.payment,
    loan_retention_pay: categoryColor.payment,
    loan_refinance: categoryColor.payment,
    loan_cancel: categoryColor.penalty,
    expense_add: categoryColor.expense,
    expense_delete: categoryColor.penalty,
    refund_add: categoryColor.payment,
    refund_edit: categoryColor.payment,
    refund_delete: categoryColor.penalty,
    config_update: categoryColor.payment,
    cashbox_adjust: categoryColor.payment,
    data_clear: categoryColor.penalty,
  };

export function ActivityLog() {
  const { activities } = useApp();
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
    if (filterType === 'all') return activities;
    return activities.filter(a => a.type.startsWith(filterType));
  }, [activities, filterType]);

  const sortedActivities = useMemo(() => {
    return [...filteredActivities].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [filteredActivities]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Registro de Actividades
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial completo de todas las operaciones del sistema
          </p>
        </div>
        <div className="w-64">
          <Select
            value={filterType}
            onValueChange={setFilterType}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-emerald-500 bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <Activity className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold text-foreground dark:text-white">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-500 bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hoy</p>
                <p className="text-2xl font-bold text-foreground dark:text-white">
                  {activities.filter(a =>
                    a.timestamp.startsWith(new Date().toISOString().slice(0, 10))
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-rose-500 bg-white dark:bg-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-100">
                <Clock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold text-foreground dark:text-white">
                  {activities.filter(a => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(a.timestamp) > weekAgo;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de actividades */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Operaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedActivities.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No hay actividades registradas</p>
              <p className="text-sm mt-2">Las operaciones aparecerán aquí automáticamente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedActivities.map((activity) => {
                const parsedDetails = activity.details ? JSON.parse(activity.details) : null;

                return (
                  <div key={activity.id} className="p-4 hover:bg-muted/50 transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-lg shrink-0 ${activityColors[activity.type] || 'bg-muted text-muted-foreground'}`}>
                        {activityIcons[activity.type] || <Activity className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-base">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(activity.timestamp)}
                          </span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(activity.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {parsedDetails && (
                          <details className="mt-3">
                            <summary className="text-sm text-muted-foreground cursor-pointer hover:underline font-medium">
                              Ver detalles técnicos
                            </summary>
                            <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
                              <pre className="text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(parsedDetails, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ActivityLog;
