'use client';

import { AppShell } from '@/components/layout/AppShell';
import { SaveStatusPill } from '@/components/layout/SaveStatusPill';
import { SaveStatusProvider } from '@/contexts/SaveStatusContext';

/**
 * Layout del grupo (app): envuelve Dashboard y Roadmap con AppShell y SaveStatusPill.
 * Onboarding y resto de rutas quedan fuera (sin AppShell).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SaveStatusProvider>
      <AppShell topbarRight={<SaveStatusPill />}>
        {children}
      </AppShell>
    </SaveStatusProvider>
  );
}
