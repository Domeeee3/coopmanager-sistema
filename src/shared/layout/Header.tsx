import React from 'react';
import { Menu, Type } from 'lucide-react';
import { useApp } from '@/core/store/AppContext';
import { Button } from '../ui/button';
import { ModeToggle } from '../components/mode-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { fontSize, setFontSize, showToast } = useApp();

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
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>

        <div className="hidden sm:block">
          <h2 className="text-sm font-medium text-muted-foreground">
            Panel de Control
          </h2>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Font Size Control */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Tamaño de fuente">
              <Type className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Tamaño de Fuente</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecreaseFont}
                  disabled={fontSize.base <= fontSize.min}
                  className="flex-1"
                >
                  A-
                </Button>
                <span className="w-12 text-center text-sm font-medium text-muted-foreground">
                  {(fontSize.base * 100).toFixed(0)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIncreaseFont}
                  disabled={fontSize.base >= fontSize.max}
                  className="flex-1"
                >
                  A+
                </Button>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={handleResetFont}
                className="w-full mt-2 text-xs"
              >
                Restaurar tamaño
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ModeToggle />
      </div>
    </header>
  );
}

export default Header;
