import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@heroui/react';
import { cn } from '@/shared/lib/utils';

type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

interface StatCardProps {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('h-32 min-w-0 border border-border shadow-none', className)} variant="default">
      <Card.Content className="flex h-full flex-col justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        </div>
        <div>
          <p className="truncate text-2xl font-[560] tracking-[-0.03em] text-foreground">{value}</p>
          {description ? <div className="truncate text-xs text-muted-foreground">{description}</div> : null}
        </div>
      </Card.Content>
    </Card>
  );
}
