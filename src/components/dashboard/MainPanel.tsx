'use client';

import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { PlanResult } from '@/lib/types';
import { ArrowRightCircle } from 'lucide-react';

export interface MainPanelProps {
  /** Plan calculado para la estrategia seleccionada */
  plan: PlanResult;
  /** Callback al pulsar "Añadir al Roadmap" */
  onAddToRoadmap: () => void;
}

/**
 * MainPanel del Dashboard (§3.2): Card Progreso (FE, Meta, hitos) y CTA "Añadir al Roadmap".
 * Solo presenta datos del plan; no contiene lógica de negocio.
 */
export function MainPanel({ plan, onAddToRoadmap }: MainPanelProps) {
  const startDate = plan.snapshot.startDate ? new Date(plan.snapshot.startDate) : new Date();
  const feActual = plan.snapshot.emergencyFundAmount;
  const feTarget = plan.targetEmergencyFund;
  const feProgress = feTarget > 0 ? Math.min(100, (feActual / feTarget) * 100) : 0;
  const isFundCompleted = feActual >= feTarget;
  const fundCompletedDate =
    plan.fundCompletedAtMonth > 0
      ? format(addMonths(startDate, plan.fundCompletedAtMonth - 1), 'MMM yyyy', { locale: es })
      : null;
  const goalCompletedDate = format(
    addMonths(startDate, Math.max(0, plan.estimatedMonthsToGoal - 1)),
    'MMM yyyy',
    { locale: es }
  );
  const isDebt = plan.goal.type === 'debt';
  const debtLiquidatedDate = isDebt ? goalCompletedDate : null;

  return (
    <section className="space-y-6" aria-label="Panel principal">
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Progreso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 md:p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Fondo de emergencia</span>
              <span className="tabular-nums font-medium">
                {feActual} € / {feTarget} €
              </span>
            </div>
            <Progress value={feProgress} className="h-2" aria-valuenow={feProgress} aria-valuemin={0} aria-valuemax={100} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-muted-foreground">Meta: {plan.goal.name}</span>
              <span className="tabular-nums font-medium">Completada en {goalCompletedDate}</span>
            </div>
            <Progress value={100} className="h-2" aria-label="Meta completada en la fecha estimada" />
          </div>

          <ul className="space-y-2 text-sm" role="list">
            <li className="flex items-center gap-2">
              <span className="text-muted-foreground" aria-hidden>•</span>
              <span>
                {fundCompletedDate
                  ? `FE completo en ${fundCompletedDate}`
                  : isFundCompleted
                    ? 'FE completo al inicio'
                    : '—'}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-muted-foreground" aria-hidden>•</span>
              <span>
                {isDebt && debtLiquidatedDate
                  ? `Deuda ${plan.goal.name} liquidada en ${debtLiquidatedDate}`
                  : '—'}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-muted-foreground" aria-hidden>•</span>
              <span>Meta completada en {goalCompletedDate}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button
          onClick={onAddToRoadmap}
          className="h-11 w-full sm:w-auto rounded-xl font-bold shadow-lg bg-primary hover:bg-primary/90"
          aria-label="Añadir al Roadmap"
        >
          Añadir al Roadmap
          <ArrowRightCircle className="ml-2 h-5 w-5" aria-hidden />
        </Button>
        <p className="text-sm text-muted-foreground">
          Esto recalcula tu plan maestro y lo guarda.
        </p>
      </div>
    </section>
  );
}
