'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinancialSnapshot, Goal, PlanResult } from '@/lib/types';
import { generatePersonalizedPlan } from '@/ai/flows/personalized-financial-plan';
import { explainRecommendations } from '@/ai/flows/explain-recommendations';
import { PiggyBank, Calculator, Clock, Users, Info, RefreshCw, FileText, Zap, AlertCircle, ArrowRight } from 'lucide-react';

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
      setError("Hubo un problema al generar tu plan financiero. Reintenta en unos segundos.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Zap className="w-12 h-12 text-primary animate-pulse mb-4" />
        <h2 className="text-xl font-headline font-bold">Equilibrando tus pagos...</h2>
        <p className="text-muted-foreground mt-2 text-center">Estamos dividiendo el esfuerzo para que sea constante mes a mes.</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-headline font-bold">¡Ups! Algo salió mal</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={loadPlan} className="rounded-full">Reintentar</Button>
      </div>
    );
  }

  const avgBalancedPayment = plan.monthlyTable[0]?.totalPayment || 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
          <FileText className="w-4 h-4 mr-2" /> Imprimir
        </Button>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-headline font-bold">Plan para {plan.goal.name}</h1>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-white">Pago Mensual Fijo: €{avgBalancedPayment}</Badge>
            <Badge className="bg-primary">Duración: {plan.estimatedMonthsToGoal} meses</Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="py-4 bg-slate-50">
              <CardDescription className="text-xs uppercase font-bold">Sobrante Mensual</CardDescription>
              <CardTitle className="text-2xl">€{plan.monthlySurplus}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="py-4 bg-primary/5">
              <CardDescription className="text-xs uppercase font-bold">Esfuerzo Extra / Mes</CardDescription>
              <CardTitle className="text-2xl text-primary">€{plan.monthlyContributionTotal}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="py-4 bg-orange-50">
              <CardDescription className="text-xs uppercase font-bold text-orange-600">Total Pago Equilibrado</CardDescription>
              <CardTitle className="text-2xl text-orange-600">€{avgBalancedPayment}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-headline font-bold flex items-center"><Calculator className="w-5 h-5 mr-2" /> Lógica de Cálculo</h2>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="divide-y divide-primary/10 p-0">
                  {plan.mathSteps.map((step, i) => (
                    <div key={i} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold uppercase text-primary/60">{step.label}</p>
                        <p className="text-sm font-mono">{step.operation}</p>
                      </div>
                      <p className="text-lg font-bold">{step.result}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-headline font-bold flex items-center"><Clock className="w-5 h-5 mr-2" /> Calendario de Amortización</h2>
              <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Cuota Actual</TableHead>
                      <TableHead>Aporte Extra</TableHead>
                      <TableHead>Total Pago</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.monthlyTable.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-bold">Mes {row.month}</TableCell>
                        <TableCell>€{row.fixedPayment}</TableCell>
                        <TableCell className="text-primary font-medium">+€{row.extraContribution}</TableCell>
                        <TableCell className="font-bold">€{row.totalPayment}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">€{row.remainingPrincipal}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="font-headline font-bold flex items-center"><Users className="w-4 h-4 mr-2" /> Reparto del Esfuerzo</h3>
              <Card className="bg-white">
                <CardContent className="p-4 space-y-4">
                  {plan.split ? (
                    plan.split.map((s, i) => {
                      const member = plan.snapshot.members.find(m => m.id === s.memberId);
                      return (
                        <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                          <span className="text-sm font-medium">{member?.name}</span>
                          <span className="font-bold text-primary">€{s.monthlyContribution}</span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-center py-4 text-muted-foreground">Plan individual.</p>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <h3 className="font-headline font-bold flex items-center"><Info className="w-4 h-4 mr-2" /> Consejos AI</h3>
              <div className="space-y-2">
                {plan.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-white rounded-lg border shadow-sm">
                    <p className="text-xs font-bold">{rec}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{plan.explanations[i]}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
