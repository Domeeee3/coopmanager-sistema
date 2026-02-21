import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Select from '../components/ui/Select';
import { formatDate } from '../utils/formatters';
import { 
  Activity, 
  UserPlus, 
  Edit, 
  Trash2, 
  DollarSign,
  CreditCard,
  FileText,
  Settings,
  AlertCircle
} from 'lucide-react';
import { ActivityType } from '../types';

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

const activityColors: Record<string, string> = {
  member_add: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  member_edit: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  member_delete: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  member_inactive: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  contribution_add: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  contribution_pay: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  contribution_edit: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  contribution_delete: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  loan_add: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  loan_pay: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
  loan_retention_pay: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  loan_refinance: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  loan_cancel: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  expense_add: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  expense_delete: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  refund_add: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
  refund_edit: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  refund_delete: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
  config_update: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  cashbox_adjust: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  data_clear: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Registro de Actividades
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Historial completo de todas las operaciones del sistema
          </p>
        </div>
        <div className="w-64">
          <Select
            value={filterType}
            onChange={setFilterType}
            options={typeOptions}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="glass" hover padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <Activity className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Registros</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{activities.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="glass" hover padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-xl">
              <DollarSign className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hoy</p>
              <p className="text-2xl font-bold text-success-600">
                {activities.filter(a => 
                  a.timestamp.startsWith(new Date().toISOString().slice(0, 10))
                ).length}
              </p>
            </div>
          </div>
        </Card>
        <Card variant="glass" hover padding="md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-warning-100 dark:bg-warning-900/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Esta Semana</p>
              <p className="text-2xl font-bold text-warning-600">
                {activities.filter(a => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(a.timestamp) > weekAgo;
                }).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de actividades */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Historial de Operaciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedActivities.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No hay actividades registradas</p>
              <p className="text-sm mt-2">Las operaciones aparecerán aquí automáticamente</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedActivities.map((activity) => {
                const parsedDetails = activity.details ? JSON.parse(activity.details) : null;
                
                return (
                  <div key={activity.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl flex-shrink-0 ${activityColors[activity.type] || 'bg-slate-100 text-slate-700'}`}>
                        {activityIcons[activity.type] || <Activity className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-base">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(activity.timestamp)}
                          </span>
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(activity.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {parsedDetails && (
                          <details className="mt-3">
                            <summary className="text-sm text-primary-600 dark:text-primary-400 cursor-pointer hover:underline font-medium">
                              Ver detalles técnicos
                            </summary>
                            <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                              <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap">
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
