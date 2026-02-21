import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  DollarSign,
  FileText,
  Settings,
  Menu,
  X,
  Building2,
  BarChart3,
  Activity
} from 'lucide-react';
import { cn } from '../../utils/formatters';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
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
            w-64 bg-white dark:bg-slate-900
            border-r border-slate-200 dark:border-slate-800
            transform transition-transform duration-300 ease-in-out
            flex flex-col
          `,
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">CoopManager</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gestión Cooperativa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
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
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    font-medium transition-all duration-200
                  `,
                  isActive
                    ? `
                        bg-primary-50 dark:bg-primary-900/20
                        text-primary-700 dark:text-primary-400
                      `
                    : `
                        text-slate-600 dark:text-slate-400
                        hover:bg-slate-50 dark:hover:bg-slate-800
                        hover:text-slate-900 dark:hover:text-white
                      `
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      'w-5 h-5 transition-colors',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Sistema de gestión para cooperativas cerradas de ahorro y crédito
            </p>
            <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Versión 1.0.0
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
