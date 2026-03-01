'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Roadmap, PlanResult, Goal, PortfolioPlanResult, DebtPrioritization, FinancialStrategy, PortfolioMonthlyDetail } from '@/lib/types';
import { buildMasterRoadmap } from '@/lib/finance-engine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { 
  PiggyBank, 
  Calendar, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Edit2, 
  Save, 
  LogOut, 
  Target,
  Calculator,
  Clock,
  Info,
  LayoutDashboard,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  ShieldCheck
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { clearRoadmap as clearStoredRoadmap, readRoadmap, writeRoadmap } from '@/lib/local-storage';

type ExtraSourceTooltipProps = {
  sources: PortfolioMonthlyDetail['extraSources'];
  totalExtra: number;
};

function ExtraSourceTooltip({ sources, totalExtra }: ExtraSourceTooltipProps) {
  if (!sources) {
    return (
      <div className="max-w-xs text-[10px] md:text-xs text-muted-foreground">
        <p className="font-semibold text-slate-700 mb-1">Procedencia del Extra</p>
        <p>Recalcula el plan para ver el desglose del extra.</p>
      </div>
    );
  }

  const items = [
    { label: 'Sobrante neto base', value: sources.fromBaseSurplus ?? 0 },
    { label: 'Cuotas liberadas', value: sources.fromReleasedQuotas ?? 0 },
    { label: 'Cuota FE redirigida', value: sources.fromEmergencyFundQuota ?? 0 },
    { label: 'Incremento salarial', value: sources.fromSalaryIncrease ?? 0 },
    { label: 'Reducción de gastos', value: sources.fromExpenseReduction ?? 0 },
    { label: 'Exceso al llenar FE', value: sources.fromEmergencyOverflow ?? 0 },
  ];

  const threshold = 0.005;
  const visibleItems = items.filter((item) => item.value > threshold);

  if (visibleItems.length === 0) {
    return (
      <div className="max-w-xs text-[10px] md:text-xs text-muted-foreground">
        <p className="font-semibold text-slate-700 mb-1">
          Procedencia del Extra: <span className="font-mono">€{totalExtra.toFixed(2)}</span>
        </p>
        <p>No hay fuentes de extra activas este mes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xs space-y-2 text-[10px] md:text-xs">
      <div className="font-semibold text-slate-800">
        Procedencia del Extra:{' '}
        <span className="font-mono">€{totalExtra.toFixed(2)}</span>
      </div>
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <span className="text-slate-600">{item.label}</span>
            <span className="font-mono text-right text-slate-900">
              €{item.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpandableRow({ row }: { row: PortfolioMonthlyDetail }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <>
      <TableRow 
        className="hover:bg-slate-50 transition-colors cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="font-bold text-center text-[10px] py-3 flex items-center justify-center gap-1">
          {isExpanded ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-primary" />}
          {row.monthName}
        </TableCell>
        <TableCell className="text-center text-red-500 font-mono text-[10px] md:text-[11px]">€{row.totalInterestPaid.toFixed(2)}</TableCell>
        <TableCell className="text-center text-primary font-bold font-mono text-[10px] md:text-[11px]">
          {row.extraSources ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted">
                  €{row.totalExtraPaid.toFixed(2)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <ExtraSourceTooltip sources={row.extraSources} totalExtra={row.totalExtraPaid} />
              </TooltipContent>
            </Tooltip>
          ) : (
            <>€{row.totalExtraPaid.toFixed(2)}</>
          )}
        </TableCell>
        <TableCell className="text-center font-mono text-[10px] md:text-[11px]">€{row.totalPaid.toFixed(2)}</TableCell>
        <TableCell className="text-center text-orange-600 font-bold font-mono text-[10px] md:text-[11px]">€{row.remainingTotalDebt.toFixed(2)}</TableCell>
        <TableCell className="text-right text-accent font-bold font-mono text-[10px] md:text-[11px] pr-6">€{row.cumulativeEmergencyFund.toFixed(0)}</TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-slate-50 border-b border-slate-200">
          <TableCell colSpan={6} className="p-0">
            <div className="p-4 pl-12 space-y-3 bg-slate-50/80 border-l-4 border-l-primary/30 shadow-inner">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Desglose por Deuda este mes:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {row.breakdown?.map(b => (
                  <div key={b.goalId} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center border-b pb-1">
                      <span className="font-bold text-xs text-slate-800">{b.name}</span>
                      <span className="text-[10px] font-mono font-bold text-orange-600">Restante: €{b.remainingPrincipal.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex justify-between text-slate-600">
                        <span>Pago Mínimo:</span>
                        <span className="font-mono">€{b.principalFromMinPayment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>Interés:</span>
                        <span className="font-mono">€{b.interestPaid.toFixed(2)}</span>
                      </div>
                      {b.extraPrincipalPaid > 0 && (
                        <div className="flex justify-between text-primary font-bold col-span-2 pt-1 border-t border-slate-100">
                          <span>Aporte Extra:</span>
                          <span className="font-mono">€{b.extraPrincipalPaid.toFixed(2)}</span>
                        </div>
                      )}
                      {b.commissionPaid > 0 && (
                        <div className="flex justify-between text-orange-500 col-span-2">
                          <span>Comisión Banco:</span>
                          <span className="font-mono">€{b.commissionPaid.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!row.breakdown || row.breakdown.length === 0) && (
                  <p className="text-[10px] text-muted-foreground italic col-span-2">No hay desglose disponible para este mes.</p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function RoadmapPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PlanResult | null>(null);
  const [viewingPortfolio, setViewingPortfolio] = useState<PortfolioPlanResult | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);

  const loadRoadmap = useCallback(async () => {
    if (!isUserLoading && user) {
      const docRef = doc(db, 'users', user.uid, 'roadmap', 'current');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setRoadmap(docSnap.data() as Roadmap);
        return;
      }
    }
    
    const { value: storedData } = readRoadmap();
    if (storedData?.goals) {
      setRoadmap(storedData);
    }
  }, [user, isUserLoading, db]);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const saveRoadmapState = async (newRoadmap: Roadmap | null) => {
    setRoadmap(newRoadmap);
    if (newRoadmap) {
      writeRoadmap(newRoadmap);
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'roadmap', 'current'), newRoadmap);
      }
    } else {
      clearStoredRoadmap();
    }
  };

  const removePlan = (goalId: string) => {
    if (!roadmap) return;
    const newGoals = roadmap.goals.filter(g => g.id !== goalId);
    if (newGoals.length === 0) {
      saveRoadmapState(null);
      return;
    }
    const newMaster = buildMasterRoadmap(
      roadmap.originalSnapshot,
      newGoals,
      roadmap.debtPrioritization,
      roadmap.generalStrategy
    );
    saveRoadmapState(newMaster);
    toast({ title: "Meta eliminada", description: "Tu Roadmap ha sido recalculado." });
  };

  const handleEditClick = (goal: Goal) => {
    setEditingGoal(JSON.parse(JSON.stringify(goal)));
    setIsEditDialogOpen(true);
  };

  const handleUpdateGoal = () => {
    if (!roadmap || !editingGoal) return;
    
    const newGoals = roadmap.goals.map(g => 
      g.id === editingGoal.id ? editingGoal : g
    );
    
    const newMaster = buildMasterRoadmap(
      roadmap.originalSnapshot,
      newGoals,
      roadmap.debtPrioritization,
      roadmap.generalStrategy
    );
    
    saveRoadmapState(newMaster);
    setIsEditDialogOpen(false);
    toast({ title: "Roadmap actualizado", description: "Todos tus planes se han recalculado correctamente." });
  };

  const clearRoadmap = () => {
    if (confirm("¿Estás seguro de que quieres borrar todo tu roadmap?")) {
      saveRoadmapState(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  if (isUserLoading) return null;

  if (!roadmap || roadmap.goals.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Calendar className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-headline font-bold">Tu Roadmap está vacío</h1>
          <p className="text-muted-foreground">Comienza añadiendo tu primer plan financiero para ver tu línea temporal.</p>
        </div>
        <Button onClick={() => router.push('/onboarding')} className="rounded-full">
          Crear mi primer Plan
        </Button>
      </div>
    );
  }

  const lastSavingPlan = roadmap.savingsPlans.length > 0 ? roadmap.savingsPlans[roadmap.savingsPlans.length - 1] : null;
  const roadmapStart = new Date(roadmap.originalSnapshot.startDate || new Date());
  const lastDate = lastSavingPlan ? lastSavingPlan.endDate : (roadmap.debtsPortfolio ? addMonths(roadmapStart, roadmap.debtsPortfolio.totalMonths).toISOString() : roadmapStart.toISOString());
  const finalEmergencyFund = lastSavingPlan ? lastSavingPlan.totalEmergencySaved : (roadmap.debtsPortfolio ? roadmap.debtsPortfolio.timeline[roadmap.debtsPortfolio.timeline.length - 1].cumulativeEmergencyFund : roadmap.originalSnapshot.emergencyFundAmount);

  return (
    <div className="bg-background pb-12 text-slate-900">
      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-headline font-bold">Roadmap Maestro</h1>
            <p className="text-sm text-muted-foreground">Fase 1: Deudas Simultáneas | Fase 2: Ahorro en Cascada</p>
          </div>
          <Button onClick={() => router.push('/onboarding')} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Nueva Meta
          </Button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="border-none shadow-sm bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-primary">Libertad Financiera Total</CardDescription>
              <CardTitle className="text-lg md:text-xl capitalize">
                {format(new Date(lastDate), "MMMM yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5 hover:bg-accent/10 transition-colors">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-accent">Fondo Emergencia Final</CardDescription>
              <CardTitle className="text-lg md:text-xl text-accent">€{finalEmergencyFund.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-orange-50 hover:bg-orange-100/50 transition-colors">
            <CardHeader className="p-4 md:p-6 pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-orange-600">Total Metas</CardDescription>
              <CardTitle className="text-lg md:text-xl text-orange-600">{roadmap.goals.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <section className="space-y-8 md:space-y-12 relative px-2 md:px-0">
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-0.5 bg-slate-200 -z-10" />
          
          {roadmap.debtsPortfolio && (
            <div className="space-y-6">
              <div className="relative flex gap-4 md:gap-8 group">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-orange-500 border-4 border-white flex items-center justify-center shadow-lg shrink-0 z-10 text-white">
                  <TrendingDown className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <Card className="flex-1 border-2 border-orange-200 shadow-xl bg-orange-50/30 overflow-hidden transition-all hover:shadow-2xl">
                  <div className="h-2 bg-orange-500 w-full" />
                  <CardContent className="p-4 md:p-6 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                          <h3 className="text-xl md:text-2xl font-headline font-bold text-orange-950">Fase 1: Eliminación de Deudas</h3>
                          <Badge variant="outline" className="bg-white text-orange-600 border-orange-200 uppercase font-bold text-[10px] w-fit">
                            Estrategia {roadmap.debtPrioritization === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-orange-700/80 max-w-2xl">
                          Agrupación de {roadmap.debtsPortfolio.debts.length} deudas activas. Tienes control individual para editar o borrar cada una de ellas a continuación.
                        </p>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] uppercase font-bold text-orange-600">Fin Fase 1 Estimado</p>
                          <p className="text-xl font-bold text-orange-950 capitalize">
                            {format(addMonths(roadmapStart, roadmap.debtsPortfolio.totalMonths), "MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <Button 
                          onClick={() => {
                            setViewingPortfolio(roadmap.debtsPortfolio);
                            setIsPortfolioDialogOpen(true);
                          }}
                          className="rounded-full bg-orange-600 hover:bg-orange-700 font-bold shadow-md w-full md:w-auto text-xs"
                        >
                          <Calculator className="w-4 h-4 mr-2" /> Ver Análisis de Estrategia
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 pl-12 md:pl-20 relative">
                  <div className="absolute left-[2.25rem] md:left-[3.75rem] top-0 bottom-0 w-0.5 bg-orange-200 -z-10" />
                  {roadmap.debtsPortfolio.debts.map((debt, idx) => (
                      <div key={debt.id} className="relative flex gap-4 items-center group">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-orange-300 flex items-center justify-center shadow-sm shrink-0 z-10 text-orange-600 font-bold text-xs">
                              {idx + 1}
                          </div>
                          <Card className="flex-1 border-none shadow-sm hover:shadow-md transition-all border-l-4 border-l-orange-400">
                              <CardContent className="p-3 md:p-4 flex flex-col md:flex-row justify-between md:items-center gap-3">
                                  <div>
                                      <h4 className="font-bold text-sm md:text-base text-slate-800">{debt.name}</h4>
                                      <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs text-muted-foreground mt-1">
                                          <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-orange-500" />
                                            <span>Inicio: {debt.startDate ? format(new Date(debt.startDate), "MMM yyyy", {locale: es}) : 'Inmediato'}</span>
                                          </div>
                                          <span className="hidden sm:inline px-1 text-slate-300">|</span>
                                          <div className="flex items-center gap-1 font-mono font-bold text-slate-600">
                                            <span>Monto: €{debt.targetAmount}</span>
                                          </div>
                                          <span className="hidden sm:inline px-1 text-slate-300">|</span>
                                          <span>Cuota: €{debt.existingMonthlyPayment}</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={() => handleEditClick(debt)}>
                                          <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-red-50" onClick={() => removePlan(debt.id)}>
                                          <Trash2 className="w-4 h-4" />
                                      </Button>
                                  </div>
                              </CardContent>
                          </Card>
                      </div>
                  ))}
              </div>
            </div>
          )}

          {roadmap.savingsPlans.map((plan, index) => (
            <div key={`${plan.id}-${index}`} className="relative flex gap-4 md:gap-8 group">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-md shrink-0 z-10 transition-transform group-hover:scale-110">
                <span className="font-bold text-primary text-sm md:text-base">{roadmap.debtsPortfolio ? roadmap.debtsPortfolio.debts.length + index + 1 : index + 1}</span>
              </div>
              
              <Card 
                className="flex-1 border-none shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden border-l-0 hover:border-l-4 hover:border-l-primary group"
                onClick={() => {
                  setViewingPlan(plan);
                  setIsViewDialogOpen(true);
                }}
              >
                <div className="h-2 bg-primary w-full opacity-70 group-hover:opacity-100" />
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg md:text-xl font-headline font-bold">{plan.goal.name}</h3>
                        <Badge variant="secondary" className="uppercase text-[8px] md:text-[9px] font-bold">Fase 2 (Ahorro)</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] md:text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="capitalize">{format(new Date(plan.startDate), "MMM yy", { locale: es })}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-orange-500" />
                          <span className="capitalize">{format(new Date(plan.endDate), "MMM yy", { locale: es })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 md:gap-6 justify-between md:justify-end">
                      <div className="text-left md:text-right">
                        <p className="text-[9px] md:text-[10px] uppercase font-bold text-muted-foreground">Monto</p>
                        <p className="font-bold text-base md:text-lg">€{plan.goal.targetAmount}</p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-[9px] md:text-[10px] uppercase font-bold text-accent">Fondo Final</p>
                        <p className="font-bold text-base md:text-lg text-accent">€{plan.totalEmergencySaved.toFixed(0)}</p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100" onClick={() => handleEditClick(plan.goal)}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => removePlan(plan.goal.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </section>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] md:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 md:p-6 border-b shrink-0 bg-slate-50/50">
            <DialogTitle className="text-xl md:text-2xl font-headline font-bold">Editar Meta</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">Todo el Roadmap Maestro se recalculará automáticamente.</DialogDescription>
          </DialogHeader>
          
          {editingGoal && (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-8 space-y-8 md:space-y-12">
                <section className="space-y-6">
                  <h4 className="font-bold text-xs md:text-sm uppercase text-primary border-b pb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Datos de la Meta
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    <div className="space-y-2">
                      <Label className="font-bold text-sm">Nombre</Label>
                      <Input 
                        placeholder="Ej: Reforma Cocina"
                        value={editingGoal.name} 
                        onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                        className="rounded-lg shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-sm">Monto Objetivo (€)</Label>
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={editingGoal.targetAmount} 
                        onChange={(e) => setEditingGoal({ ...editingGoal, targetAmount: Number(e.target.value) })}
                        className="rounded-lg shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-sm">Mes de Inicio</Label>
                      <Input 
                        type="month"
                        value={(() => {
                          if (!editingGoal.startDate) return '';
                          try {
                            const d = new Date(editingGoal.startDate);
                            if (isNaN(d.getTime())) return '';
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            return `${y}-${m}`;
                          } catch { return ''; }
                        })()} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const [y, m] = val.split('-');
                            // Crea la fecha en la zona horaria local a las 00:00
                            const d = new Date(Number(y), Number(m) - 1, 1);
                            setEditingGoal({ ...editingGoal, startDate: d.toISOString() });
                          } else {
                            setEditingGoal({ ...editingGoal, startDate: undefined });
                          }
                        }}
                        className="rounded-lg shadow-sm"
                      />
                    </div>
                  </div>

                  {(editingGoal.isExistingDebt || editingGoal.type === 'debt') && (
                    <div className="space-y-6 p-4 md:p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <p className="text-[10px] font-bold text-orange-600 uppercase flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Parámetros Bancarios
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs">Cuota Mensual (€)</Label>
                          <Input 
                            type="number"
                            value={editingGoal.existingMonthlyPayment || 0} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, existingMonthlyPayment: Number(e.target.value) })}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">TIN (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editingGoal.tin || 0} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, tin: Number(e.target.value) })}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Comisión (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editingGoal.earlyRepaymentCommission || 0} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, earlyRepaymentCommission: Number(e.target.value) })}
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Estrategia para esta fase</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm"
                            value={editingGoal.strategy ?? 'balanced'}
                            onChange={(e) => setEditingGoal({ ...editingGoal, strategy: e.target.value as FinancialStrategy })}
                          >
                            <option value="emergency_first">Seguridad máxima (FE primero)</option>
                            <option value="balanced">Equilibrada</option>
                            <option value="goal_first">Máximo a deuda</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Objetivo FE para esta fase (€)</Label>
                          <Input 
                            type="number"
                            min={0}
                            value={editingGoal.targetEmergencyFundAmount ?? ''} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, targetEmergencyFundAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                            className="bg-white"
                            placeholder="Ej. 3× gastos fijos"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-4 md:p-6 border-t bg-slate-50/50 shrink-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-full text-xs">Cancelar</Button>
            <Button onClick={handleUpdateGoal} className="rounded-full shadow-lg bg-primary hover:bg-primary/90 font-bold px-6 md:px-8 text-xs">
              <Save className="w-4 h-4 mr-2" /> Guardar y Recalcular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPortfolioDialogOpen} onOpenChange={setIsPortfolioDialogOpen}>
        <DialogContent className="w-[95vw] md:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 md:p-6 border-b shrink-0 bg-orange-50/30">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-orange-950 text-left">Fase 1: Análisis de Portafolio</DialogTitle>
                <DialogDescription className="text-orange-900/60 text-xs md:text-sm text-left">Evolución de amortizaciones simultáneas. Toca una fila para ver el desglose.</DialogDescription>
              </div>
              <Badge className="bg-orange-600 text-white font-bold px-4 py-1.5 rounded-full shadow-sm w-fit uppercase text-[9px] md:text-[10px]">
                {roadmap.debtPrioritization.toUpperCase()}
              </Badge>
            </div>
          </DialogHeader>

          {viewingPortfolio && (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-8 space-y-8">
                <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-sm">
                  <p className="font-bold text-slate-700">
                    Plan desde: {viewingPortfolio.planStartDate
                      ? format(new Date(viewingPortfolio.planStartDate), 'MMM yyyy', { locale: es })
                      : viewingPortfolio.snapshot?.startDate
                        ? format(new Date(viewingPortfolio.snapshot.startDate), 'MMM yyyy', { locale: es })
                        : '—'}
                  </p>
                  <p className="font-bold text-slate-700">
                    Excedente mensual: €{(viewingPortfolio.monthlySurplus ?? 0).toFixed(0)}
                  </p>
                  <p className="font-bold text-slate-700">
                    Fondo emergencia: €{(viewingPortfolio.initialEmergencyFund ?? viewingPortfolio.snapshot?.emergencyFundAmount ?? 0).toFixed(0)} inicial → €{(viewingPortfolio.targetEmergencyFund ?? viewingPortfolio.snapshot?.targetEmergencyFundAmount ?? 0).toFixed(0)} objetivo
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <Card className="border-none shadow-sm bg-orange-100/30 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-orange-700">Meses Duración</p>
                    <p className="text-lg md:text-xl font-bold">{viewingPortfolio.totalMonths}</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-red-100/20 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-red-700">Intereses Totales</p>
                    <p className="text-lg md:text-xl font-bold">€{viewingPortfolio.totalInterestPaid}</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-green-100/20 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-green-700">Extra Aplicado</p>
                    <p className="text-lg md:text-xl font-bold">€{viewingPortfolio.timeline.reduce((acc, it) => acc + it.totalExtraPaid, 0).toFixed(0)}</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-slate-100 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-700">Deudas Liquidadas</p>
                    <p className="text-lg md:text-xl font-bold">{viewingPortfolio.debts.length}</p>
                  </Card>
                </div>

                <div className="rounded-2xl border bg-white shadow-md overflow-hidden w-full max-w-full">
                  <Table className="min-w-[600px] w-full">
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-24 text-center font-bold text-[10px] md:text-xs">Mes</TableHead>
                        <TableHead className="text-center font-bold text-red-600 text-[10px] md:text-xs">Intereses</TableHead>
                        <TableHead className="text-center font-bold text-primary text-[10px] md:text-xs">Extra</TableHead>
                        <TableHead className="text-center font-bold text-[10px] md:text-xs">Total Pagado</TableHead>
                        <TableHead className="text-center font-bold text-orange-600 text-[10px] md:text-xs">Deuda Rest.</TableHead>
                        <TableHead className="text-right font-bold text-accent text-[10px] md:text-xs pr-6">Fondo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingPortfolio.timeline.map((row) => (
                        <ExpandableRow key={row.month} row={row} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button onClick={() => setIsPortfolioDialogOpen(false)} className="rounded-full px-8 font-bold text-xs w-full sm:w-auto">Cerrar Análisis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] md:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 md:p-6 border-b shrink-0 bg-blue-50/20">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-left">
              <div className="space-y-1">
                <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-slate-900">Fase 2: {viewingPlan?.goal.name}</DialogTitle>
                <DialogDescription className="text-xs md:text-sm">Plan de ahorro optimizado con rentabilidad.</DialogDescription>
              </div>
              <Badge className="bg-primary text-white font-bold px-4 py-1.5 rounded-full shadow-sm w-fit uppercase text-[9px] md:text-[10px]">Ahorro Activo</Badge>
            </div>
          </DialogHeader>

          {viewingPlan && (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <Card className="border-none shadow-sm bg-slate-50 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-slate-600">Monto Meta</p>
                    <p className="text-lg md:text-xl font-bold">€{viewingPlan.goal.targetAmount}</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-green-50 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-green-700">Duración</p>
                    <p className="text-lg md:text-xl font-bold">{viewingPlan.estimatedMonthsToGoal} m</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-blue-50 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-blue-700">Aporte Extra</p>
                    <p className="text-lg md:text-xl font-bold">€{viewingPlan.monthlyContributionExtra}/m</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-accent/5 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-accent">Fondo Final</p>
                    <p className="text-lg md:text-xl font-bold text-accent">€{viewingPlan.totalEmergencySaved.toFixed(0)}</p>
                  </Card>
                  <Card className="border-none shadow-sm bg-orange-50 p-4">
                    <p className="text-[9px] md:text-[10px] uppercase font-bold text-orange-700">Fin Estimado</p>
                    <p className="text-lg md:text-xl font-bold capitalize">{format(new Date(viewingPlan.endDate), "MMM yy", { locale: es })}</p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6 min-w-0 w-full max-w-full">
                    <h4 className="font-headline font-bold flex items-center text-xs md:text-sm text-slate-800">
                      <Clock className="w-4 h-4 mr-2 text-primary" /> Evolución del Ahorro
                    </h4>
                    <div className="rounded-2xl border bg-white shadow-md overflow-hidden w-full max-w-full">
                      <Table className="min-w-[500px] w-full">
                        <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                          <TableRow className="hover:bg-transparent text-[9px] md:text-[10px]">
                            <TableHead className="w-24 text-center border-r font-bold">Mes</TableHead>
                            <TableHead className="text-center font-bold text-primary">Ahorro</TableHead>
                            <TableHead className="text-center font-bold text-accent">Fondo</TableHead>
                            <TableHead className="text-center font-bold text-green-600">Interés</TableHead>
                            <TableHead className="text-right font-bold pr-6">Acumulado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingPlan.monthlyTable.map((row) => (
                            <TableRow key={row.month} className="hover:bg-slate-50 transition-colors">
                              <TableCell className="font-bold text-center text-[10px] py-3 border-r">{row.monthName}</TableCell>
                              <TableCell className="text-center text-primary font-bold font-mono text-[10px] md:text-[11px]">€{row.extraPrincipalPaid.toFixed(0)}</TableCell>
                              <TableCell className="text-center text-accent font-bold font-mono text-[10px] md:text-[11px]">€{row.emergencyFundContribution.toFixed(0)}</TableCell>
                              <TableCell className="text-center text-green-600 font-mono text-[10px] md:text-[11px]">€{row.savingsInterestEarned.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-bold font-mono text-[10px] md:text-[11px] pr-6">€{row.cumulativeEmergencyFund.toFixed(0)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section className="space-y-4">
                      <h4 className="font-headline font-bold flex items-center text-xs md:text-sm"><Info className="w-4 h-4 mr-2 text-primary" /> Info</h4>
                      <div className="p-4 md:p-5 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200 text-[10px] md:text-[11px] space-y-4 leading-relaxed text-slate-700 shadow-sm">
                        <p><strong>Estrategia:</strong> {viewingPlan.strategy === 'emergency_first' ? 'Seguridad Máxima' : viewingPlan.strategy === 'balanced' ? 'Equilibrio' : 'Máximo Ahorro'}.</p>
                        <p>Tu objetivo de seguridad es <strong>€{viewingPlan.targetEmergencyFund}</strong>.</p>
                        <p className="flex items-start gap-2 text-slate-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" /> 
                          Este plan hereda el fondo de la Fase 1, optimizando el punto de partida.
                        </p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button onClick={() => setIsViewDialogOpen(false)} className="rounded-full px-8 font-bold text-xs w-full sm:w-auto">Cerrar Análisis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}