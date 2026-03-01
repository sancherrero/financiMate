'use client';

import * as React from 'react';
import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { useSaveStatus } from '@/contexts/SaveStatusContext';
import { cn } from '@/lib/utils';

type DisplayStatus = 'Local' | 'Sincronizado' | 'Pendiente' | 'Error';

const STATUS_CONFIG: Record<DisplayStatus, { icon: React.ComponentType<{ className?: string }>; label: string; className: string }> = {
  Local: {
    icon: CloudOff,
    label: 'Local',
    className: 'bg-muted text-muted-foreground border-border/60',
  },
  Sincronizado: {
    icon: Cloud,
    label: 'Sincronizado',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  Pendiente: {
    icon: Loader2,
    label: 'Pendiente',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  Error: {
    icon: AlertCircle,
    label: 'Error',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

/**
 * Pill que muestra el estado de guardado según §2.8:
 * Local (sin auth), Sincronizado (auth y ok), Pendiente (cambios sin guardar), Error (fallo persistencia).
 * Debe verse en Dashboard y Roadmap (Topbar del AppShell).
 */
function SaveStatusPill({ className }: { className?: string }) {
  const { user, isUserLoading } = useUser();
  const { status } = useSaveStatus();

  const displayStatus: DisplayStatus = React.useMemo(() => {
    if (!user && !isUserLoading) return 'Local';
    if (isUserLoading) return 'Sincronizado'; // mientras carga auth, mostrar estado neutro
    if (status === 'error') return 'Error';
    if (status === 'pending') return 'Pendiente';
    return 'Sincronizado';
  }, [user, isUserLoading, status]);

  const config = STATUS_CONFIG[displayStatus];
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`Estado de guardado: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums',
        config.className,
        displayStatus === 'Pendiente' && 'animate-pulse',
        className
      )}
    >
      {displayStatus === 'Pendiente' ? (
        <Icon className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Icon className="size-3.5" aria-hidden />
      )}
      <span>{config.label}</span>
    </span>
  );
}

SaveStatusPill.displayName = 'SaveStatusPill';

export { SaveStatusPill };
