import React from 'react';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/components/status-badge';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import { Column } from '@/shared/components/data-table';
import { Member, Refund, Contribution } from '@/core/types';
import { User, Edit2, Trash2, UserX, ArrowLeftCircle } from 'lucide-react';

// ── Helpers de cálculo (memoizables por el consumidor) ──

export function calcNetContributions(
  member: Member,
  contributions: Contribution[],
  refunds: Refund[]
): number {
  const totalPaid = contributions
    .filter(c => c.memberId === member.id && c.status === 'paid')
    .reduce((s, c) => s + (Number(c.shareAmount || 0) + Number(c.expenseAmount || 0)), 0);
  const totalRefunded = refunds
    .filter(r => r.memberId === member.id)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return Math.max(0, totalPaid - totalRefunded);
}

export function calcTotalPenalties(
  member: Member,
  contributions: Contribution[]
): number {
  return contributions
    .filter(c => c.memberId === member.id && c.status === 'paid')
    .reduce((s, c) => s + (Number(c.penaltyAmount) || 0), 0);
}

// ── Columnas base de socios (sin acciones) ──

interface MemberColumnDeps {
  contributions: Contribution[];
  refunds: Refund[];
  currencyCode: string;
}

export function getMemberBaseColumns(deps: MemberColumnDeps): Column<Member>[] {
  const { contributions, refunds, currencyCode } = deps;
  return [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      render: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (member) => member.phone || '-',
    },
    {
      key: 'joinDate',
      header: 'Fecha Ingreso',
      sortable: true,
      render: (member) => formatDate(member.joinDate),
    },
    {
      key: 'totalContributions',
      header: 'Total Aportes',
      sortable: true,
      align: 'right' as const,
      render: (member) => formatCurrency(calcNetContributions(member, contributions, refunds), currencyCode),
    },
    {
      key: 'penalties',
      header: 'Multas',
      sortable: true,
      align: 'right' as const,
      render: (member) => formatCurrency(calcTotalPenalties(member, contributions), currencyCode),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (member) => <StatusBadge status={member.status} />,
    },
  ];
}

// ── Columna de acciones unificada (activos + inactivos) ──

interface UnifiedActionsDeps {
  onEdit: (m: Member) => void;
  onInactivate: (m: Member) => void;
  onDelete: (m: Member) => void;
}

export function getUnifiedActionsColumn(deps: UnifiedActionsDeps): Column<Member> {
  return {
    key: 'actions',
    header: 'Acciones',
    width: '100px',
    render: (member) => (
      <div className="flex items-center gap-1">
        {member.status === 'active' && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deps.onEdit(member); }} title="Editar">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deps.onInactivate(member); }} title="Retirar socio">
              <UserX className="w-4 h-4" />
            </Button>
          </>
        )}
        {member.status === 'inactive' && (
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deps.onDelete(member); }} title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    ),
  };
}

// ── Columnas legacy (mantenidas por compatibilidad) ──

interface ActiveActionsDeps {
  onEdit: (m: Member) => void;
  onInactivate: (m: Member) => void;
}

export function getActiveActionsColumn(deps: ActiveActionsDeps): Column<Member> {
  return {
    key: 'actions',
    header: 'Acciones',
    width: '80px',
    render: (member) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deps.onEdit(member); }} title="Editar">
          <Edit2 className="w-4 h-4" />
        </Button>
        {member.status === 'active' && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deps.onInactivate(member); }} title="Marcar como inactivo">
            <UserX className="w-4 h-4" />
          </Button>
        )}
      </div>
    ),
  };
}

interface InactiveActionsDeps {
  onDelete: (m: Member) => void;
}

export function getInactiveActionsColumn(deps: InactiveActionsDeps): Column<Member> {
  return {
    key: 'actions',
    header: 'Acciones',
    width: '80px',
    render: (member) => (
      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deps.onDelete(member); }} title="Eliminar">
        <Trash2 className="w-4 h-4" />
      </Button>
    ),
  };
}

// ── Columnas de devoluciones ──

interface RefundColumnDeps {
  currencyCode: string;
  onEdit: (r: Refund) => void;
  onDelete: (r: Refund) => void;
}

export function getRefundColumns(deps: RefundColumnDeps): Column<Refund>[] {
  return [
    {
      key: 'member',
      header: 'Socio',
      render: (refund) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeftCircle className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="font-medium text-foreground">{refund.memberName}</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (refund) => refund.reason,
    },
    {
      key: 'amount',
      header: 'Devolución',
      align: 'right' as const,
      render: (refund) => (
        <span className="font-semibold text-foreground">
          {formatCurrency(refund.amount, deps.currencyCode)}
        </span>
      ),
    },
    {
      key: 'depositDate',
      header: 'Fecha Depósito',
      render: (refund) => formatDate(refund.depositDate),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '120px',
      render: (refund) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deps.onEdit(refund); }} title="Editar">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deps.onDelete(refund); }} title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];
}
