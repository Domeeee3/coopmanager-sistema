import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { formatCurrency, formatPercentage } from '../utils/formatters';
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

    // Calcular tasa de morosidad
    const lateLoans = loans.filter(l => {
      if (l.status !== 'active') return false;
      const lastPaid = l.paidInstallments;
      const expectedPaid = Math.floor((Date.now() - new Date(l.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000));
      return lastPaid < expectedPaid;
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

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  // Tarjetas de estadísticas
  const statCards = [
    {
      title: 'Caja Disponible',
      value: stats.availableCash,
      icon: Wallet,
      color: 'primary',
      trend: stats.availableCash >= 0 ? 'up' : 'down',
      alert: stats.availableCash < 0,
    },
    {
      title: 'Total Socios',
      value: stats.activeMembers,
      subtitle: `${stats.totalMembers} total`,
      icon: Users,
      color: 'success',
    },
    {
      title: 'Préstamos Activos',
      value: stats.activeLoans,
      subtitle: formatCurrency(stats.totalLoaned),
      icon: CreditCard,
      color: 'warning',
    },
    {
      title: 'Aportes Totales',
      value: stats.totalContributions,
      subtitle: `${formatCurrency(stats.totalPenalties)} en multas recaudadas`,
      icon: PiggyBank,
      color: 'primary',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Resumen general de la cooperativa
        </p>
      </div>

      {/* Alerta de caja negativa */}
      {stats.availableCash < 0 && (
        <Card variant="elevated" className="border-l-4 border-l-danger-500 bg-danger-50 dark:bg-danger-900/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-danger-100 dark:bg-danger-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400" />
            </div>
            <div>
              <h3 className="font-medium text-danger-800 dark:text-danger-300">
                Caja Negativa
              </h3>
              <p className="text-sm text-danger-600 dark:text-danger-400">
                La caja disponible es de {formatCurrency(stats.availableCash)}. No se recomienda aprobar nuevos préstamos hasta normalizar la situación.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Alerta de retenciones pendientes */}
      {stats.pendingRetentions.length > 0 && (
        <Card variant="elevated" className="border-l-4 border-l-warning-500 bg-amber-50 dark:bg-amber-900/10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-warning-800 dark:text-warning-300">
                Retenciones Pendientes ({stats.pendingRetentions.length})
              </h3>
              <p className="text-sm text-warning-600 dark:text-warning-400 mb-3">
                Total por cobrar: {formatCurrency(stats.totalRetentionsPending)}
              </p>
              <div className="space-y-2">
                {stats.pendingRetentions.map(loan => (
                  <div key={loan.id} className={`flex items-center justify-between p-3 ${stats.pendingRetentions.length === 1 ? '' : 'bg-amber-100 dark:bg-amber-800/50 rounded-lg border border-amber-200 dark:border-amber-700 shadow-sm'}`}>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{loan.memberName}</p>
                      <p className="text-sm text-slate-500">
                        Préstamo de {formatCurrency(loan.amount)} - Retención: {formatCurrency(loan.retentionAmount)}
                      </p>
                    </div>
                    <button
                      onClick={() => payRetention(loan.id)}
                      className="px-3 py-1 bg-warning-500 hover:bg-warning-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Cobrar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} variant="glass" hover padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.title}
                </p>
                {typeof stat.value === 'number' ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stat.title.includes('Caja') || stat.title.includes('Aportes')
                      ? formatCurrency(stat.value)
                      : stat.value.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                )}
                {stat.subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {stat.subtitle}
                  </p>
                )}
                {stat.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-success-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-danger-500" />
                    )}
                    <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-success-600' : 'text-danger-600'}`}>
                      {stat.trend === 'up' ? 'Positivo' : 'Negativo'}
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
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
                      <rect width="10" height="10" fill="#10b981" opacity="0.4"/>
                      <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke="#10b981" strokeWidth="1" opacity="0.6"/>
                    </pattern>
                    <pattern id="diagonalStripesExpenses" patternUnits="userSpaceOnUse" width="10" height="10">
                      <rect width="10" height="10" fill="#ef4444" opacity="0.4"/>
                      <path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke="#ef4444" strokeWidth="1" opacity="0.6"/>
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Ingresos' : 'Gastos']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    fill="url(#diagonalStripesIncome)"
                    strokeWidth={2}
                    name="Ingresos"
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    fillOpacity={1}
                    connectNulls={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    fill="url(#diagonalStripesExpenses)"
                    strokeWidth={2}
                    name="Gastos"
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                    fillOpacity={1}
                    connectNulls={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Tasa de Morosidad
              </p>
              <p className={`text-3xl font-bold ${stats.delinquencyRate > 10 ? 'text-danger-600' : 'text-success-600'}`}>
                {formatPercentage(stats.delinquencyRate)}
              </p>
            </div>
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Préstamos Activos
              </p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {stats.activeLoans}
              </p>
            </div>
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Préstamos en Mora
              </p>
              <p className={`text-3xl font-bold ${stats.lateLoans > 0 ? 'text-danger-600' : 'text-success-600'}`}>
                {stats.lateLoans}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
