import type { ComponentType } from 'react';
import { Button } from '@heroui/react';
import type { LucideProps } from 'lucide-react';

interface TableActionButtonProps {
  label: string;
  icon: ComponentType<LucideProps>;
  tone?: 'default' | 'danger';
  onPress: () => void;
}

export function TableActionButton({
  label,
  icon: Icon,
  tone = 'default',
  onPress,
}: TableActionButtonProps) {
  return (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      className={tone === 'danger' ? 'text-destructive hover:text-destructive' : undefined}
      aria-label={label}
      onPress={onPress}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}
