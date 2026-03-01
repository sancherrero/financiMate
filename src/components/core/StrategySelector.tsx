'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FinancialStrategy } from '@/lib/types';
import { cn } from '@/lib/utils';

const STRATEGIES: { value: FinancialStrategy; label: string }[] = [
  { value: 'emergency_first', label: 'Seguridad' },
  { value: 'balanced', label: 'Equilibrio' },
  { value: 'goal_first', label: 'Máximo a meta' },
];

export interface StrategySelectorProps {
  value: FinancialStrategy;
  onValueChange: (value: FinancialStrategy) => void;
  className?: string;
}

/**
 * Selector de estrategia (tabs/segmented) según docs/ui-ux §2.4.
 * Opciones: Seguridad (emergency_first), Equilibrio (balanced), Máximo a meta (goal_first).
 */
export function StrategySelector({ value, onValueChange, className }: StrategySelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as FinancialStrategy)}
      className={cn('w-full', className)}
    >
      <TabsList className="h-10 w-full sm:w-auto rounded-xl bg-muted p-1" aria-label="Estrategia financiera">
        {STRATEGIES.map(({ value: v, label }) => (
          <TabsTrigger
            key={v}
            value={v}
            className="flex-1 sm:flex-none rounded-lg px-4 data-[state=active]:shadow-sm"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
