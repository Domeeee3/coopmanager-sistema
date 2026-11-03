import type { ComponentType } from 'react';
import { Dropdown } from '@heroui/react';
import type { LucideProps } from 'lucide-react';
import { Settings } from 'lucide-react';

export interface RowAction {
  id: string;
  label: string;
  icon: ComponentType<LucideProps>;
  tone?: 'default' | 'danger';
  isDisabled?: boolean;
  onAction: () => void;
}

interface RowActionsMenuProps {
  /** Nombre accesible del botón (ej. "Acciones del préstamo"). */
  label: string;
  actions: RowAction[];
  icon?: ComponentType<LucideProps>;
}

/** Botón de engranaje con un menú de acciones para una fila de tabla. */
export function RowActionsMenu({ label, actions, icon: Icon = Settings }: RowActionsMenuProps) {
  const disabledKeys = actions.filter((action) => action.isDisabled).map((action) => action.id);

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={label}
        className="inline-grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Icon className="size-4" aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          aria-label={label}
          disabledKeys={disabledKeys}
          onAction={(key) => actions.find((action) => action.id === String(key))?.onAction()}
        >
          {actions.map(({ id, label: actionLabel, icon: ActionIcon, tone }) => (
            <Dropdown.Item key={id} id={id} textValue={actionLabel} variant={tone === 'danger' ? 'danger' : 'default'}>
              <ActionIcon className="size-4" aria-hidden="true" />
              {actionLabel}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
