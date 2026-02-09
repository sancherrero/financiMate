'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FinancialSnapshot, Goal, PlanResult } from '@/lib/types';
import { generatePersonalizedPlan } from '@/ai/flows/personalized-financial-plan';
import { explainRecommendations } from '@/ai/flows/explain-recommendations';
import { PiggyBank, Target, Calendar, TrendingUp, AlertCircle, FileText, Info, Zap, Users, CheckCircle2, Flag, Clock, User, RefreshCw, Calculator, ArrowRight, ChevronDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const storedSnap = localStorage.getItem('financiMate_snapshot');
    const storedGoal = localStorage.getItem('financiMate_goal');
    const storedSplit = localStorage.getItem('financiMate_splitMethod') as 'equal' | 'proportional_income';

    if (!storedSnap || !storedGoal) {
      router.push('/onboarding');
      return;
    }

    const snapshot = JSON.parse(storedSnap) as FinancialSnapshot;
    const goal = JSON.parse(storedGoal) as Goal;

    try {
      const result = await generatePersonalizedPlan({
        totalIncomeNetMonthly: snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0),
        totalFixedCostsMonthly: snapshot.totalFixedCosts || 0,
        totalVariableCostsMonthly: snapshot.totalVariableCosts || 0,
        emergencyFundAmount: snapshot.emergencyFundAmount,
        goalName: goal.name,
        goalTargetAmount: goal.targetAmount,
        goalUrgencyLevel: goal.urgencyLevel,
        strategy: goal.strategy || 'emergency_first',
        splitMethod: storedSplit,
        isExistingDebt: goal.isExistingDebt,
        existingMonthlyPayment: goal.existingMonthlyPayment,
        tin: goal.tin,
        tae: goal.tae,
        remainingPrincipal: goal.targetAmount,
        assignedTo: goal.assignedTo,
        expenseMode: snapshot.expenseMode,
        members: snapshot.members.map(m => ({
          memberId: m.id,
          incomeNetMonthly: m.incomeNetMonthly,
          individualFixedCosts: m.individualFixedCosts,
          individualVariableCosts: m.individualVariableCosts
        }))
      });

      const explanation = await explainRecommendations({
        recommendations: result.recommendations,
        monthlySurplus: result.monthlySurplus,
        emergencyFundAmount: snapshot.emergencyFundAmount,
        emergencyTarget: (snapshot.totalFixedCosts + snapshot.totalVariableCosts) * 3,
        goalName: goal.name,
        goalTargetAmount: goal.targetAmount,
        monthlyContributionTotal: result.monthlyContributionExtra,
        estimatedMonthsToGoal: result.estimatedMonthsToGoal
      });

      setPlan({
        ...result,
        snapshot,
        goal,
        explanations: explanation.explanations,
        priority: result.priority as any,
        monthlyContributionTotal: result.monthlyContributionExtra,
      });
    } catch (e: any) {
      console.error("Error generating plan", e);
      setError("Hubo un problema al generar tu plan financiero. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-center">
        <div className="animate-spin mb-4"><Zap className="w-12 h-12 text-primary" /></div>
        <h2 className="text-xl font-headline font-bold">Validando ejercicio matemático...</h2>
        <p className="text-muted-foreground max-w-sm mt-2">Estamos ajustando cada céntimo para que el plan sea 100% exacto.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-center space-y-4">
        <div className="bg-destructive/10 p-4 rounded-full text-destructive">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-headline font-bold">¡Ups! Algo salió mal</h2>
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={() => loadPlan()} className="rounded-full">
          <RefreshCw className="w-4 h-4 mr-2" /> Reintentar ahora
        </Button>
      </div>
    );
  }

  if (!plan) return null;

  const totalMonthlyApplied = plan.monthlyContributionTotal + (plan.goal.existingMonthlyPayment || 0);

  return (
    <div className="min-h-screen bg-background pb-12 font-body">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
           <Button variant="outline" size="sm" onClick={() => window.print()}>
             <FileText className="w-4 h-4 mr-2" /> Imprimir Plan
           </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-headline font-bold">Análisis de {plan.goal.name}</h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <Badge variant="outline" className="bg-white">
              Estrategia: {plan.goal.strategy === 'emergency_first' ? 'Fondo Primero' : plan.goal.strategy === 'balanced' ? 'Equilibrado' : 'Priorizar Meta'}
            </Badge>
            <Badge className="bg-primary">
              Meta alcanzada en: {plan.estimatedMonthsToGoal} meses
            </Badge>
          </div>
        </header>

        {/* METRICAS CLAVE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-4">
              <CardDescription className="text-xs font-bold uppercase text-slate-500">Sobrante Mensual Disponible</CardDescription>
              <CardTitle className="text-2xl text-slate-900">€{plan.monthlySurplus.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-muted-foreground italic">
              Dinero extra tras todos vuestros gastos habituales.
            </CardContent>
          </Card>
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-4">
              <CardDescription className="text-xs font-bold uppercase text-primary/70">Aporte Extra Propuesto</CardDescription>
              <CardTitle className="text-2xl text-primary font-bold">€{plan.monthlyContributionTotal.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-primary/80">
              Dinero adicional que destináis cada mes a la meta.
            </CardContent>
          </Card>
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-orange-50 border-b py-4">
              <CardDescription className="text-xs font-bold uppercase text-orange-600">Amortización Total Real</CardDescription>
              <CardTitle className="text-2xl text-orange-600 font-bold">€{totalMonthlyApplied.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-orange-700/70">
              {plan.goal.isExistingDebt 
                ? `€${plan.monthlyContributionTotal} (Extra) + €${plan.goal.existingMonthlyPayment} (Cuota actual)`
                : `Todo el ahorro extra (€${plan.monthlyContributionTotal}) se suma a la meta.`}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMNA IZQUIERDA: MATEMÁTICAS */}
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-headline font-bold flex items-center text-slate-800">
                <Calculator className="w-5 h-5 mr-2 text-primary" /> Ejercicio Matemático Detallado
              </h2>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-0">
                  <div className="divide-y divide-primary/10">
                    {plan.mathSteps.map((step, i) => (
                      <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase text-primary/60">{step.label}</p>
                          <p className="text-sm font-mono text-slate-600">{step.operation}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-headline font-bold text-slate-900">{step.result}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-headline font-bold flex items-center text-slate-800">
                <Clock className="w-5 h-5 mr-2 text-primary" /> Hitos y Planificación
              </h2>
              <div className="space-y-4">
                {plan.milestones.map((ms, i) => (
                  <div key={i} className="flex gap-4 items-start relative pb-4 last:pb-0">
                    {i !== plan.milestones.length - 1 && <div className="absolute left-6 top-10 w-0.5 h-full bg-primary/20" />}
                    <div className="w-12 h-12 rounded-full bg-white border-2 border-primary flex items-center justify-center shrink-0 font-bold text-primary z-10 shadow-sm">
                      {ms.month}
                    </div>
                    <div className="pt-2">
                      <p className="font-bold text-slate-900">{ms.label}</p>
                      <p className="text-sm text-muted-foreground">{ms.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* COLUMNA DERECHA: REPARTO Y RECOMENDACIONES */}
          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="font-headline font-bold flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" /> Reparto del Esfuerzo Extra
              </h3>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="p-4 space-y-4">
                  {plan.split ? (
                    plan.split.map((s, i) => {
                      const member = plan.snapshot.members.find(m => m.id === s.memberId);
                      return (
                        <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                          <div className="text-sm">
                            <p className="font-bold">{member?.name}</p>
                            <p className="text-xs text-muted-foreground">Ingreso: €{member?.incomeNetMonthly}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">€{s.monthlyContribution}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">Extra/Mes</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-4">
                      <User className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold">Plan Individual</p>
                      <p className="text-xs text-muted-foreground">Todo el esfuerzo recae en ti.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <h3 className="font-headline font-bold flex items-center">
                <Info className="w-4 h-4 mr-2 text-primary" /> Análisis del Asesor AI
              </h3>
              <div className="space-y-3">
                {plan.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border shadow-sm space-y-1">
                    <p className="text-sm font-bold leading-tight">{rec}</p>
                    <p className="text-xs text-muted-foreground">{plan.explanations[i]}</p>
                  </div>
                ))}
              </div>
            </section>

            {plan.warnings.length > 0 && (
              <Alert variant="destructive" className="bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">AVISOS</AlertTitle>
                <AlertDescription className="text-xs">
                  {plan.warnings.join('. ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <footer className="pt-12 border-t text-center">
          <p className="text-xs text-muted-foreground max-w-lg mx-auto mb-4 italic">
            *Nota: Los cálculos asumen que el último mes solo se abona el capital pendiente real, por lo que el pago podría ser inferior al total mensual propuesto.
          </p>
          <Button variant="outline" className="rounded-full" onClick={() => router.push('/onboarding')}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reajustar Datos
          </Button>
        </footer>
      </main>
    </div>
  );
}