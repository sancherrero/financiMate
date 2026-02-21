'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Roadmap, PlanResult, FinancialSnapshot, Goal, PortfolioPlanResult, DebtPrioritization, FinancialStrategy, PortfolioMonthlyDetail } from '@/lib/types';
import { buildMasterRoadmap } from '@/lib/finance-engine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PiggyBank, 
  Calendar, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Edit2, 
  Save, 
  LogOut, 
  Heart, 
  Target,
  UserCheck,
  Calculator,
  Clock,
  Info,
  Scale,
  Zap,
  TrendingDown,
  LayoutDashboard,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
        <TableCell className="text-center text-primary font-bold font-mono text-[10px] md:text-[11px]">€{row.totalExtraPaid.toFixed(2)}</TableCell>
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
                {row.breakdown.map(b => (
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
    
    const stored = localStorage.getItem('financiMate_roadmap');
    if (stored) {
      try {
        const storedData = JSON.parse(stored) as Roadmap;
        if (storedData.goals) {
          setRoadmap(storedData);
        }
      } catch (e) {
        console.error("Error loading roadmap", e);
      }
    }
  }, [user, isUserLoading, db]);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const saveRoadmapState = async (newRoadmap: Roadmap | null) => {
    setRoadmap(newRoadmap);
    if (newRoadmap) {
      localStorage.setItem('financiMate_roadmap', JSON.stringify(newRoadmap));
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'roadmap', 'current'), newRoadmap);
      }
    } else {
      localStorage.removeItem('financiMate_roadmap');
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
  const lastDate = lastSavingPlan ? lastSavingPlan.endDate : (roadmap.debtsPortfolio ? addMonths(new Date(roadmap.originalSnapshot.startDate || new Date()), roadmap.debtsPortfolio.totalMonths).toISOString() : new Date().toISOString());
  const finalEmergencyFund = lastSavingPlan ? lastSavingPlan.totalEmergencySaved : (roadmap.debtsPortfolio ? roadmap.debtsPortfolio.timeline[roadmap.debtsPortfolio.timeline.length - 1].cumulativeEmergencyFund : roadmap.originalSnapshot.emergencyFundAmount);

  return (
    <div className="min-h-screen bg-background pb-12 text-slate-900">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
              <LogOut className="w-4 h-4 mr-2" /> Salir
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={clearRoadmap}>
            <Trash2 className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Borrar</span>
          </Button>
        </div>
      </nav>

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
          
          {/* FASE 1: DEUDAS */}
          {roadmap.debtsPortfolio && (
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
                        <h3 className="text-xl md:text-2xl font-headline font-bold text-orange-950">Fase 1: Eliminación de Deudas Activas</h3>
                        <Badge variant="outline" className="bg-white text-orange-600 border-orange-200 uppercase font-bold text-[10px] w-fit">
                          Estrategia {roadmap.debtPrioritization === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-orange-700/80 max-w-2xl">
                        Todas tus deudas se están pagando simultáneamente. El excedente mensual se concentra en {roadmap.debtPrioritization === 'avalanche' ? 'la deuda con mayor interés' : 'la deuda con menor saldo'}.
                      </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                      <div className="text-left md:text-right">
                        <p className="text-[10px] uppercase font-bold text-orange-600">Intereses Fase 1</p>
                        <p className="text-xl font-bold text-orange-950">€{roadmap.debtsPortfolio.totalInterestPaid}</p>
                      </div>
                      <Button 
                        onClick={() => {
                          setViewingPortfolio(roadmap.debtsPortfolio);
                          setIsPortfolioDialogOpen(true);
                        }}
                        className="rounded-full bg-orange-600 hover:bg-orange-700 font-bold shadow-md w-full md:w-auto text-xs"
                      >
                        <Calculator className="w-4 h-4 mr-2" /> Ver Análisis de Deudas
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-orange-200">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-orange-600">Meses</p>
                      <p className="text-base md:text-lg font-bold">{roadmap.debtsPortfolio.totalMonths}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-orange-600">Deudas</p>
                      <p className="text-base md:text-lg font-bold">{roadmap.debtsPortfolio.debts.length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-orange-600">Fin Fase 1</p>
                      <p className="text-base md:text-lg font-bold capitalize">
                        {format(addMonths(new Date(roadmap.originalSnapshot.startDate || new Date()), roadmap.debtsPortfolio.totalMonths), "MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="flex justify-end items-center col-span-1">
                      <div className="flex -space-x-2 overflow-hidden">
                        {roadmap.debtsPortfolio.debts.map((g, i) => (
                          <div key={g.id} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-600 shadow-sm shrink-0" title={g.name}>
                            {i+1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* FASE 2: AHORROS */}
          {roadmap.savingsPlans.map((plan, index) => (
            <div key={`${plan.id}-${index}`} className="relative flex gap-4 md:gap-8 group">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-md shrink-0 z-10 transition-transform group-hover:scale-110">
                <span className="font-bold text-primary text-sm md:text-base">{roadmap.debtsPortfolio ? index + 2 : index + 1}</span>
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
                        <Badge variant="secondary" className="uppercase text-[8px] md:text-[9px] font-bold">Fase 2</Badge>
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

      {/* DIÁLOGO DE EDICIÓN DE META */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
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

      {/* DIÁLOGO DE ANÁLISIS DE DEUDAS (PORTAFOLIO) */}
      <Dialog open={isPortfolioDialogOpen} onOpenChange={setIsPortfolioDialogOpen}>
        <DialogContent className="w-[95vw] md:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 md:p-6 border-b shrink-0 bg-orange-50/30">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl md:text-2xl font-headline font-bold text-orange-950 text-left">Fase 1: Portafolio de Deudas</DialogTitle>
                <DialogDescription className="text-orange-900/60 text-xs md:text-sm text-left">Simulación simultánea con aceleración por liberación de cuotas. Toca una fila para ver el desglose.</DialogDescription>
              </div>
              <Badge className="bg-orange-600 text-white font-bold px-4 py-1.5 rounded-full shadow-sm w-fit uppercase text-[9px] md:text-[10px]">
                {roadmap.debtPrioritization.toUpperCase()}
              </Badge>
            </div>
          </DialogHeader>

          {viewingPortfolio && (
            <ScrollArea className="flex-1">
              <div className="p-4 md:p-8 space-y-8">
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
                        <TableHead className="text-center font-bold text-[10px] md:text-xs">Total Extra</TableHead>
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

      {/* DIÁLOGO DE ANÁLISIS DE AHORRO (FASE 2) */}
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
