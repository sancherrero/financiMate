'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { FinancialStrategy } from '@/lib/types';
import { cn } from '@/lib/utils';

const TRADEOFF_COPY: Record<FinancialStrategy, string> = {
  emergency_first: 'Prioriza completar el FE antes de acelerar la meta.',
  balanced: 'Reparto estable entre seguridad y avance.',
  goal_first: 'Llegas antes, pero tu FE crece más lento.',
};

export interface StrategyTradeoffCardProps {
  strategy: FinancialStrategy;
  className?: string;
}

/**
 * Card con microcopy del tradeoff de la estrategia según docs/ui-ux §2.4 y §5.
 * Estilo sobrio: rounded-2xl, border-border/60, shadow-sm (heredados de Card).
 */
export function StrategyTradeoffCard({ strategy, className }: StrategyTradeoffCardProps) {
  const copy = TRADEOFF_COPY[strategy];

  return (
    <Card
      className={cn('rounded-2xl border-border/60 shadow-sm', className)}
      aria-live="polite"
      aria-atomic="true"
    >
      <CardContent className="p-4 md:p-5">
        <p className="text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
          {copy}
        </p>
      </CardContent>
    </Card>
  );
}
