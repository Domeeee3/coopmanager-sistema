import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  FileText, 
  DollarSign, 
  Percent, 
  CreditCard, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  Download,
  UserMinus
} from 'lucide-react';

type ReportType = 'contributions' | 'expenses' | 'loan_retention' | 'loan_collection' | 'penalties' | 'refunds';

interface ReportOption {
  value: ReportType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const reportOptions: ReportOption[] = [
  { 
    value: 'contributions', 
    label: 'Aporte Mensual', 
    icon: <DollarSign className="w-5 h-5" />,
    description: 'Aportes de capital realizados por los socios'
  },
  { 
    value: 'expenses', 
    label: 'Gastos y Comisiones', 
    icon: <FileText className="w-5 h-5" />,
    description: 'Aportes para gastos administrativos y comisiones'
  },
  { 
    value: 'loan_retention', 
    label: 'Retención por Préstamos', 
    icon: <Percent className="w-5 h-5" />,
    description: 'Intereses retenidos/cobrados de los préstamos'
  },
  { 
    value: 'loan_collection', 
    label: 'Recaudación de Préstamos', 
    icon: <CreditCard className="w-5 h-5" />,
    description: 'Pagos de cuotas de préstamos recibidos'
  },
  { 
    value: 'penalties', 
    label: 'Multas por Retrasos', 
    icon: <AlertTriangle className="w-5 h-5" />,
    description: 'Multas cobradas por retrasos en aportes mensuales'
  },
  { 
    value: 'refunds', 
    label: 'Devoluciones por Retiro', 
    icon: <UserMinus className="w-5 h-5" />,
    description: 'Devoluciones de aportes a socios que se retiran'
  },
];

export function Reports() {
  const { contributions, loans, transactions, members, config, refunds } = useApp();
  const [selectedReport, setSelectedReport] = useState<ReportType>('contributions');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Generar opciones de meses
  const monthOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Todos los meses' }];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);

  // Datos del reporte según el tipo seleccionado
  const reportData = useMemo(() => {
    const filterByMonth = (date: string) => {
      if (selectedMonth === 'all') return true;
      return date.startsWith(selectedMonth);
    };

    switch (selectedReport) {
      case 'contributions': {
        const filtered = contributions.filter(c => 
          c.status === 'paid' && filterByMonth(c.month)
        );
        return {
          data: filtered.map(c => {
            const member = members.find(m => m.id === c.memberId);
            return {
              id: c.id,
              socio: member?.name || 'Desconocido',
              mes: c.month,
              monto: c.shareAmount,
              fecha: c.paidDate || c.createdAt,
            };
          }),
          total: filtered.reduce((sum, c) => sum + c.shareAmount, 0),
          columns: [
            { key: 'socio', header: 'Socio' },
            { key: 'mes', header: 'Mes' },
            { key: 'monto', header: 'Monto', align: 'right' as const, render: (row: any) => formatCurrency(row.monto, config.currencyCode) },
            { key: 'fecha', header: 'Fecha Pago', render: (row: any) => formatDate(row.fecha) },
          ],
        };
      }

      case 'expenses': {
        const filtered = contributions.filter(c => 
          c.status === 'paid' && filterByMonth(c.month)
        );
        return {
          data: filtered.map(c => {
            const member = members.find(m => m.id === c.memberId);
            return {
              id: c.id,
              socio: member?.name || 'Desconocido',
              mes: c.month,
              monto: c.expenseAmount,
              fecha: c.paidDate || c.createdAt,
            };
          }),
          total: filtered.reduce((sum, c) => sum + c.expenseAmount, 0),
          columns: [
            { key: 'socio', header: 'Socio' },
            { key: 'mes', header: 'Mes' },
            { key: 'monto', header: 'Monto', align: 'right' as const, render: (row: any) => formatCurrency(row.monto, config.currencyCode) },
            { key: 'fecha', header: 'Fecha Pago', render: (row: any) => formatDate(row.fecha) },
          ],
        };
      }

      case 'loan_retention': {
        // Calcular intereses cobrados por préstamo
        const loanInterests = loans.map(loan => {
          const interestPaid = loan.totalInterest * (loan.paidInstallments / loan.totalInstallments);
          return {
            id: loan.id,
            socio: loan.memberName,
            prestamo: `${config.currencySymbol}${loan.amount}`,
            tasaMensual: `${loan.monthlyInterestRate}%`,
            cuotasPagadas: `${loan.paidInstallments}/${loan.totalInstallments}`,
            interesRetenido: interestPaid,
          };
        }).filter(l => l.interesRetenido > 0);

        return {
          data: loanInterests,
          total: loanInterests.reduce((sum, l) => sum + l.interesRetenido, 0),
          columns: [
            { key: 'socio', header: 'Socio' },
            { key: 'prestamo', header: 'Préstamo' },
            { key: 'tasaMensual', header: 'Tasa Mensual' },
            { key: 'cuotasPagadas', header: 'Cuotas Pagadas' },
            { key: 'interesRetenido', header: 'Interés Cobrado', align: 'right' as const, render: (row: any) => formatCurrency(row.interesRetenido, config.currencyCode) },
          ],
        };
      }

      case 'loan_collection': {
        const loanPayments = transactions.filter(t => 
          t.type === 'loan_payment' && filterByMonth(t.date)
        );
        return {
          data: loanPayments.map(t => ({
            id: t.id,
            descripcion: t.description,
            monto: t.amount,
            fecha: t.date,
          })),
          total: loanPayments.reduce((sum, t) => sum + t.amount, 0),
          columns: [
            { key: 'descripcion', header: 'Descripción' },
            { key: 'monto', header: 'Monto', align: 'right' as const, render: (row: any) => formatCurrency(row.monto, config.currencyCode) },
            { key: 'fecha', header: 'Fecha', render: (row: any) => formatDate(row.fecha) },
          ],
        };
      }

      case 'penalties': {
        const penaltyContributions = contributions.filter(c => 
          c.status === 'paid' && c.penaltyAmount > 0 && filterByMonth(c.month)
        );
        return {
          data: penaltyContributions.map(c => {
            const member = members.find(m => m.id === c.memberId);
            return {
              id: c.id,
              socio: member?.name || 'Desconocido',
              mes: c.month,
              multa: c.penaltyAmount,
              fechaPago: c.paidDate || c.createdAt,
            };
          }),
          total: penaltyContributions.reduce((sum, c) => sum + c.penaltyAmount, 0),
          columns: [
            { key: 'socio', header: 'Socio' },
            { key: 'mes', header: 'Mes' },
            { key: 'multa', header: 'Multa', align: 'right' as const, render: (row: any) => formatCurrency(row.multa, config.currencyCode) },
            { key: 'fechaPago', header: 'Fecha Pago', render: (row: any) => formatDate(row.fechaPago) },
          ],
        };
      }

      case 'refunds': {
        const filtered = refunds.filter(r => 
          filterByMonth(r.createdAt.slice(0, 7))
        );
        return {
          data: filtered.map(r => ({
            id: r.id,
            socio: r.memberName,
            motivo: r.reason,
            monto: r.amount,
            fecha: r.createdAt,
          })),
          total: filtered.reduce((sum, r) => sum + r.amount, 0),
          columns: [
            { key: 'socio', header: 'Socio' },
            { key: 'motivo', header: 'Motivo' },
            { key: 'monto', header: 'Monto', align: 'right' as const, render: (row: any) => formatCurrency(row.monto, config.currencyCode) },
            { key: 'fecha', header: 'Fecha', render: (row: any) => formatDate(row.fecha) },
          ],
        };
      }

      default:
        return { data: [], total: 0, columns: [] };
    }
  }, [selectedReport, selectedMonth, contributions, loans, transactions, members, config, refunds]);

  const currentReportOption = reportOptions.find(r => r.value === selectedReport);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Reportes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Informes y estadísticas de la cooperativa
        </p>
      </div>

      {/* Selector de tipo de reporte */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {reportOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setSelectedReport(option.value)}
            className={`
              p-4 rounded-xl border-2 transition-all text-left
              ${selectedReport === option.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700'
              }
            `}
          >
            <div className={`
              p-2 rounded-lg w-fit mb-2
              ${selectedReport === option.value
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }
            `}>
              {option.icon}
            </div>
            <p className={`
              font-medium text-sm
              ${selectedReport === option.value
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-slate-700 dark:text-slate-300'
              }
            `}>
              {option.label}
            </p>
          </button>
        ))}
      </div>

      {/* Filtros y resumen */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(value)}
            options={monthOptions.map(o => ({ value: o.value, label: o.label }))}
            className="w-64"
          />
        </div>

        <Card className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/20 border-primary-200 dark:border-primary-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary-500 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Total {currentReportOption?.label}
              </p>
              <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(reportData.total, config.currencyCode)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Descripción del reporte */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
          {currentReportOption?.icon}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">
            {currentReportOption?.label}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {currentReportOption?.description}
          </p>
        </div>
      </div>

      {/* Tabla de datos */}
      <Card padding="none">
        <Table
          data={reportData.data}
          columns={reportData.columns}
          keyExtractor={(row: { id: string }) => row.id}
          emptyMessage="No hay datos para mostrar en este reporte"
        />
      </Card>

      {/* Resumen por periodo */}
      {reportData.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Registros</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {reportData.data.length}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                <p className="text-2xl font-bold text-success-600">
                  {formatCurrency(reportData.total, config.currencyCode)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Promedio</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(
                    reportData.data.length > 0 ? reportData.total / reportData.data.length : 0,
                    config.currencyCode
                  )}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Periodo</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedMonth === 'all' ? 'Todos' : monthOptions.find(m => m.value === selectedMonth)?.label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Reports;
