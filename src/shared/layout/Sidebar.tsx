import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  FileText,
  Settings,
  X,
  Building2,
  BarChart3,
  Activity,
  Minus,
  Plus,
  RotateCcw,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '../ui/button';
import { useApp } from '@/core/store/AppContext';
import { useTheme } from '@/shared/components/theme-provider';

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

export function Sidebar({ isOpen, onClose, onOpen }: SidebarProps) {
  const { fontSize, setFontSize } = useApp();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          `
            fixed inset-y-0 left-0 z-50
            w-64 bg-white dark:bg-[#1e293b]
            text-foreground
            border-r border-border dark:border-slate-800
            transform transition-transform duration-300 ease-in-out
            flex flex-col
          `,
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white dark:bg-transparent flex items-center justify-center">
              <Building2 className="w-6 h-6 text-black dark:text-slate-300" />
            </div>
            <div>
              <h1 className="font-bold text-slate-950 dark:text-white">CoopManager</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gestión Cooperativa</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  `
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    font-medium transition-all duration-200
                  `,
                  isActive
                    ? 'bg-blue-50 text-slate-900 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-muted/5 hover:text-slate-700 dark:hover:text-white'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      isActive ? 'text-slate-900' : 'text-slate-600 dark:text-slate-300'
                    )}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom controls: font size + theme */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
          {/* Font size */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white hover:bg-muted/10"
              onClick={() => fontSize.base > fontSize.min && setFontSize(fontSize.base - fontSize.step)}
              disabled={fontSize.base <= fontSize.min}
              title="Reducir fuente"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="flex-1 text-center text-xs text-slate-600 select-none">
              {(fontSize.base * 100).toFixed(0)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white hover:bg-muted/10"
              onClick={() => fontSize.base < fontSize.max && setFontSize(fontSize.base + fontSize.step)}
              disabled={fontSize.base >= fontSize.max}
              title="Aumentar fuente"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white hover:bg-muted/10"
              onClick={() => setFontSize(1)}
              title="Restaurar fuente"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-4 py-3 text-slate-600 dark:text-slate-200 hover:text-slate-800 dark:hover:text-white hover:bg-muted/10"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-600 dark:text-slate-200" /> : <Moon className="w-5 h-5 text-slate-600 dark:text-slate-200" />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </Button>
        </div>

      </aside>
    </>
  );
}

export default Sidebar;
