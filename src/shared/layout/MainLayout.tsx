import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import ToastContainer from '../components/ToastContainer';
import { Button } from '../ui/button';
import Sidebar from './Sidebar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(circle_at_100%_0%,color-mix(in_oklab,var(--accent)_9%,transparent),transparent_26rem)]" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative z-10 flex min-h-screen flex-col lg:pl-[17.5rem]">
        <header className="flex h-16 items-center border-b border-border bg-background/80 px-4 backdrop-blur-lg lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu aria-hidden="true" />
          </Button>
          <span className="ml-3 text-sm font-bold tracking-wide">CoopManager</span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          <div className="mx-auto w-full max-w-[1600px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

export default MainLayout;
