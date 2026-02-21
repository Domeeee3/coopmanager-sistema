import React, { useState } from 'react';
import { Menu, Sun, Moon, Type, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/formatters';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme, fontSize, setFontSize, showToast } = useApp();
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleIncreaseFont = () => {
    if (fontSize.base < fontSize.max) {
      setFontSize(fontSize.base + fontSize.step);
      showToast('success', 'Tamaño aumentado', `Fuente: ${((fontSize.base + fontSize.step) * 100).toFixed(0)}%`);
    }
  };

  const handleDecreaseFont = () => {
    if (fontSize.base > fontSize.min) {
      setFontSize(fontSize.base - fontSize.step);
      showToast('success', 'Tamaño reducido', `Fuente: ${((fontSize.base - fontSize.step) * 100).toFixed(0)}%`);
    }
  };

  const handleResetFont = () => {
    setFontSize(1);
    showToast('success', 'Fuente restaurada', 'Tamaño de fuente restablecido al 100%');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Breadcrumb placeholder - can be enhanced */}
        <div className="hidden sm:block">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Panel de Control
          </h2>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Font Size Control */}
        <div className="relative">
          <button
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tamaño de fuente"
          >
            <Type className="w-5 h-5" />
          </button>

          {showFontMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Tamaño de Fuente
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDecreaseFont}
                    disabled={fontSize.base <= fontSize.min}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    A-
                  </button>
                  <span className="w-12 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                    {(fontSize.base * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={handleIncreaseFont}
                    disabled={fontSize.base >= fontSize.max}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    A+
                  </button>
                </div>
                <button
                  onClick={handleResetFont}
                  className="w-full mt-2 py-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  Restaurar tamaño
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme.mode === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme.mode === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="hidden md:block text-sm font-medium">Admin</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Administrador</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">admin@coopmanager.com</p>
              </div>
              <div className="py-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <User className="w-4 h-4" />
                  <span>Perfil</span>
                </button>
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Configuración</span>
                </button>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-700 pt-1">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
