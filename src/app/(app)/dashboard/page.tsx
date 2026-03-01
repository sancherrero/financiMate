'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Goal, MultiPlanResult, FinancialStrategy, DebtPrioritization } from '@/lib/types';
import { calculateAllFinancialPlans, buildMasterRoadmap } from '@/lib/finance-engine';
import { Calculator, Clock, Users, Info, Zap, AlertCircle, TrendingDown, ShieldCheck, Scale, CheckCircle2, UserCheck, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readGoal, readRoadmap, readSnapshot, readSplitMethod, writeRoadmap } from '@/lib/local-storage';
import { formatCentsToEur } from '@/lib/format';
import { PageHeader } from '@/components/layout';
import { KPIRow, StrategySelector, StrategyTradeoffCard } from '@/components/core';
import { MainPanel } from '@/components/dashboard/MainPanel';
import { useSaveStatus } from '@/contexts/SaveStatusContext';
import { Pencil, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { setPending, setError: setSaveError } = useSaveStatus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MultiPlanResult | null>(null);
  const [strategy, setStrategy] = useState<FinancialStrategy>('balanced');

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { value: snapshot } = readSnapshot();
    const { value: goal } = readGoal();
    const splitMethod = readSplitMethod();

    if (!snapshot || !goal) {
      router.push('/onboarding');
      return;
    }

    try {
      const multiResults = calculateAllFinancialPlans(snapshot, goal, splitMethod);
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
    const selectedPlan = results[strategy];

    setPending(true);
    setSaveError(false);

    try {
      const { value: snapshot } = readSnapshot();
      const { value: existingRoadmap } = readRoadmap();

      if (!snapshot) {
        setPending(false);
        return;
      }

      let goals: Goal[] = [];
      let prioritization: DebtPrioritization = 'avalanche';
      let snapshotForRoadmap = snapshot;

      if (existingRoadmap) {
        goals = existingRoadmap.goals || [];
        prioritization = existingRoadmap.debtPrioritization || 'avalanche';
        snapshotForRoadmap = existingRoadmap.originalSnapshot;
      }

      const goalToAdd = {
        ...selectedPlan.goal,
        strategy,
        targetEmergencyFundAmount: selectedPlan.targetEmergencyFund ?? snapshot.targetEmergencyFundAmount ?? undefined,
      };
      if (!goals.find(g => g.id === selectedPlan.goal.id)) {
        goals.push(goalToAdd);
      } else {
        goals = goals.map(g => g.id === selectedPlan.goal.id ? goalToAdd : g);
      }

      const masterRoadmap = buildMasterRoadmap(snapshotForRoadmap, goals, prioritization, strategy);
      writeRoadmap(masterRoadmap);

      setPending(false);
      setSaveError(false);
      toast({
        title: 'Roadmap actualizado',
        description: 'Tu plan maestro se ha guardado correctamente.',
      });
      router.push('/roadmap');
    } catch (e) {
      console.error('Error adding to roadmap', e);
      setSaveError(true);
      setPending(false);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo actualizar el Roadmap maestro.',
      });
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

  const currentPlan = results[strategy];
  const isFundInitiallyCompleted = currentPlan.snapshot.emergencyFundAmount >= currentPlan.targetEmergencyFund;

  return (
    <div className="bg-background pb-12">
      <main className="content-container pt-8 section-gap">
        <PageHeader
          title="Dashboard"
          subtitle="Compara estrategias y añade metas a tu roadmap."
          actions={
            <>
              <Button variant="default" size="default" className="h-10 rounded-xl" onClick={() => router.push('/onboarding')}>
                <Pencil className="h-4 w-4" aria-hidden />
                Editar base
              </Button>
              <Button variant="ghost" size="default" className="h-10 rounded-xl" onClick={() => toast({ title: 'Próximamente', description: 'Nueva meta se implementará en una tarea posterior.' })}>
                <PlusCircle className="h-4 w-4" aria-hidden />
                Nueva meta
              </Button>
            </>
          }
        />

        <KPIRow
          items={[
            {
              label: 'Fecha inicio',
              value: format(new Date(currentPlan.startDate), 'MMM yyyy', { locale: es }),
              hint: 'Fecha de inicio de esta meta, indicada en el stepper (cuándo empieza el plan).',
              tone: 'info',
            },
            {
              label: 'Fecha fin estimada',
              value: format(new Date(currentPlan.endDate), 'MMM yyyy', { locale: es }),
              hint: 'Fecha en la que se alcanzaría la meta con la estrategia seleccionada (desde la fecha de inicio).',
              tone: 'info',
            },
            {
              label: 'Aporte mensual a meta',
              value: `${currentPlan.monthlyContributionExtra} €`,
              hint: 'Aporte extra mensual destinado a la meta (estrategia actual).',
              tone: 'good',
            },
            {
              label: 'FE actual / target',
              value: `${currentPlan.snapshot.emergencyFundAmount} € / ${currentPlan.targetEmergencyFund} €`,
              hint: 'Fondo de emergencia al inicio del plan frente al objetivo para esta estrategia.',
              tone: 'info',
            },
          ]}
        />

        <section className="space-y-3" aria-label="Estrategia">
          <StrategySelector value={strategy} onValueChange={setStrategy} />
          <StrategyTradeoffCard strategy={strategy} />
        </section>

        <MainPanel plan={currentPlan} onAddToRoadmap={addToRoadmap} />

        <section aria-label="Comparativa de estrategias">
          <h2 className="text-xl font-headline font-bold mb-4">Comparativa: {currentPlan.goal.name}</h2>

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
                const isSelected = strategy === strat;
                const isFundCompleted = p.totalEmergencySaved >= p.targetEmergencyFund;
                return (
                  <TableRow 
                    key={strat} 
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-slate-100/50'}`}
                    onClick={() => setStrategy(strat)}
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
        </section>

        <Tabs value={strategy} onValueChange={(val) => setStrategy(val as FinancialStrategy)} className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-headline font-bold">Detalle de Estrategia Seleccionada</h2>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="emergency_first">Seguridad</TabsTrigger>
              <TabsTrigger value="balanced">Equilibrado</TabsTrigger>
              <TabsTrigger value="goal_first">Máximo</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={strategy} className="space-y-8 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="py-4 bg-slate-50">
                  <CardDescription className="text-[10px] uppercase font-bold">Meta Total</CardDescription>
                  <CardTitle className="text-xl tabular-nums">
                    {formatCentsToEur(Math.round(currentPlan.goal.targetAmount * 100))}
                  </CardTitle>
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
                            <TableHead colSpan={4} className="text-center border-r bg-red-50/30">Pago Meta / Deuda</TableHead>
                            <TableHead colSpan={4} className="text-center border-r bg-green-50/30 text-green-800">Crecimiento Fondo Emergencia</TableHead>
                            <TableHead rowSpan={2} className="text-right font-bold">Restante Meta</TableHead>
                          </TableRow>
                          <TableRow className="hover:bg-transparent tracking-wider font-bold">
                            <TableHead className="text-center bg-red-50/50">Int.</TableHead>
                            <TableHead className="text-center bg-red-50/50 text-orange-600">Comis.</TableHead>
                            <TableHead className="text-center bg-red-50/50 text-primary font-bold">Aporte Neto</TableHead>
                            <TableHead className="text-center bg-red-50/50 border-r font-bold text-slate-900">Total Extra</TableHead>
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
                              <TableCell className="text-center text-primary font-bold font-mono text-[10px]">€{row.extraPrincipalPaid.toFixed(2)}</TableCell>
                              <TableCell className="text-center bg-red-50/20 font-bold font-mono text-[10px] border-r">€{(row.extraPrincipalPaid + row.commissionPaid).toFixed(2)}</TableCell>
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
                          return (
                            <div key={i} className="space-y-2 pb-3 border-b last:border-0 last:pb-0">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-bold flex items-center">
                                  <UserCheck className="w-3 h-3 mr-1 text-primary" /> {member?.name}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline bg-slate-50 p-2 rounded-md">
                                <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Aporte Inicial:</p>
                                <span className="font-bold text-sm md:text-base text-slate-700">€{s.monthlyContribution}</span>
                              </div>
                              {!isFundInitiallyCompleted && currentPlan.fundCompletedAtMonth > 0 && (
                                <div className="flex justify-between items-baseline bg-primary/10 p-2 rounded-md border border-primary/20">
                                  <div className="flex flex-col">
                                    <p className="text-[10px] md:text-xs text-primary uppercase font-bold">Aporte Acelerado</p>
                                    <p className="text-[9px] text-primary/70">A partir del mes {currentPlan.fundCompletedAtMonth}</p>
                                  </div>
                                  <span className="font-bold text-sm md:text-base text-primary">
                                    €{Math.round(currentPlan.acceleratedExtraDebtContribution * ((s.monthlyContribution / currentPlan.monthlyContributionExtra) || 1))}
                                  </span>
                                </div>
                              )}
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
                    {isFundInitiallyCompleted ? (
                      <Alert className="bg-primary/10 border-primary/20 mb-4 p-3">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-primary text-[10px] font-medium leading-relaxed">
                          ⚠️ El sistema ha detectado que tu Fondo de Emergencia ya está al 100%. Independientemente de la estrategia elegida, el motor matemático ha forzado el modo 'Ahorro Máximo' redirigiendo todo tu excedente a la meta para evitar pérdidas por inflación y acelerar tu libertad financiera.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <p className="font-bold text-primary uppercase text-[10px] flex items-center gap-1">
                             <DollarSign className="w-3 h-3" /> Rendimiento y Comisiones
                           </p>
                           <p>Tu ahorro extra se ve reducido por una comisión de <strong>{currentPlan.goal.earlyRepaymentCommission || 0}%</strong>, mientras que tu fondo crece un <strong>{currentPlan.snapshot.savingsYieldRate || 0}%</strong> anual.</p>
                        </div>
                        
                        {strategy === 'emergency_first' && (
                          <div className="space-y-2">
                            <p className="font-bold text-accent uppercase text-[10px]">Prioridad Seguridad</p>
                            <p>Solo el 25% de tu sobrante va a la meta; el 75% va a tu colchón. Cuando el fondo esté lleno, el plan se acelerará automáticamente.</p>
                          </div>
                        )}
                        {strategy === 'balanced' && (
                          <div className="space-y-2">
                            <p className="font-bold text-primary uppercase text-[10px]">Equilibrado</p>
                            <p>La vía media. 50% meta, 50% fondo. Es el plan más estable para mantener el progreso y la seguridad a la vez.</p>
                          </div>
                        )}
                        {strategy === 'goal_first' && (
                          <div className="space-y-2">
                            <p className="font-bold text-orange-600 uppercase text-[10px]">Máximo Ahorro</p>
                            <p>El 95% del sobrante va a la meta. Solo recomendado si ya tienes un colchón de seguridad robusto o la deuda es muy urgente.</p>
                          </div>
                        )}
                      </div>
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
