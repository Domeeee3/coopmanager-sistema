import React, { useState, useMemo } from 'react';
import { useApp } from '@/core/store/AppContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { DataTable } from '@/shared/components/data-table';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import {
  FileText,
  DollarSign,
  Percent,
  CreditCard,
  AlertTriangle,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground mt-1">Informes y estadísticas de la cooperativa</p>
        </div>
      </div>

      {/* Selector tipo de reporte (pills) */}
      <div className="flex flex-wrap items-center gap-1 bg-muted rounded-lg p-1">
        {reportOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setSelectedReport(option.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedReport === option.value
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Filtro de mes + Total */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select
          value={selectedMonth}
          onValueChange={(value) => setSelectedMonth(value)}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="text-xl font-bold text-foreground">
            {formatCurrency(reportData.total, config.currencyCode)}
          </span>
          {reportData.data.length > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{reportData.data.length} registros</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Promedio: {formatCurrency(reportData.total / reportData.data.length, config.currencyCode)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tabla de datos */}
      <DataTable
        data={reportData.data}
        columns={reportData.columns}
        keyExtractor={(row: { id: string }) => row.id}
        emptyMessage="No hay datos para mostrar en este reporte"
      />
    </div>
  );
}

export default Reports;
