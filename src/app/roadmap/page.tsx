'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Roadmap, PlanResult, FinancialSnapshot, Goal, PortfolioPlanResult, DebtPrioritization, FinancialStrategy } from '@/lib/types';
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
  CheckCircle2
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
        const storedData = JSON.parse(stored);
        // Migración simple si el formato es antiguo
        if (storedData.items) {
          const snapshot = JSON.parse(localStorage.getItem('financiMate_snapshot') || '{}');
          const goals = storedData.items.map((it: any) => it.goal);
          const master = buildMasterRoadmap(snapshot, goals, 'avalanche', 'balanced');
          setRoadmap(master);
          localStorage.setItem('financiMate_roadmap', JSON.stringify(master));
        } else {
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
    <div className="min-h-screen bg-background pb-12">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Salir
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button variant="destructive" size="sm" onClick={clearRoadmap}>
            <Trash2 className="w-4 h-4 mr-2" /> Borrar
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Roadmap Maestro</h1>
            <p className="text-muted-foreground">Fase 1: Deudas Simultáneas | Fase 2: Ahorro en Cascada</p>
          </div>
          <Button onClick={() => router.push('/onboarding')} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Nueva Meta
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-primary">Libertad Financiera Total</CardDescription>
              <CardTitle className="text-xl capitalize">
                {format(new Date(lastDate), "MMMM yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-accent">Fondo Emergencia Final</CardDescription>
              <CardTitle className="text-xl text-accent">€{finalEmergencyFund.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-orange-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-orange-600">Total Metas</CardDescription>
              <CardTitle className="text-xl text-orange-600">{roadmap.goals.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <section className="space-y-12 relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 -z-10" />
          
          {/* FASE 1: DEUDAS */}
          {roadmap.debtsPortfolio && (
            <div className="relative flex gap-8 group">
              <div className="w-16 h-16 rounded-full bg-orange-500 border-4 border-white flex items-center justify-center shadow-lg shrink-0 z-10 text-white">
                <TrendingDown className="w-8 h-8" />
              </div>
              <Card className="flex-1 border-2 border-orange-200 shadow-xl bg-orange-50/30 overflow-hidden">
                <div className="h-2 bg-orange-500 w-full" />
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-headline font-bold text-orange-900">Fase 1: Eliminación de Deudas Activas</h3>
                        <Badge variant="outline" className="bg-white text-orange-600 border-orange-200 uppercase font-bold">
                          Estrategia {roadmap.debtPrioritization === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'}
                        </Badge>
                      </div>
                      <p className="text-sm text-orange-700/80 max-w-2xl">
                        Todas tus deudas se están pagando simultáneamente. El excedente mensual se concentra en {roadmap.debtPrioritization === 'avalanche' ? 'la deuda con mayor interés' : 'la deuda con menor saldo'} para acelerar tu salida del sistema bancario.
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-orange-600">Intereses Totales Fase 1</p>
                        <p className="text-xl font-bold text-orange-900">€{roadmap.debtsPortfolio.totalInterestPaid}</p>
                      </div>
                      <Button 
                        onClick={() => {
                          setViewingPortfolio(roadmap.debtsPortfolio);
                          setIsPortfolioDialogOpen(true);
                        }}
                        className="rounded-full bg-orange-600 hover:bg-orange-700"
                      >
                        <Calculator className="w-4 h-4 mr-2" /> Ver Análisis de Deudas
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-orange-200">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-orange-600">Meses Estimados</p>
                      <p className="text-lg font-bold">{roadmap.debtsPortfolio.totalMonths}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-orange-600">Deudas Liquidadas</p>
                      <p className="text-lg font-bold">{roadmap.debtsPortfolio.debts.length}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-orange-600">Fecha Fin Fase 1</p>
                      <p className="text-lg font-bold capitalize">
                        {format(addMonths(new Date(roadmap.originalSnapshot.startDate || new Date()), roadmap.debtsPortfolio.totalMonths), "MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <div className="flex justify-end items-center">
                      <div className="flex -space-x-2">
                        {roadmap.debtsPortfolio.debts.map((g, i) => (
                          <div key={g.id} className="w-8 h-8 rounded-full bg-white border border-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-600 shadow-sm" title={g.name}>
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
            <div key={`${plan.id}-${index}`} className="relative flex gap-8 group">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-md shrink-0 z-10">
                <span className="font-bold text-primary">{roadmap.debtsPortfolio ? index + 2 : index + 1}</span>
              </div>
              
              <Card 
                className="flex-1 border-none shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-0 hover:border-l-4 hover:border-l-primary"
                onClick={() => {
                  setViewingPlan(plan);
                  setIsViewDialogOpen(true);
                }}
              >
                <div className="h-2 bg-primary w-full" />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-headline font-bold">{plan.goal.name}</h3>
                        <Badge variant="secondary" className="uppercase text-[10px]">Fase 2: Ahorro</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="capitalize">{format(new Date(plan.startDate), "MMM yyyy", { locale: es })}</span>
                        </div>
                        <ArrowRight className="w-4 h-4" />
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="capitalize">{format(new Date(plan.endDate), "MMM yyyy", { locale: es })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Monto Objetivo</p>
                        <p className="font-bold">€{plan.goal.targetAmount}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-[10px] uppercase font-bold text-accent">Fondo al Finalizar</p>
                        <p className="font-bold text-accent">€{plan.totalEmergencySaved.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(plan.goal)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePlan(plan.goal.id)}>
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle>Editar Meta del Roadmap</DialogTitle>
            <DialogDescription>Ajusta los parámetros. Todo el Roadmap Maestro se recalculará automáticamente.</DialogDescription>
          </DialogHeader>
          
          {editingGoal && (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-12 pb-8">
                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-primary border-b pb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Datos de la Meta
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input 
                        value={editingGoal.name} 
                        onChange={(e) => setEditingGoal({ ...editingGoal, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monto Objetivo (€)</Label>
                      <Input 
                        type="number"
                        value={editingGoal.targetAmount} 
                        onChange={(e) => setEditingGoal({ ...editingGoal, targetAmount: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {(editingGoal.isExistingDebt || editingGoal.type === 'debt') && (
                    <div className="space-y-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Cuota Mensual Obligatoria (€)</Label>
                          <Input 
                            type="number"
                            value={editingGoal.existingMonthlyPayment || 0} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, existingMonthlyPayment: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>TIN (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editingGoal.tin || 0} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, tin: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Comisión Amortización (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editingGoal.earlyRepaymentCommission || 0} 
                            onChange={(e) => setEditingGoal({ ...editingGoal, earlyRepaymentCommission: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-6 border-t bg-slate-50/50 shrink-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateGoal} className="rounded-full shadow-lg">
              <Save className="w-4 h-4 mr-2" /> Guardar y Recalcular Maestro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE ANÁLISIS DE DEUDAS (PORTAFOLIO) */}
      <Dialog open={isPortfolioDialogOpen} onOpenChange={setIsPortfolioDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex justify-between items-center pr-8">
              <div>
                <DialogTitle className="text-2xl font-headline font-bold">Análisis Fase 1: Portafolio de Deudas</DialogTitle>
                <DialogDescription>Simulación simultánea de deudas con efecto Bola de Nieve.</DialogDescription>
              </div>
              <Badge className="bg-orange-600 text-white font-bold px-4 py-1">
                Estrategia {roadmap.debtPrioritization.toUpperCase()}
              </Badge>
            </div>
          </DialogHeader>

          {viewingPortfolio && (
            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-orange-100/50">
                      <CardDescription className="text-[10px] uppercase font-bold text-orange-700">Meses en Fase 1</CardDescription>
                      <CardTitle className="text-lg">{viewingPortfolio.totalMonths}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-red-100/30">
                      <CardDescription className="text-[10px] uppercase font-bold text-red-700">Intereses Totales</CardDescription>
                      <CardTitle className="text-lg">€{viewingPortfolio.totalInterestPaid}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-green-100/30">
                      <CardDescription className="text-[10px] uppercase font-bold text-green-700">Ahorro Extra Aplicado</CardDescription>
                      <CardTitle className="text-lg">€{viewingPortfolio.timeline.reduce((acc, it) => acc + it.totalExtraPaid, 0).toFixed(2)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-slate-100">
                      <CardDescription className="text-[10px] uppercase font-bold text-slate-700">Deudas Liquidadas</CardDescription>
                      <CardTitle className="text-lg">{viewingPortfolio.debts.length}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-24 text-center font-bold">Mes</TableHead>
                          <TableHead className="text-center font-bold text-red-600">Intereses</TableHead>
                          <TableHead className="text-center font-bold text-primary">Aporte Extra</TableHead>
                          <TableHead className="text-center font-bold">Total Pagado</TableHead>
                          <TableHead className="text-center font-bold text-orange-600">Deuda Restante</TableHead>
                          <TableHead className="text-right font-bold text-accent">Fondo Acum.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingPortfolio.timeline.map((row) => (
                          <TableRow key={row.month} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold text-center text-[10px]">{row.monthName}</TableCell>
                            <TableCell className="text-center text-red-500 font-mono text-[11px]">€{row.totalInterestPaid}</TableCell>
                            <TableCell className="text-center text-primary font-bold font-mono text-[11px]">€{row.totalExtraPaid}</TableCell>
                            <TableCell className="text-center font-mono text-[11px]">€{row.totalPaid}</TableCell>
                            <TableCell className="text-center text-orange-600 font-bold font-mono text-[11px]">€{row.remainingTotalDebt}</TableCell>
                            <TableCell className="text-right text-accent font-bold font-mono text-[11px]">€{row.cumulativeEmergencyFund}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button onClick={() => setIsPortfolioDialogOpen(false)} className="rounded-full">Cerrar Análisis de Deudas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE ANÁLISIS DE AHORRO (FASE 2) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex justify-between items-center pr-8">
              <div>
                <DialogTitle className="text-2xl font-headline font-bold">Análisis Fase 2: {viewingPlan?.goal.name}</DialogTitle>
                <DialogDescription>Ahorro secuencial una vez terminada la Fase de Deudas.</DialogDescription>
              </div>
              <Badge className="bg-primary text-white font-bold px-4 py-1 uppercase">Ahorro Activo</Badge>
            </div>
          </DialogHeader>

          {viewingPlan && (
            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-slate-50">
                      <CardDescription className="text-[10px] uppercase font-bold">Meta Objetivo</CardDescription>
                      <CardTitle className="text-lg">€{viewingPlan.goal.targetAmount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-green-50">
                      <CardDescription className="text-[10px] uppercase font-bold text-green-700">Meses Duración</CardDescription>
                      <CardTitle className="text-lg">{viewingPlan.estimatedMonthsToGoal}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-blue-50">
                      <CardDescription className="text-[10px] uppercase font-bold text-blue-700">Aporte Extra</CardDescription>
                      <CardTitle className="text-lg">€{viewingPlan.monthlyContributionExtra}/mes</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-accent/5">
                      <CardDescription className="text-[10px] uppercase font-bold text-accent">Fondo al Final</CardDescription>
                      <CardTitle className="text-lg text-accent">€{viewingPlan.totalEmergencySaved.toFixed(2)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-orange-50">
                      <CardDescription className="text-[10px] uppercase font-bold text-orange-700">Fecha Fin</CardDescription>
                      <CardTitle className="text-lg capitalize">{format(new Date(viewingPlan.endDate), "MMM yyyy", { locale: es })}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <section className="space-y-4">
                      <h4 className="font-headline font-bold flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2" /> Evolución Mensual del Ahorro
                      </h4>
                      <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <div className="max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                              <TableRow className="hover:bg-transparent text-[10px]">
                                <TableHead className="w-24 text-center border-r font-bold">Mes</TableHead>
                                <TableHead className="text-center font-bold text-primary">Aporte Ahorro</TableHead>
                                <TableHead className="text-center font-bold text-accent">Aporte Fondo</TableHead>
                                <TableHead className="text-center font-bold text-green-600">Interés Ganado</TableHead>
                                <TableHead className="text-right font-bold">Fondo Acumulado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewingPlan.monthlyTable.map((row) => (
                                <TableRow key={row.month} className="hover:bg-slate-50/50">
                                  <TableCell className="font-bold text-center text-[10px]">{row.monthName}</TableCell>
                                  <TableCell className="text-center text-primary font-bold font-mono text-[11px]">€{row.extraPrincipalPaid.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-accent font-bold font-mono text-[11px]">€{row.emergencyFundContribution.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-green-600 font-mono text-[11px]">€{row.savingsInterestEarned.toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-bold font-mono text-[11px]">€{row.cumulativeEmergencyFund.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="space-y-4">
                      <h4 className="font-headline font-bold flex items-center text-sm"><Info className="w-4 h-4 mr-2" /> Configuración</h4>
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-dashed border-blue-200 text-[11px] space-y-3 leading-relaxed">
                        <p><strong>Estrategia General:</strong> {viewingPlan.strategy === 'emergency_first' ? 'Prioridad Seguridad' : viewingPlan.strategy === 'balanced' ? 'Plan Equilibrado' : 'Ahorro Máximo'}.</p>
                        <p><strong>Fondo Objetivo:</strong> €{viewingPlan.targetEmergencyFund} (3 meses de supervivencia).</p>
                        <p><strong>Nota:</strong> Este plan hereda el fondo acumulado de la fase anterior.</p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button onClick={() => setIsViewDialogOpen(false)} className="rounded-full">Cerrar Detalle de Ahorro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
