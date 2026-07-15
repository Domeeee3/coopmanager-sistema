import { Button, Chip } from '@heroui/react';
import { formatCurrency, formatDate } from '@/core/lib/formatters';
import { Column } from '@/shared/components/data-table';
import { Member, Refund, Contribution } from '@/core/types';
import { MemberAvatar } from '@/shared/components/MemberAvatar';
import { Edit2, Trash2, UserCheck, UserX } from 'lucide-react';

export function calcNetContributions(
  member: Member,
  contributions: Contribution[],
  refunds: Refund[]
): number {
  const totalPaid = contributions
    .filter(contribution => contribution.memberId === member.id && contribution.status === 'paid')
    .reduce((sum, contribution) => sum + (Number(contribution.shareAmount || 0) + Number(contribution.expenseAmount || 0)), 0);
  const totalRefunded = refunds
    .filter(refund => refund.memberId === member.id)
    .reduce((sum, refund) => sum + (Number(refund.amount) || 0), 0);
  return Math.max(0, totalPaid - totalRefunded);
}

export function calcTotalPenalties(
  member: Member,
  contributions: Contribution[]
): number {
  return contributions
    .filter(contribution => contribution.memberId === member.id && contribution.status === 'paid')
    .reduce((sum, contribution) => sum + (Number(contribution.penaltyAmount) || 0), 0);
}

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
      align: "left" as const,
      render: (member) => (
        <div className="flex !justify-start items-center gap-3">
          <MemberAvatar name={member.name} photo={member.profilePhoto} />
          <div>
            <p className="font-medium text-foreground">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.phone || 'Sin teléfono'}</p>
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
      header: 'Fecha de ingreso',
      sortable: true,
      render: (member) => formatDate(member.joinDate),
    },
    {
      key: 'totalContributions',
      header: 'Total aportes',
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
      render: (member) => (
        <Chip color={member.status === 'active' ? 'success' : 'default'} size="sm" variant="soft">
          {member.status === 'active' ? 'Activo' : 'Retirado'}
        </Chip>
      ),
    },
  ];
}

interface UnifiedActionsDeps {
  onEdit: (member: Member) => void;
  onInactivate: (member: Member) => void;
  onRestore: (member: Member) => void;
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
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Editar a ${member.name}`}
              onClick={(event) => { event.stopPropagation(); deps.onEdit(member); }}
            >
              <Edit2 className="size-4" />
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Retirar a ${member.name}`}
              onClick={(event) => { event.stopPropagation(); deps.onInactivate(member); }}
            >
              <UserX className="size-4" />
            </Button>
          </>
        )}
        {member.status === 'inactive' && (
          <Button
            isIconOnly
            size="sm"
            variant="ghost"

            aria-label={`Restablecer a ${member.name}`}
            onClick={(event) => { event.stopPropagation(); deps.onRestore(member); }}
          >
            <UserCheck className="size-4" />
          </Button>
        )}
      </div>
    ),
  };
}

interface ActiveActionsDeps {
  onEdit: (member: Member) => void;
  onInactivate: (member: Member) => void;
}

export function getActiveActionsColumn(deps: ActiveActionsDeps): Column<Member> {
  return {
    key: 'actions',
    header: 'Acciones',
    width: '80px',
    render: (member) => (
      <div className="flex items-center gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Editar a ${member.name}`}
          onClick={(event) => { event.stopPropagation(); deps.onEdit(member); }}
        >
          <Edit2 className="size-4" />
        </Button>
        {member.status === 'active' && (
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`Marcar a ${member.name} como inactivo`}
            onClick={(event) => { event.stopPropagation(); deps.onInactivate(member); }}
          >
            <UserX className="size-4" />
          </Button>
        )}
      </div>
    ),
  };
}

interface InactiveActionsDeps {
  onRestore: (member: Member) => void;
}

export function getInactiveActionsColumn(deps: InactiveActionsDeps): Column<Member> {
  return {
    key: 'actions',
    header: 'Acciones',
    width: '80px',
    render: (member) => (
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Restablecer a ${member.name}`}
        onClick={(event) => { event.stopPropagation(); deps.onRestore(member); }}
      >
        <UserCheck className="size-4" />
      </Button>
    ),
  };
}

interface RefundColumnDeps {
  currencyCode: string;
  members: Member[];
  onEdit: (refund: Refund) => void;
  onDelete: (refund: Refund) => void;
}

export function getRefundColumns(deps: RefundColumnDeps): Column<Refund>[] {
  return [
    {
      key: 'member',
      header: 'Socio',
      align: 'left' as const,
      render: (refund) => {
        const member = deps.members.find((item) => item.id === refund.memberId);
        return (
          <div className="flex !justify-start items-center gap-3">
            <MemberAvatar name={refund.memberName} photo={member?.profilePhoto} />
            <span className="font-medium text-foreground">{refund.memberName}</span>
          </div>
        );
      },
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
        <span className="text-foreground">
          {formatCurrency(refund.amount, deps.currencyCode)}
        </span>
      ),
    },
    {
      key: 'depositDate',
      header: 'Fecha de depósito',
      render: (refund) => formatDate(refund.depositDate),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '120px',
      render: (refund) => (
        <div className="flex items-center gap-1">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={`Editar devolución de ${refund.memberName}`}
            onClick={(event) => { event.stopPropagation(); deps.onEdit(refund); }}
          >
            <Edit2 className="size-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label={`Eliminar devolución de ${refund.memberName}`}
            onClick={(event) => { event.stopPropagation(); deps.onDelete(refund); }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];
}
