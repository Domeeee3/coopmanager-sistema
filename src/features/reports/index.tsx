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
import { PageHeader } from "@/shared/components/PageHeader";
import { SectionTabs } from "@/shared/components/SectionTabs";
import { StatCard } from "@/shared/components/StatCard";
import { MemberAvatar } from "@/shared/components/MemberAvatar";
import { formatCurrency, formatDate, formatMonthName } from '@/core/lib/formatters';
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
  const [reportSearch, setReportSearch] = useState("");

  const renderMember = (row: { socio: string; memberId?: string }) => {
    const member = members.find((item) => item.id === row.memberId);
    return (
      <div className="flex !justify-start items-center gap-3">
        <MemberAvatar name={row.socio} photo={member?.profilePhoto} />
        <span className="font-medium text-foreground">{row.socio}</span>
      </div>
    );
  };

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
              memberId: c.memberId,
              mes: c.month,
              monto: c.shareAmount,
              fecha: c.paidDate || c.createdAt,
            };
          }),
          total: filtered.reduce((sum, c) => sum + c.shareAmount, 0),
          columns: [
            { key: 'socio', header: 'Socio', align: 'left' as const, render: renderMember },
            { key: 'mes', header: 'Mes', render: (row: { mes: string }) => formatMonthName(row.mes) },
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
              memberId: c.memberId,
              mes: c.month,
              monto: c.expenseAmount,
              fecha: c.paidDate || c.createdAt,
            };
          }),
          total: filtered.reduce((sum, c) => sum + c.expenseAmount, 0),
          columns: [
            { key: 'socio', header: 'Socio', align: 'left' as const, render: renderMember },
            { key: 'mes', header: 'Mes', render: (row: { mes: string }) => formatMonthName(row.mes) },
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
            memberId: loan.memberId,
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
            { key: 'socio', header: 'Socio', align: 'left' as const, render: renderMember },
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
          data: loanPayments.map(t => {
            const loan = loans.find((item) => item.id === t.referenceId);
            return {
              id: t.id,
              socio: loan?.memberName || 'Desconocido',
              memberId: loan?.memberId,
              descripcion: t.description,
              monto: t.amount,
              fecha: t.date,
            };
          }),
          total: loanPayments.reduce((sum, t) => sum + t.amount, 0),
          columns: [
            { key: 'socio', header: 'Socio', align: 'left' as const, render: renderMember },
            { key: 'descripcion', header: 'Descripción', align: 'left' as const },
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
              memberId: c.memberId,
              mes: c.month,
              multa: c.penaltyAmount,
              fechaPago: c.paidDate || c.createdAt,
            };
          }),
          total: penaltyContributions.reduce((sum, c) => sum + c.penaltyAmount, 0),
          columns: [
            { key: 'socio', header: 'Socio', align: 'left' as const, render: renderMember },
            { key: 'mes', header: 'Mes', render: (row: { mes: string }) => formatMonthName(row.mes) },
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
            memberId: r.memberId,
            motivo: r.reason,
            monto: r.amount,
            fecha: r.createdAt,
          })),
          total: filtered.reduce((sum, r) => sum + r.amount, 0),
          columns: [
            { key: 'socio', header: 'Socio', align: 'left' as const, render: renderMember },
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

  const filteredReportData = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    if (!query) return reportData.data;

    return reportData.data.filter((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [reportData.data, reportSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reportes"
        description="Informes y estadísticas de la cooperativa"
      />


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Monto total"
          value={formatCurrency(reportData.total, config.currencyCode)}
          description={reportOptions.find((report) => report.value === selectedReport)?.label}
          icon={DollarSign}
        />
        <StatCard
          label="Registros"
          value={reportData.data.length}
          description={selectedMonth === 'all' ? 'Todos los meses' : monthOptions.find((month) => month.value === selectedMonth)?.label}
          icon={FileText}
        />
        <StatCard
          label="Promedio por registro"
          value={formatCurrency(
            reportData.data.length > 0 ? reportData.total / reportData.data.length : 0,
            config.currencyCode,
          )}
          description="Según los registros seleccionados"
          icon={Percent}
        />
      </div>

      {/* Tabla de datos */}
      <DataTable
        data={filteredReportData}
        columns={reportData.columns}
        keyExtractor={(row: { id: string }) => row.id}
        searchValue={reportSearch}
        onSearchChange={setReportSearch}
        searchPlaceholder="Buscar en el reporte..."
        toolbar={(
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Select
              value={selectedReport}
              onValueChange={(value) => {
                setSelectedReport(value as ReportType);
                setReportSearch("");
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportOptions.map((report) => (
                  <SelectItem key={report.value} value={report.value}>
                    {report.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth}
              onValueChange={(value) => setSelectedMonth(value)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        emptyMessage="No hay registros que coincidan con la búsqueda"
      />
    </div>
  );
}

export default Reports;
