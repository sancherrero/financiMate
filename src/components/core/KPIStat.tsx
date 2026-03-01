'use client';

import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type KPIStatTone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';

export interface KPIStatProps {
  /** Etiqueta pequeña encima del valor */
  label: string;
  /** Valor principal (string formateado; usar tabular-nums para números) */
  value: string;
  /** Texto opcional para tooltip de ayuda */
  hint?: string;
  /** Semántica de color: good=éxito, warn=aviso, bad=deuda/destructivo, info=informativo (p.ej. FE), neutral=gris */
  tone?: KPIStatTone;
  /** Icono opcional junto al label o valor */
  icon?: LucideIcon;
  className?: string;
}

/** Borde lateral por tono; valor en texto normal para mantener sobriedad (§0.4). */
const toneBorderStyles: Record<KPIStatTone, string> = {
  neutral: 'border-l-muted-foreground/40',
  good: 'border-l-green-500/60',
  warn: 'border-l-amber-500/60',
  bad: 'border-l-destructive/60',
  info: 'border-l-accent/60',
};

/**
 * Tarjeta KPI según docs/ui-ux §2.3: label, value, hint (tooltip), tone e icon opcional.
 * Semántica de color §0.4: verde OK, ámbar avisos, rojo deuda/destructivo, azul/cian FE.
 */
export function KPIStat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon: Icon,
  className,
}: KPIStatProps) {
  const borderClass = toneBorderStyles[tone];

  return (
    <div
      className={cn(
        'rounded-xl border border-border/60 bg-card p-4 shadow-sm pl-4 border-l-4',
        borderClass,
        className
      )}
      role="group"
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {hint ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Más información"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {hint}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {Icon ? (
          <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
        ) : null}
        <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}
