'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialSnapshot, Goal, PlanResult, MultiPlanResult, FinancialStrategy } from '@/lib/types';
import { calculateAllFinancialPlans } from '@/lib/finance-engine';
import { PiggyBank, Calculator, Clock, Users, Info, FileText, Zap, AlertCircle, TrendingDown, Banknote, UserCheck, ShieldCheck, Scale, ArrowRightCircle } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MultiPlanResult | null>(null);
  const [activeTab, setActiveTab] = useState<FinancialStrategy>('balanced');

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

    try {
      const snapshot = JSON.parse(storedSnap) as FinancialSnapshot;
      const goal = JSON.parse(storedGoal) as Goal;

      const multiResults = calculateAllFinancialPlans(snapshot, goal, storedSplit || 'equal');
      setResults(multiResults);
    } catch (e: any) {
      console.error("Error generating plans", e);
      setError("Hubo un problema al calcular tus planes financieros.");
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
        <h2 className="text-xl font-headline font-bold">Calculando escenarios matemáticos...</h2>
        <p className="text-muted-foreground mt-2 text-center">Generando comparativas de ahorro y amortización.</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-headline font-bold">¡Ups! Algo salió mal</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push('/onboarding')} className="rounded-full">Volver al Onboarding</Button>
      </div>
    );
  }

  const currentPlan = results[activeTab];

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
        <header className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Comparativa de Escenarios: {currentPlan.goal.name}</h1>
            <p className="text-muted-foreground">Analiza cómo cambia tu futuro según el esfuerzo mensual aplicado.</p>
          </div>

          <Card className="border-none shadow-sm overflow-hidden bg-slate-50/50">
            <Table>
              <TableHeader className="bg-slate-100/80">
                <TableRow>
                  <TableHead className="font-bold">Estrategia</TableHead>
                  <TableHead className="text-center">Aporte Extra</TableHead>
                  <TableHead className="text-center">Fondo Emergencia</TableHead>
                  <TableHead className="text-center">Plazo</TableHead>
                  <TableHead className="text-center">Interés Total</TableHead>
                  <TableHead className="text-right">Ahorro Emerg. Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(['emergency_first', 'balanced', 'goal_first'] as FinancialStrategy[]).map((strat) => {
                  const p = results[strat];
                  const isSelected = activeTab === strat;
                  return (
                    <TableRow 
                      key={strat} 
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-slate-100/50'}`}
                      onClick={() => setActiveTab(strat)}
                    >
                      <TableCell className="font-bold">
                        <div className="flex items-center gap-2">
                          {strat === 'emergency_first' && <ShieldCheck className="w-4 h-4 text-accent" />}
                          {strat === 'balanced' && <Scale className="w-4 h-4 text-primary" />}
                          {strat === 'goal_first' && <Zap className="w-4 h-4 text-orange-500" />}
                          {strat === 'emergency_first' ? 'Prioridad Seguridad' : strat === 'balanced' ? 'Equilibrado' : 'Ahorro Máximo'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono">€{p.monthlyContributionExtra}</TableCell>
                      <TableCell className="text-center font-mono text-accent font-bold">€{p.monthlyEmergencyContribution}</TableCell>
                      <TableCell className="text-center">{p.estimatedMonthsToGoal} meses</TableCell>
                      <TableCell className="text-center text-red-500 font-bold">€{p.totalInterestPaid}</TableCell>
                      <TableCell className="text-right text-accent font-bold">€{p.totalEmergencySaved}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </header>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as FinancialStrategy)} className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold">Detalle de Estrategia Seleccionada</h2>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="emergency_first">Seguridad</TabsTrigger>
              <TabsTrigger value="balanced">Equilibrado</TabsTrigger>
              <TabsTrigger value="goal_first">Máximo</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-8 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-slate-50">
                  <CardDescription className="text-[10px] uppercase font-bold">Meta Total</CardDescription>
                  <CardTitle className="text-xl">€{currentPlan.goal.targetAmount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-primary/5">
                  <CardDescription className="text-[10px] uppercase font-bold text-primary">Aporte Extra</CardDescription>
                  <CardTitle className="text-xl text-primary">€{currentPlan.monthlyContributionExtra}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-green-50">
                  <CardDescription className="text-[10px] uppercase font-bold text-green-700">Fondo Emerg.</CardDescription>
                  <CardTitle className="text-xl text-green-700">€{currentPlan.monthlyEmergencyContribution}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-orange-50">
                  <CardDescription className="text-[10px] uppercase font-bold text-orange-700">Plazo Final</CardDescription>
                  <CardTitle className="text-xl text-orange-700">{currentPlan.estimatedMonthsToGoal} meses</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-lg font-headline font-bold flex items-center">
                    <Calculator className="w-5 h-5 mr-2" /> Validación del Cálculo Mensual
                  </h3>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="divide-y divide-primary/10 p-0">
                      {currentPlan.mathSteps.map((step, i) => (
                        <div key={i} className="p-4 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-primary/60">{step.label}</p>
                            <p className="text-sm font-mono">{step.operation}</p>
                          </div>
                          <p className="text-base font-bold">{step.result}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-headline font-bold flex items-center">
                    <Clock className="w-5 h-5 mr-2" /> Plan de Evolución Mensual
                  </h3>
                  <Card className="border-none shadow-sm overflow-hidden">
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-16">Mes</TableHead>
                            <TableHead>Interés</TableHead>
                            <TableHead>Aporte Extra</TableHead>
                            <TableHead className="text-accent">+ Fondo Emerg.</TableHead>
                            <TableHead className="text-right">Cap. Vivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentPlan.monthlyTable.map((row) => (
                            <TableRow key={row.month}>
                              <TableCell className="font-bold">M{row.month}</TableCell>
                              <TableCell className="text-red-500 text-xs">€{row.interestPaid.toFixed(2)}</TableCell>
                              <TableCell className="text-primary font-bold text-xs">€{row.extraPrincipalPaid.toFixed(2)}</TableCell>
                              <TableCell className="text-accent font-bold text-xs">€{row.emergencyFundContribution.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-xs">€{row.remainingPrincipal.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </section>
              </div>

              <div className="space-y-8">
                {currentPlan.split && currentPlan.split.length > 0 && (
                  <section className="space-y-4">
                    <h3 className="font-headline font-bold flex items-center text-primary"><Users className="w-4 h-4 mr-2" /> Reparto del Ahorro Extra</h3>
                    <Card className="bg-white border-primary/20 shadow-md">
                      <CardContent className="p-4 space-y-4">
                        {currentPlan.split.map((s, i) => {
                          const member = currentPlan.snapshot.members.find(m => m.id === s.memberId);
                          const percentage = currentPlan.monthlyContributionExtra > 0 ? ((s.monthlyContribution / currentPlan.monthlyContributionExtra) * 100).toFixed(0) : "0";
                          return (
                            <div key={i} className="space-y-1 pb-3 border-b last:border-0 last:pb-0">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold flex items-center">
                                  <UserCheck className="w-3 h-3 mr-1 text-primary" /> {member?.name}
                                </span>
                                <Badge variant="outline" className="text-[10px]">{percentage}%</Badge>
                              </div>
                              <div className="flex justify-between items-baseline">
                                <p className="text-xs text-muted-foreground">Aporte mensual:</p>
                                <span className="font-bold text-lg text-primary">€{s.monthlyContribution}</span>
                              </div>
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </section>
                )}

                <section className="space-y-4">
                  <h3 className="font-headline font-bold flex items-center"><Info className="w-4 h-4 mr-2" /> ¿Por qué este escenario?</h3>
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed text-xs space-y-3">
                    {activeTab === 'emergency_first' && (
                      <p>Este plan es para quienes duermen tranquilos sabiendo que tienen ahorros. Solo el 25% de tu sobrante va a la deuda; el resto blinda tu economía contra imprevistos.</p>
                    )}
                    {activeTab === 'balanced' && (
                      <p>La vía media. Atacas la deuda con fuerza pero sin descuidar tu crecimiento patrimonial en el fondo de emergencia. Es el más recomendado para la mayoría de hogares.</p>
                    )}
                    {activeTab === 'goal_first' && (
                      <p>Guerra total a los intereses bancarios. Casi todo tu sobrante va directo al capital vivo de la deuda. Es el camino más rápido para ser libre financieramente.</p>
                    )}
                    <div className="flex items-center text-primary font-bold">
                      <ArrowRightCircle className="w-4 h-4 mr-1" />
                      <span>Impacto total en intereses: €{currentPlan.totalInterestPaid}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
