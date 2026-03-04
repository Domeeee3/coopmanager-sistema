import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './core/store/AppContext';
import { ThemeProvider } from './shared/components/theme-provider';
import { MainLayout } from './shared/layout/MainLayout';

// Lazy-loaded feature modules (code-splitting)
const Dashboard = lazy(() => import('./features/dashboard'));
const Members = lazy(() => import('./features/members'));
const Loans = lazy(() => import('./features/loans'));
const Accounting = lazy(() => import('./features/accounting'));
const Expenses = lazy(() => import('./features/expenses'));
const Reports = lazy(() => import('./features/reports'));
const Settings = lazy(() => import('./features/settings'));
const ActivityLog = lazy(() => import('./features/activity-log'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="coopmanager-theme">
      <AppProvider>
        <HashRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="loans" element={<Loans />} />
                <Route path="accounting" element={<Accounting />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="reports" element={<Reports />} />
                <Route path="activity-log" element={<ActivityLog />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
