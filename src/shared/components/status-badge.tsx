import React from 'react';
import { Badge } from '../ui/badge';
import { MemberStatus, LoanStatus, ContributionStatus } from '@/core/types';

interface StatusBadgeProps {
    status: MemberStatus | LoanStatus | ContributionStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
    const getStatusConfig = () => {
        switch (status) {
            // Success / Pagado / Completado / Activo
            case 'active':
                return { label: 'Activo', className: 'bg-success/10 text-success hover:bg-success/15' };
            case 'paid':
                return { label: 'Pagado', className: 'bg-success/10 text-success hover:bg-success/15' };
            case 'completed':
                return { label: 'Completado', className: 'bg-success/10 text-success hover:bg-success/15' };

            // Warning / Pendiente / Parcial
            case 'pending':
                return { label: 'Pendiente', className: 'bg-warning/10 text-warning hover:bg-warning/15' };
            case 'partial':
                return { label: 'Parcial', className: 'bg-warning/10 text-warning hover:bg-warning/15' };
            case 'pending_retention':
                return { label: 'Retención Pend.', className: 'bg-warning/10 text-warning hover:bg-warning/15' };

            // Danger / Rechazado / Inactivo / Vencido
            case 'inactive':
                return { label: 'Inactivo', className: 'bg-muted text-muted-foreground hover:bg-muted' };
            case 'rejected':
                return { label: 'Rechazado', className: 'bg-destructive/10 text-destructive hover:bg-destructive/15' };
            case 'defaulted':
                return { label: 'En Mora', className: 'bg-destructive/10 text-destructive hover:bg-destructive/15' };

            default:
                return { label: status, className: 'bg-muted text-muted-foreground hover:bg-muted' };
        }
    };

    const config = getStatusConfig();

    return (
        <Badge variant="outline" className={`border - none ${config.className} `}>
            {config.label}
        </Badge>
    );
}
