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
import { PiggyBank, Calculator, Clock, Users, Info, FileText, Zap, AlertCircle, TrendingDown, ArrowDownToLine, Banknote, UserCheck } from 'lucide-react';

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
        <h2 className="text-xl font-headline font-bold">Calculando amortización...</h2>
        <p className="text-muted-foreground mt-2 text-center">Estamos aplicando el método francés y optimizando tus intereses.</p>
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

  const totalInterest = plan.monthlyTable.reduce((acc, row) => acc + row.interestPaid, 0);

  return (
    <div className="min-h-screen bg-background pb-12">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/onboarding')}>Nuevo Plan</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-headline font-bold">Plan Bancario para {plan.goal.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white">TIN: {plan.goal.tin}%</Badge>
            <Badge className="bg-primary">Plazo: {plan.estimatedMonthsToGoal} meses</Badge>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
              Ahorro Total en Intereses Estimado
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="py-4 bg-slate-50">
              <CardDescription className="text-xs uppercase font-bold flex items-center">
                <TrendingDown className="w-3 h-3 mr-1" /> Capital Vivo
              </CardDescription>
              <CardTitle className="text-2xl">€{plan.goal.targetAmount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="py-4 bg-primary/5">
              <CardDescription className="text-xs uppercase font-bold flex items-center">
                <ArrowDownToLine className="w-3 h-3 mr-1" /> Aporte Extra (Hogar)
              </CardDescription>
              <CardTitle className="text-2xl text-primary">€{plan.monthlyContributionTotal}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm">
            <CardHeader className="py-4 bg-green-50">
              <CardDescription className="text-xs uppercase font-bold flex items-center text-green-700">
                <Banknote className="w-3 h-3 mr-1" /> Cuota Mensual Actual
              </CardDescription>
              <CardTitle className="text-2xl text-green-700">€{plan.goal.existingMonthlyPayment}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-headline font-bold flex items-center">
                <Calculator className="w-5 h-5 mr-2" /> Ejercicio Matemático Detallado
              </h2>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="divide-y divide-primary/10 p-0">
                  {plan.mathSteps.map((step, i) => (
                    <div key={i} className="p-4 flex justify-between items-center">
                      <div className="max-w-[70%]">
                        <p className="text-xs font-bold uppercase text-primary/60">{step.label}</p>
                        <p className="text-sm font-mono break-words">{step.operation}</p>
                      </div>
                      <p className="text-lg font-bold whitespace-nowrap">{step.result}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground bg-slate-100 p-3 rounded-lg border border-slate-200">
                <strong>Nota bancaria:</strong> Cada mes sumamos tu cuota ordinaria (€{plan.goal.existingMonthlyPayment}) y tu ahorro extra (€{plan.monthlyContributionTotal}). Los intereses se calculan sobre el saldo vivo, y el resto amortiza capital.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-headline font-bold flex items-center">
                <Clock className="w-5 h-5 mr-2" /> Tabla de Amortización (Método Francés + Extra)
              </h2>
              <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-16">Mes</TableHead>
                      <TableHead>Interés</TableHead>
                      <TableHead>Capital Ord.</TableHead>
                      <TableHead>Aporte Extra</TableHead>
                      <TableHead>Total Pago</TableHead>
                      <TableHead className="text-right">Capital Vivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.monthlyTable.map((row) => (
                      <TableRow key={row.month} className={row.month % 2 === 0 ? 'bg-slate-50/30' : ''}>
                        <TableCell className="font-bold">M{row.month}</TableCell>
                        <TableCell className="text-red-500 text-xs font-medium">€{row.interestPaid.toFixed(2)}</TableCell>
                        <TableCell className="text-xs">€{row.regularPrincipalPaid.toFixed(2)}</TableCell>
                        <TableCell className="text-primary font-bold">€{row.extraPrincipalPaid.toFixed(2)}</TableCell>
                        <TableCell className="font-bold text-xs">€{row.totalPaid.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-medium">€{row.remainingPrincipal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h3 className="font-headline font-bold flex items-center text-primary"><Users className="w-4 h-4 mr-2" /> Reparto del Esfuerzo Extra</h3>
              <Card className="bg-white border-primary/20 shadow-md">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-medium text-primary">Cálculo por Miembro</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {plan.split && plan.split.length > 0 ? (
                    <div className="space-y-4">
                      {plan.split.map((s, i) => {
                        const member = plan.snapshot.members.find(m => m.id === s.memberId);
                        const percentage = ((s.monthlyContribution / plan.monthlyContributionExtra) * 100).toFixed(0);
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold flex items-center">
                                <UserCheck className="w-3 h-3 mr-1 text-primary" /> {member?.name}
                              </span>
                              <Badge variant="outline" className="text-[10px]">{percentage}% del extra</Badge>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <p className="text-xs text-muted-foreground">Aporte mensual meta:</p>
                              <span className="font-bold text-lg text-primary">€{s.monthlyContribution}</span>
                            </div>
                          </div>
                        )
                      })}
                      <div className="pt-2 border-t mt-2">
                        <p className="text-[11px] font-medium text-muted-foreground bg-slate-50 p-2 rounded italic leading-relaxed">
                          "{plan.splitReasoning}"
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                       <p className="text-sm text-muted-foreground">Plan individual.</p>
                       <p className="text-xs font-bold text-primary">€{plan.monthlyContributionTotal}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section className="space-y-4">
              <h3 className="font-headline font-bold flex items-center"><Info className="w-4 h-4 mr-2" /> Consejos del Asesor AI</h3>
              <div className="space-y-3">
                {plan.recommendations.map((rec, i) => (
                  <div key={i} className="p-4 bg-white rounded-xl border shadow-sm space-y-2">
                    <p className="text-sm font-bold text-primary">{rec}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{plan.explanations[i]}</p>
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
