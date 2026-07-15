import React from 'react';
import { Switch } from '@heroui/react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '../ui/button';
import { useApp } from '@/core/store/AppContext';
import { useTheme } from '@/shared/components/theme-provider';
import { WorkspaceSwitcher } from '@/shared/components/WorkspaceSwitcher';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Socios', href: '/members', icon: Users },
  { name: 'Préstamos', href: '/loans', icon: CreditCard },
  { name: 'Aportes', href: '/accounting', icon: DollarSign },
  { name: 'Gastos', href: '/expenses', icon: FileText },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Registros', href: '/activity-log', icon: Activity },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { fontSize, setFontSize } = useApp();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-label="Cerrar menú"
        />
      ) : null}

      <aside
        style={{ backgroundColor: '#13171f' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col coopmanager-sidebar border-r border-sidebar-border bg-[#13171f] text-sidebar-foreground transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-[4.5rem] items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Building2 className="size-5 shrink-0 text-sidebar-accent-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-[0.01em]">CoopManager</p>
              <p className="mt-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
                Gestión cooperativa
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Cerrar menú"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <div className="border-b border-sidebar-border px-3 py-3">
          <WorkspaceSwitcher />
        </div>


        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
          <p className="px-2.5 pb-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">
            Inicio
          </p>
          <div className="flex flex-col gap-1">
            {navigation.map((item) => (
              <React.Fragment key={item.name}>
                {item.href === '/members' ? <p className="px-2.5 pt-4 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">Gestión</p> : null}
                {item.href === '/reports' ? <p className="px-2.5 pt-4 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">Consultas</p> : null}
                {item.href === '/settings' ? <p className="px-2.5 pt-4 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/45">Sistema</p> : null}
              <NavLink
                to={item.href}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'group flex h-9 items-center gap-3 rounded-[var(--radius)] px-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#2e63eb] font-semibold text-white shadow-sm'
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'size-4 shrink-0 transition-transform duration-200 group-hover:scale-105',
                        isActive ? 'text-white' : 'text-sidebar-foreground/55',
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
              </React.Fragment>
            ))}
          </div>
        </nav>

        <div className="space-y-2 border-t border-sidebar-border p-3">
          <div className="flex h-9 items-center gap-1 rounded-[var(--radius)] border border-sidebar-border bg-sidebar-accent/25 p-1">
            <button
              type="button"
              className="grid size-7 shrink-0 place-items-center rounded-[calc(var(--radius)-2px)] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => fontSize.base > fontSize.min && setFontSize(fontSize.base - fontSize.step)}
              disabled={fontSize.base <= fontSize.min}
              aria-label="Reducir tamaño de fuente"
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <span className="flex-1 text-center text-[0.6875rem] font-semibold tabular-nums text-sidebar-foreground/75">
              {(fontSize.base * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              className="grid size-7 shrink-0 place-items-center rounded-[calc(var(--radius)-2px)] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => fontSize.base < fontSize.max && setFontSize(fontSize.base + fontSize.step)}
              disabled={fontSize.base >= fontSize.max}
              aria-label="Aumentar tamaño de fuente"
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="grid size-7 shrink-0 place-items-center rounded-[calc(var(--radius)-2px)] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setFontSize(1)}
              aria-label="Restaurar tamaño de fuente"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <Switch
            isSelected={theme === "dark"}
            onChange={(isDark) => setTheme(isDark ? "dark" : "light")}
            size="sm"
            className="w-full px-2.5 text-sidebar-foreground"
          >
            <Switch.Content className="flex w-full items-center justify-between gap-2.5">
              <span className="flex items-center gap-2.5 text-sm text-sidebar-foreground">
                {theme === "dark" ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
                Tema oscuro
              </span>
              <Switch.Control><Switch.Thumb /></Switch.Control>
            </Switch.Content>
          </Switch>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
