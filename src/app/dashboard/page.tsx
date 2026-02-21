'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FinancialSnapshot, Goal, PlanResult, MultiPlanResult, FinancialStrategy, Roadmap } from '@/lib/types';
import { calculateAllFinancialPlans } from '@/lib/finance-engine';
import { PiggyBank, Calculator, Clock, Users, Info, FileText, Zap, AlertCircle, TrendingDown, ShieldCheck, Scale, CheckCircle2, UserCheck, ArrowRightCircle, ListOrdered, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
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

  const addToRoadmap = () => {
    if (!results) return;
    const selectedPlan = results[activeTab];
    
    try {
      const storedRoadmap = localStorage.getItem('financiMate_roadmap');
      let roadmap: Roadmap = storedRoadmap ? JSON.parse(storedRoadmap) : { items: [], lastUpdated: '' };
      
      roadmap.items.push(selectedPlan);
      roadmap.lastUpdated = new Date().toISOString();
      
      localStorage.setItem('financiMate_roadmap', JSON.stringify(roadmap));
      
      toast({
        title: "¡Plan añadido!",
        description: `${selectedPlan.goal.name} se ha añadido a tu línea temporal.`,
      });
      
      router.push('/roadmap');
    } catch (e) {
      console.error("Error adding to roadmap", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Zap className="w-12 h-12 text-primary animate-pulse mb-4" />
        <h2 className="text-xl font-headline font-bold">Calculando escenarios matemáticos...</h2>
        <p className="text-muted-foreground mt-2 text-center">Generando comparativas de ahorro y amortización realistas.</p>
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
  const isFundInitiallyCompleted = currentPlan.snapshot.emergencyFundAmount >= currentPlan.targetEmergencyFund;

  return (
    <div className="min-h-screen bg-background pb-12">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/roadmap')}>
            <ListOrdered className="w-4 h-4 mr-2" /> Mi Roadmap
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/onboarding')}>Nuevo Plan</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Comparativa de Escenarios: {currentPlan.goal.name}</h1>
            <p className="text-muted-foreground">Analiza cómo cambia tu futuro según el esfuerzo mensual aplicado.</p>
          </div>
          <Button onClick={addToRoadmap} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg">
            Añadir este Plan al Roadmap <ArrowRightCircle className="ml-2 w-5 h-5" />
          </Button>
        </header>

        {isFundInitiallyCompleted && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 font-bold">Fondo de Emergencia Completado</AlertTitle>
            <AlertDescription className="text-green-700 text-sm">
              Al tener ya cubierto tu colchón de seguridad de <strong>€{currentPlan.targetEmergencyFund}</strong>, el sistema ha redirigido automáticamente todo tu ahorro extra hacia la meta. En este estado, todas las estrategias ofrecen el máximo rendimiento.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-sm overflow-hidden bg-slate-50/50">
          <Table>
            <TableHeader className="bg-slate-100/80">
              <TableRow>
                <TableHead className="font-bold">Estrategia</TableHead>
                <TableHead className="text-center">Aporte Meta Extra</TableHead>
                <TableHead className="text-center">Aporte Emerg. Extra</TableHead>
                <TableHead className="text-center">Plazo</TableHead>
                <TableHead className="text-center">Interés Total</TableHead>
                <TableHead className="text-right">Fondo Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(['emergency_first', 'balanced', 'goal_first'] as FinancialStrategy[]).map((strat) => {
                const p = results[strat];
                const isSelected = activeTab === strat;
                const isFundCompleted = p.totalEmergencySaved >= p.targetEmergencyFund;
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
                        <div className="flex flex-col">
                          <span>{strat === 'emergency_first' ? 'Prioridad Seguridad' : strat === 'balanced' ? 'Equilibrado' : 'Ahorro Máximo'}</span>
                          {isFundInitiallyCompleted && <span className="text-[10px] text-green-600 font-normal uppercase">Modo Acelerado</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono">€{p.monthlyContributionExtra}</TableCell>
                    <TableCell className="text-center font-mono text-accent font-bold">
                      {isFundInitiallyCompleted ? '€0' : `€${p.extraEmergencyContribution}`}
                      {isFundInitiallyCompleted && <Badge variant="outline" className="ml-2 scale-75 bg-white text-green-600 border-green-200">Full</Badge>}
                    </TableCell>
                    <TableCell className="text-center">{p.estimatedMonthsToGoal} meses</TableCell>
                    <TableCell className="text-center text-red-500 font-bold">€{p.totalInterestPaid}</TableCell>
                    <TableCell className="text-right text-accent font-bold flex items-center justify-end gap-1">
                      €{p.totalEmergencySaved}
                      {isFundCompleted && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

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
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-slate-50">
                  <CardDescription className="text-[10px] uppercase font-bold">Meta Total</CardDescription>
                  <CardTitle className="text-xl">€{currentPlan.goal.targetAmount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-primary/5">
                  <CardDescription className="text-[10px] uppercase font-bold text-primary">Intereses Deuda</CardDescription>
                  <CardTitle className="text-xl text-primary">€{currentPlan.totalInterestPaid}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-green-50">
                  <CardDescription className="text-[10px] uppercase font-bold text-green-700">Intereses Ganados</CardDescription>
                  <CardTitle className="text-xl text-green-700">€{currentPlan.totalSavingsInterestEarned}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-orange-50">
                  <CardDescription className="text-[10px] uppercase font-bold text-orange-700">Comisiones Banco</CardDescription>
                  <CardTitle className="text-xl text-orange-700">€{currentPlan.totalCommissionPaid}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-none shadow-sm md:hidden lg:block">
                <CardHeader className="py-4 bg-slate-100">
                  <CardDescription className="text-[10px] uppercase font-bold">Fondo Final</CardDescription>
                  <CardTitle className="text-xl">€{currentPlan.totalEmergencySaved}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-lg font-headline font-bold flex items-center">
                    <Calculator className="w-5 h-5 mr-2" /> Ejercicio Matemático Detallado
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-headline font-bold flex items-center">
                      <Clock className="w-5 h-5 mr-2" /> Evolución Mensual Detallada
                    </h3>
                  </div>
                  <Card className="border-none shadow-sm overflow-hidden">
                    <div className="max-h-[500px] overflow-auto">
                      <Table>
                        <TableHeader className="bg-slate-100 sticky top-0 z-10 text-[10px]">
                          <TableRow className="hover:bg-transparent border-b-2">
                            <TableHead rowSpan={2} className="w-24 text-center border-r font-bold">Mes</TableHead>
                            <TableHead colSpan={3} className="text-center border-r bg-red-50/30">Pago Meta / Deuda</TableHead>
                            <TableHead colSpan={4} className="text-center border-r bg-green-50/30 text-green-800">Crecimiento Fondo Emergencia</TableHead>
                            <TableHead rowSpan={2} className="text-right font-bold">Restante Meta</TableHead>
                          </TableRow>
                          <TableRow className="hover:bg-transparent tracking-wider font-bold">
                            <TableHead className="text-center bg-red-50/50">Int.</TableHead>
                            <TableHead className="text-center bg-red-50/50 text-orange-600">Comis.</TableHead>
                            <TableHead className="text-center bg-red-50/50 border-r text-primary font-bold">Neto</TableHead>
                            <TableHead className="text-center bg-green-50/50">Int. Ganado</TableHead>
                            <TableHead className="text-center bg-green-50/50">Cuota</TableHead>
                            <TableHead className="text-center bg-green-50/50 text-accent">Extra</TableHead>
                            <TableHead className="text-center bg-green-50/50 border-r font-bold">Acumulado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentPlan.monthlyTable.map((row) => (
                            <TableRow key={row.month} className="hover:bg-slate-50 transition-colors">
                              <TableCell className="font-bold text-center border-r text-[10px]">{row.monthName}</TableCell>
                              <TableCell className="text-center text-red-500 font-mono text-[10px]">€{row.interestPaid.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-orange-500 font-mono text-[10px]">€{row.commissionPaid.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-primary font-bold font-mono text-[10px] border-r">€{row.extraPrincipalPaid.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-green-600 font-mono text-[10px]">€{row.savingsInterestEarned.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-muted-foreground font-mono text-[10px]">€{row.baseEmergencyContribution.toFixed(2)}</TableCell>
                              <TableCell className="text-center text-accent font-bold font-mono text-[10px]">€{row.extraEmergencyContribution.toFixed(2)}</TableCell>
                              <TableCell className="text-center bg-green-50/30 font-bold font-mono text-[10px] border-r">
                                €{row.cumulativeEmergencyFund.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-[10px] font-bold">€{row.remainingPrincipal.toFixed(2)}</TableCell>
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
                                <p className="text-xs text-muted-foreground">Aporte mensual inicial:</p>
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
                  <h3 className="font-headline font-bold flex items-center"><Info className="w-4 h-4 mr-2" /> Análisis de Estrategia</h3>
                  <div className="p-5 bg-white rounded-xl border border-dashed border-slate-300 text-xs space-y-4 shadow-sm">
                    <div className="space-y-2">
                       <p className="font-bold text-primary uppercase text-[10px] flex items-center gap-1">
                         <DollarSign className="w-3 h-3" /> Rendimiento y Comisiones
                       </p>
                       <p>Tu ahorro extra se ve reducido por una comisión de <strong>{currentPlan.goal.earlyRepaymentCommission || 0}%</strong>, mientras que tu fondo crece un <strong>{currentPlan.snapshot.savingsYieldRate || 0}%</strong> anual.</p>
                    </div>
                    
                    {isFundInitiallyCompleted ? (
                      <div className="space-y-2">
                        <p className="font-bold text-green-600 uppercase text-[10px]">Estrategia de Amortización Máxima</p>
                        <p>Como tu fondo de emergencia ya está cubierto, el 100% de tu capacidad de ahorro se dedica a liquidar la meta. Estás en el escenario más eficiente posible.</p>
                      </div>
                    ) : (
                      <>
                        {activeTab === 'emergency_first' && (
                          <div className="space-y-2">
                            <p className="font-bold text-accent uppercase text-[10px]">Prioridad Seguridad</p>
                            <p>Solo el 25% de tu sobrante va a la meta; el 75% va a tu colchón. Cuando el fondo esté lleno, el plan se acelerará automáticamente.</p>
                          </div>
                        )}
                        {activeTab === 'balanced' && (
                          <div className="space-y-2">
                            <p className="font-bold text-primary uppercase text-[10px]">Equilibrado</p>
                            <p>La vía media. 50% meta, 50% fondo. Es el plan más estable para mantener el progreso y la seguridad a la vez.</p>
                          </div>
                        )}
                        {activeTab === 'goal_first' && (
                          <div className="space-y-2">
                            <p className="font-bold text-orange-600 uppercase text-[10px]">Máximo Ahorro</p>
                            <p>El 95% del sobrante va a la meta. Solo recomendado si ya tienes un colchón de seguridad robusto o la deuda es muy urgente.</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between items-center text-red-500">
                        <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Intereses pagados:</span>
                        <span className="font-bold">€{currentPlan.totalInterestPaid}</span>
                      </div>
                      <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Intereses ganados:</span>
                        <span className="font-bold">€{currentPlan.totalSavingsInterestEarned}</span>
                      </div>
                      <div className="flex justify-between items-center text-accent">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Fondo Final:</span>
                        <span className="font-bold">€{currentPlan.totalEmergencySaved}</span>
                      </div>
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
