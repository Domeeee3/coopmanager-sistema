import React, { useMemo, useCallback } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatPercentage } from '@/core/lib/formatters';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export function Dashboard() {
  const {
    members,
    loans,
    contributions,
    expenses,
    transactions,
    refunds,
    calculateAvailableCash,
    config,
    payRetention
  } = useApp();

  // Calcular estadísticas
  const stats = useMemo(() => {
    const activeMembers = (members || []).filter(m => m.status === 'active').length;
    const activeLoans = (loans || []).filter(l => l.status === 'active').length;
    const totalLoaned = (loans || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const totalContributions = (contributions || []).filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0) - (refunds || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const totalInterest = (loans || []).reduce((sum, l) => sum + ((Number(l.totalInterest) || 0) * ((l.paidInstallments || 0) / (l.totalInstallments || 1))), 0);
    const totalPenalties = (contributions || []).filter(c => c.status === 'paid').reduce((sum, c) => sum + (Number(c.penaltyAmount) || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const availableCash = calculateAvailableCash();

    // Retenciones pendientes
    const pendingRetentions = loans.filter(l => l.status === 'pending_retention');
    const totalRetentionsPending = pendingRetentions.reduce((sum, l) => sum + l.retentionAmount, 0);

    // Calcular morosidad: préstamos activos con al menos una cuota vencida sin pagar
    // Una cuota está vencida si su dueDate ya pasó el día límite de pago
    const loanPaymentDueDay = config?.loanPaymentDueDay ?? 18;
    const today = new Date();
    const lateLoans = (loans || []).filter(l => {
      if (l.status !== 'active') return false;
      if (!l.schedule || l.schedule.length === 0) return false;
      return l.schedule.some(entry => {
        if (entry.status !== 'pending') return false;
        const due = new Date(entry.dueDate);
        const deadlineDate = new Date(due.getFullYear(), due.getMonth(), loanPaymentDueDay);
        return today > deadlineDate;
      });
    }).length;
    const delinquencyRate = activeLoans > 0 ? (lateLoans / activeLoans) * 100 : 0;

    return {
      totalMembers: activeMembers,
      activeMembers,
      activeLoans,
      totalLoaned,
      totalContributions,
      totalInterest,
      totalPenalties,
      totalExpenses,
      availableCash,
      delinquencyRate,
      lateLoans,
      pendingRetentions,
      totalRetentionsPending,
    };
  }, [members, loans, contributions, expenses, calculateAvailableCash]);

  // Datos para gráfico de flujo de caja basado en transacciones reales
  const cashFlowData = useMemo(() => {
    if (transactions.length === 0) return [];

    // Agrupar transacciones por mes
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = date.toISOString().slice(0, 7);
      const monthLabel = date.toLocaleDateString('es-ES', { month: 'short' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      if (t.amount > 0) {
        monthlyData[monthKey].income += t.amount;
      } else {
        monthlyData[monthKey].expenses += Math.abs(t.amount);
      }
    });

    // Ordenar por mes y tomar los últimos 6 meses
    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

    return [
      { name: 'Nov', income: 0, expenses: 0 },
      ...sortedMonths.map(monthKey => {
        const date = new Date(monthKey + '-01');
        return {
          name: date.toLocaleDateString('es-ES', { month: 'short' }).charAt(0).toUpperCase() +
            date.toLocaleDateString('es-ES', { month: 'short' }).slice(1),
          income: monthlyData[monthKey].income,
          expenses: monthlyData[monthKey].expenses,
        };
      }),
      { name: 'Ene', income: 0, expenses: 0 }
    ];
  }, [transactions]);

  // Datos para gráfico de distribución de préstamos
  const loanDistribution = useMemo(() => {
    const ranges = [
      { name: '$0-$500', value: loans.filter(l => l.amount <= 500).length },
      { name: '$501-$1000', value: loans.filter(l => l.amount > 500 && l.amount <= 1000).length },
      { name: '$1001-$2000', value: loans.filter(l => l.amount > 1000 && l.amount <= 2000).length },
      { name: '$2000+', value: loans.filter(l => l.amount > 2000).length },
    ];
    return ranges.filter(r => r.value > 0);
  }, [loans]);

  const getCSSVar = useCallback((name: string) => 
    getComputedStyle(document.documentElement).getPropertyValue(name).trim(), []);
  
  const COLORS = useMemo(() => {
    const arr = [
      getCSSVar('--chart-1'),
      getCSSVar('--chart-2'),
      getCSSVar('--chart-3'),
      getCSSVar('--chart-4'),
    ];
    // replace default grey slice with vibrant purple
    if (arr.length > 0) arr[0] = '#8b5cf6';
    return arr;
  }, [getCSSVar]);

  const isDark = useMemo(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'), []);

  const successColor = useMemo(() => getCSSVar('--success'), [getCSSVar]);
  const destructiveColor = useMemo(() => getCSSVar('--destructive'), [getCSSVar]);
  const mutedForegroundColor = useMemo(() => getCSSVar('--muted-foreground'), [getCSSVar]);
  const borderColor = useMemo(() => getCSSVar('--border'), [getCSSVar]);
  const foregroundColor = useMemo(() => getCSSVar('--foreground'), [getCSSVar]);

  // Tarjetas de estadísticas
  const statCards = [
    {
      title: 'Caja Disponible',
      value: stats.availableCash,
      icon: Wallet,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: stats.availableCash >= 0 ? 'up' : 'down',
      alert: stats.availableCash < 0,
    },
    {
      title: 'Total Socios',
      value: stats.activeMembers,
      subtitle: `${stats.totalMembers} total`,
      icon: Users,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Préstamos Activos',
      value: stats.activeLoans,
      subtitle: formatCurrency(stats.totalLoaned),
      icon: CreditCard,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Aportes Totales',
      value: stats.totalContributions,
      subtitle: `${formatCurrency(stats.totalPenalties)} en multas recaudadas`,
      icon: PiggyBank,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen general de la cooperativa
          </p>
        </div>
      </div>

      {/* Alerta de caja negativa */}
      {stats.availableCash < 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Caja Negativa</AlertTitle>
          <AlertDescription>
            La caja disponible es de {formatCurrency(stats.availableCash)}. No se recomienda aprobar nuevos préstamos hasta normalizar la situación.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de retenciones pendientes */}
      {stats.pendingRetentions.length > 0 && (
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertTitle>Retenciones Pendientes ({stats.pendingRetentions.length})</AlertTitle>
          <AlertDescription>
            <p className="mb-3">Total por cobrar: {formatCurrency(stats.totalRetentionsPending)}</p>
            <div className="space-y-2">
              {stats.pendingRetentions.map(loan => (
                <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-foreground">{loan.memberName}</p>
                    <p className="text-sm text-muted-foreground">
                      Préstamo de {formatCurrency(loan.amount)} — Retención: {formatCurrency(loan.retentionAmount)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => payRetention(loan.id)}>
                    Cobrar
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="shadow-sm border border-slate-100 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`${stat.iconBg} p-2.5 rounded-lg`}> 
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {typeof stat.value === 'number'
                      ? (stat.title.includes('Caja') || stat.title.includes('Aportes')
                        ? formatCurrency(stat.value)
                        : stat.value.toLocaleString())
                      : stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className="text-xs text-slate-500">
                      {stat.subtitle}
                    </p>
                  )}
                  {stat.trend && (
                    <div className="flex items-center gap-1 pt-1">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                        {stat.trend === 'up' ? 'Positivo' : 'Negativo'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flujo de caja */}
        <Card>
          <CardHeader>
            <CardTitle>Flujo de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData}>
                    <defs>
                      <pattern id="diagonalStripesIncome" patternUnits="userSpaceOnUse" width="10" height="10">
                        <rect width="10" height="10" fill={successColor} opacity="0.4" />
                        <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke={successColor} strokeWidth="1" opacity="0.6" />
                      </pattern>
                      <pattern id="diagonalStripesExpenses" patternUnits="userSpaceOnUse" width="10" height="10">
                        <rect width="10" height="10" fill={destructiveColor} opacity="0.4" />
                        <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke={destructiveColor} strokeWidth="1" opacity="0.6" />
                      </pattern>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                    <XAxis dataKey="name" stroke={mutedForegroundColor} fontSize={12} />
                    <YAxis stroke={mutedForegroundColor} fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-popover)',
                        color: 'var(--color-popover-foreground)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Ingresos' : 'Gastos']}
                      labelStyle={{ color: foregroundColor }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke={successColor}
                      fill="url(#diagonalStripesIncome)"
                      strokeWidth={2}
                      name="Ingresos"
                      dot={{ fill: successColor, strokeWidth: 2, r: 3 }}
                      fillOpacity={isDark ? 0.95 : 1}
                      strokeOpacity={isDark ? 0.95 : 1}
                      connectNulls={true}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke={destructiveColor}
                      fill="url(#diagonalStripesExpenses)"
                      strokeWidth={2}
                      name="Gastos"
                      dot={{ fill: destructiveColor, strokeWidth: 2, r: 3 }}
                      fillOpacity={isDark ? 0.95 : 1}
                      strokeOpacity={isDark ? 0.95 : 1}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                No hay transacciones registradas
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución de préstamos */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Préstamos</CardTitle>
          </CardHeader>
          <CardContent>
            {loanDistribution.length > 0 ? (
              <div className="h-72 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={loanDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {loanDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={isDark ? 0.9 : 1} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-popover)',
                        color: 'var(--color-popover-foreground)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                No hay préstamos registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de morosidad */}
      <Card>
        <CardHeader>
          <CardTitle>Indicadores de Morosidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="shadow-sm border border-slate-100 bg-white dark:bg-slate-800">
              <CardContent className="pt-6 text-center text-slate-900 dark:text-white">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Tasa de Morosidad
                </p>
                <p className={`text-3xl font-bold ${stats.delinquencyRate > 10 ? 'text-destructive' : ''}`}>
                  {formatPercentage(stats.delinquencyRate)}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-slate-100 bg-white dark:bg-slate-800">
              <CardContent className="pt-6 text-center text-slate-900 dark:text-white">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Préstamos Activos
                </p>
                <p className="text-3xl font-bold">
                  {stats.activeLoans}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border border-slate-100 bg-white dark:bg-slate-800">
              <CardContent className="pt-6 text-center text-slate-900 dark:text-white">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                  Préstamos en Mora
                </p>
                <p className={`text-3xl font-bold ${stats.lateLoans > 0 ? 'text-rose-600' : ''}`}>
                  {stats.lateLoans}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
