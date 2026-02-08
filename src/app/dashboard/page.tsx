'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FinancialSnapshot, Goal, PlanResult } from '@/lib/types';
import { generatePersonalizedPlan } from '@/ai/flows/personalized-financial-plan';
import { explainRecommendations } from '@/ai/flows/explain-recommendations';
import { generatePlanB } from '@/ai/flows/generate-plan-b';
import { PiggyBank, Target, Calendar, TrendingUp, AlertCircle, FileText, Info, Zap, Users, CheckCircle2, Flag, Clock, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanResult | null>(null);

  useEffect(() => {
    async function loadPlan() {
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
          totalFixedCostsMonthly: snapshot.totalFixedCosts,
          totalVariableCostsMonthly: snapshot.totalVariableCosts,
          emergencyFundAmount: snapshot.emergencyFundAmount,
          goalName: goal.name,
          goalTargetAmount: goal.targetAmount,
          goalUrgencyLevel: goal.urgencyLevel,
          strategy: goal.strategy || 'emergency_first',
          isExistingDebt: goal.isExistingDebt,
          existingMonthlyPayment: goal.existingMonthlyPayment,
          tin: goal.tin,
          tae: goal.tae,
          remainingPrincipal: goal.targetAmount,
          members: snapshot.members.map(m => ({
            memberId: m.id,
            incomeNetMonthly: m.incomeNetMonthly
          }))
        });

        const explanation = await explainRecommendations({
          recommendations: result.recommendations,
          monthlySurplus: result.monthlySurplus,
          emergencyFundAmount: snapshot.emergencyFundAmount,
          emergencyTarget: (snapshot.totalFixedCosts + snapshot.totalVariableCosts) * 3,
          goalName: goal.name,
          goalTargetAmount: goal.targetAmount,
          monthlyContributionTotal: result.monthlyContributionTotal,
          estimatedMonthsToGoal: result.estimatedMonthsToGoal
        });

        let planBDesc = '';
        if (result.monthlySurplus <= 0 || result.estimatedMonthsToGoal > 48) {
          const pb = await generatePlanB({
            monthlySurplus: result.monthlySurplus,
            totalFixedCosts: snapshot.totalFixedCosts,
            totalVariableCosts: snapshot.totalVariableCosts,
            targetAmount: goal.targetAmount,
            targetDate: null,
            monthlyContributionPossible: result.monthlySurplus * 0.9
          });
          planBDesc = pb.planBDescription;
        }

        setPlan({
          snapshot,
          goal,
          monthlySurplus: result.monthlySurplus,
          priority: result.priority as any,
          monthlyContributionTotal: result.monthlyContributionTotal,
          estimatedMonthsToGoal: result.estimatedMonthsToGoal,
          recommendations: result.recommendations,
          explanations: explanation.explanations,
          milestones: result.milestones || [],
          split: result.split,
          warnings: result.warnings,
          planB: planBDesc
        });
      } catch (e) {
        console.error("Error generating plan", e);
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-center">
        <div className="animate-spin mb-4"><Zap className="w-12 h-12 text-primary" /></div>
        <h2 className="text-xl font-headline font-bold">Generando tu plan financiero optimizado...</h2>
        <p className="text-muted-foreground max-w-sm mt-2">Analizando ingresos, gastos y aplicando tu estrategia de prioridad en español.</p>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <PiggyBank className="text-primary w-6 h-6" />
          <span className="font-headline font-bold text-lg">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
           <Button variant="outline" size="sm" onClick={() => window.print()}>
             <FileText className="w-4 h-4 mr-2" /> Exportar
           </Button>
           <Button variant="ghost" size="sm" onClick={() => router.push('/onboarding')}>
             <TrendingUp className="w-4 h-4 mr-2" /> Nuevo Plan
           </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold">Resumen de tu Plan</h1>
            <p className="text-muted-foreground">Generado el {new Date().toLocaleDateString()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white px-4 py-1">
              Estrategia: {plan.goal.strategy === 'emergency_first' ? 'Seguridad' : plan.goal.strategy === 'balanced' ? 'Equilibrado' : 'Meta Directa'}
            </Badge>
            <Badge variant={plan.priority === 'emergency_first' ? 'destructive' : 'default'} className="px-4 py-1">
              {plan.priority === 'emergency_first' ? 'Prioridad: Emergencia' : plan.priority === 'balanced' ? 'Prioridad: Mixta' : 'Prioridad: Meta'}
            </Badge>
            {plan.goal.isExistingDebt && (
              <Badge variant="secondary" className="px-4 py-1 bg-blue-100 text-blue-700 border-blue-200">
                Amortización de Deuda
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border-none shadow-md">
            <CardHeader className="pb-2">
              <CardDescription>Sobrante Mensual</CardDescription>
              <CardTitle className="text-2xl text-primary font-bold">€{plan.monthlySurplus.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={Math.min(100, (plan.monthlySurplus / (plan.snapshot.members.reduce((a,b)=>a+b.incomeNetMonthly,0) || 1)) * 100)} className="h-2" />
            </CardContent>
          </Card>
          <Card className="bg-white border-none shadow-md">
            <CardHeader className="pb-2">
              <CardDescription>Aporte Extra</CardDescription>
              <CardTitle className="text-2xl text-accent font-bold">€{plan.monthlyContributionTotal.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-accent text-xs font-bold">
                <Target className="w-3 h-3 mr-1" /> 
                {plan.goal.isExistingDebt ? `+ €${plan.goal.existingMonthlyPayment} actuales` : 'Mensual'}
              </div>
            </CardContent>
          </Card>
          {plan.goal.isExistingDebt && (
            <Card className="bg-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription>Carga de Interés (TAE)</CardDescription>
                <CardTitle className="text-2xl text-orange-500 font-bold">{plan.goal.tae}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-orange-400 text-xs">
                  <Percent className="w-3 h-3 mr-1" /> Análisis de costo financiero
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="bg-white border-none shadow-md">
            <CardHeader className="pb-2">
              <CardDescription>Plazo Estimado</CardDescription>
              <CardTitle className="text-2xl text-foreground font-bold">{plan.estimatedMonthsToGoal} meses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-muted-foreground text-xs">
                <Calendar className="w-3 h-3 mr-1" /> Finaliza: {new Date(Date.now() + plan.estimatedMonthsToGoal * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </div>
            </CardContent>
          </Card>
        </div>

        {plan.warnings.length > 0 && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive-foreground">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Alertas Financieras</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside text-sm">
                {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-headline font-bold flex items-center mb-6">
                <Clock className="w-5 h-5 mr-2 text-primary" /> Línea de Tiempo de tu Progreso
              </h2>
              <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                <div className="relative">
                  <span className="absolute -left-[29px] top-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-primary">Hoy</p>
                    <p className="text-muted-foreground text-sm">
                      Inicio del plan con estrategia {plan.goal.strategy === 'emergency_first' ? 'Seguridad' : plan.goal.strategy === 'balanced' ? 'Equilibrada' : 'Meta Directa'}.
                    </p>
                  </div>
                </div>

                {plan.milestones.map((ms, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[29px] top-1 w-6 h-6 rounded-full bg-accent flex items-center justify-center ring-4 ring-background">
                      <Clock className="w-4 h-4 text-white" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-accent">Mes {ms.month}</p>
                      <p className="font-bold text-sm">{ms.label}</p>
                      <p className="text-muted-foreground text-sm">{ms.description}</p>
                    </div>
                  </div>
                ))}

                <div className="relative">
                  <span className="absolute -left-[29px] top-1 w-6 h-6 rounded-full bg-foreground flex items-center justify-center ring-4 ring-background">
                    <Flag className="w-4 h-4 text-white" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Meta Finalizada</p>
                    <p className="text-muted-foreground text-sm">Objetivo {plan.goal.name} completado con éxito.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-headline font-bold flex items-center mb-4">
                <Info className="w-5 h-5 mr-2 text-primary" /> Recomendaciones Expertas
              </h2>
              <div className="space-y-4">
                {plan.recommendations.map((rec, i) => (
                  <Card key={i} className="border-l-4 border-l-primary shadow-sm bg-white">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-bold">{rec}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0 pb-3">
                      <p className="text-sm text-muted-foreground">{plan.explanations[i] || 'Análisis basado en tu perfil financiero.'}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-headline font-bold flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary" /> Reparto del Esfuerzo Extra
            </h2>
            <Card className="border-none shadow-lg bg-white">
              <CardContent className="pt-6">
                {plan.split && plan.split.length > 0 ? (
                  <div className="space-y-6">
                    {plan.split.map((s, i) => {
                      const member = plan.snapshot.members.find(m => m.id === s.memberId);
                      return (
                        <div key={i} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                          <div>
                            <p className="font-bold">{member?.name || 'Miembro'}</p>
                            <p className="text-xs text-muted-foreground">Ingreso: €{member?.incomeNetMonthly}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-headline font-bold text-primary">€{s.monthlyContribution}</p>
                            <p className="text-xs text-muted-foreground">Aporte extra sugerido</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Aporte extra total: €{plan.monthlyContributionTotal}/mes.
                  </div>
                )}
              </CardContent>
            </Card>

            <h2 className="text-xl font-headline font-bold flex items-center pt-4">
              <Zap className="w-5 h-5 mr-2 text-primary" /> Salud Financiera
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-xs text-muted-foreground">Ratio Gastos/Ingreso</p>
                <p className="text-lg font-bold">
                  {Math.round(((plan.snapshot.totalFixedCosts + plan.snapshot.totalVariableCosts) / (plan.snapshot.members.reduce((a,b)=>a+b.incomeNetMonthly,0) || 1)) * 100)}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <p className="text-xs text-muted-foreground">Cobertura Emergencia</p>
                <p className="text-lg font-bold">
                  {Math.round(plan.snapshot.emergencyFundAmount / (plan.snapshot.totalFixedCosts + plan.snapshot.totalVariableCosts || 1))} meses
                </p>
              </div>
            </div>
            
            {plan.goal.isExistingDebt && (
              <Card className="bg-blue-50 border-blue-100 border shadow-none mt-4">
                <CardContent className="p-4 flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="text-xs text-blue-700 leading-relaxed">
                    <strong>Análisis de Deuda:</strong> La cuota de <strong>€{plan.goal.existingMonthlyPayment}</strong> tiene un impacto {plan.goal.tae && plan.goal.tae > 7 ? 'alto' : 'moderado'} debido a los intereses. Amortizar extra ahora te ahorrará intereses significativos a largo plazo.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <section className="pt-12 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-muted-foreground text-xs max-w-md">
              Este plan utiliza modelos de IA para proyectar la amortización y el ahorro basándose en tus datos actuales. Revisa tu progreso mensualmente.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => window.print()} className="rounded-full px-8">Imprimir Informe</Button>
              <Button variant="outline" className="rounded-full px-8" onClick={() => router.push('/')}>Volver al Inicio</Button>
            </div>
        </section>
      </main>
    </div>
  );
}
