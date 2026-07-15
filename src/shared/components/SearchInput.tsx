import type { ComponentPropsWithoutRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';

interface SearchInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'type' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
}

export function SearchInput({ className, value, onValueChange, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        {...props}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange('')}
          className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-[calc(var(--radius)-2px)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
