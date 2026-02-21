'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Roadmap, PlanResult, FinancialSnapshot, Goal } from '@/lib/types';
import { recalculateRoadmap } from '@/lib/finance-engine';
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
  Scale
} from 'lucide-react';
import { format } from 'date-fns';
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
  const [editingPlan, setEditingPlan] = useState<PlanResult | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PlanResult | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

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
        setRoadmap(JSON.parse(stored));
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

  const removePlan = (id: string) => {
    if (!roadmap) return;
    const newItems = roadmap.items.filter(item => item.id !== id);
    if (newItems.length === 0) {
      saveRoadmapState(null);
      return;
    }
    const recalculated = recalculateRoadmap(newItems);
    saveRoadmapState({ ...roadmap, items: recalculated, lastUpdated: new Date().toISOString() });
    toast({ title: "Plan eliminado", description: "El resto de tus metas se han adelantado." });
  };

  const handleEditClick = (plan: PlanResult) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setIsEditDialogOpen(true);
  };

  const handleViewClick = (plan: PlanResult) => {
    setViewingPlan(plan);
    setIsViewDialogOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!roadmap || !editingPlan) return;
    
    const newItems = roadmap.items.map(item => 
      item.id === editingPlan.id ? editingPlan : item
    );
    
    const recalculated = recalculateRoadmap(newItems);
    saveRoadmapState({ ...roadmap, items: recalculated, lastUpdated: new Date().toISOString() });
    setIsEditDialogOpen(false);
    toast({ title: "Roadmap actualizado", description: "Todos tus planes futuros se han recalculado correctamente." });
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

  if (!roadmap || roadmap.items.length === 0) {
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

  const lastPlan = roadmap.items[roadmap.items.length - 1];

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
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <Button variant="destructive" size="sm" onClick={clearRoadmap}>
            <Trash2 className="w-4 h-4 mr-2" /> Borrar
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Tu Línea Temporal Financiera</h1>
            <p className="text-muted-foreground">Visualiza el encadenamiento de tus metas y tu crecimiento.</p>
          </div>
          <Button onClick={() => router.push('/onboarding')} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> Nueva Meta
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-primary">Fecha Fin Roadmap</CardDescription>
              <CardTitle className="text-xl capitalize">
                {format(new Date(lastPlan.endDate), "MMMM yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-accent">Fondo Emergencia Final</CardDescription>
              <CardTitle className="text-xl text-accent">€{lastPlan.totalEmergencySaved.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-orange-50">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase font-bold text-orange-600">Total Metas</CardDescription>
              <CardTitle className="text-xl text-orange-600">{roadmap.items.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <section className="space-y-6 relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 -z-10" />
          
          {roadmap.items.map((plan, index) => (
            <div key={`${plan.id}-${index}`} className="relative flex gap-8 group">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-md shrink-0 z-10">
                <span className="font-bold text-primary">{index + 1}</span>
              </div>
              
              <Card 
                className="flex-1 border-none shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden border-l-0 hover:border-l-4 hover:border-l-primary"
                onClick={() => handleViewClick(plan)}
              >
                <div className="h-2 bg-primary w-full" />
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-headline font-bold">{plan.goal.name}</h3>
                        <Badge variant="secondary" className="uppercase text-[10px]">
                          {plan.strategy === 'goal_first' ? 'Máximo' : plan.strategy === 'balanced' ? 'Equilibrado' : 'Seguridad'}
                        </Badge>
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
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Meta</p>
                        <p className="font-bold">€{plan.goal.targetAmount}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-[10px] uppercase font-bold text-accent">Fondo Final</p>
                        <p className="font-bold text-accent">€{plan.totalEmergencySaved.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(plan)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePlan(plan.id)}>
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

      {/* DIÁLOGO DE EDICIÓN */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle>Editar Meta del Roadmap</DialogTitle>
            <DialogDescription>Ajusta tus parámetros para este periodo. Los cambios recalcularán el futuro en cadena.</DialogDescription>
          </DialogHeader>
          
          {editingPlan && (
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-12 pb-8">
                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-primary border-b pb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Datos de la Meta Financiera
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Nombre de la Meta</Label>
                      <Input 
                        value={editingPlan.goal.name} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          goal: { ...editingPlan.goal, name: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Importe Total Objetivo (€)</Label>
                      <Input 
                        type="number"
                        value={editingPlan.goal.targetAmount} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          goal: { ...editingPlan.goal, targetAmount: Number(e.target.value) }
                        })}
                      />
                    </div>
                  </div>

                  {editingPlan.goal.isExistingDebt && (
                    <div className="space-y-6 p-4 bg-slate-50 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Cuota Mensual Actual (€)</Label>
                          <Input 
                            type="number"
                            value={editingPlan.goal.existingMonthlyPayment || ''} 
                            onChange={(e) => setEditingPlan({
                              ...editingPlan,
                              goal: { ...editingPlan.goal, existingMonthlyPayment: Number(e.target.value) }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>TIN (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editingPlan.goal.tin || ''} 
                            onChange={(e) => setEditingPlan({
                              ...editingPlan,
                              goal: { ...editingPlan.goal, tin: Number(e.target.value) }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>TAE (%)</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={editingPlan.goal.tae || ''} 
                            onChange={(e) => setEditingPlan({
                              ...editingPlan,
                              goal: { ...editingPlan.goal, tae: Number(e.target.value) }
                            })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-orange-600 font-bold">Comisión Amortización (%)</Label>
                        <Input 
                          type="number"
                          step="0.01"
                          className="max-w-xs"
                          value={editingPlan.goal.earlyRepaymentCommission || 0} 
                          onChange={(e) => setEditingPlan({
                            ...editingPlan,
                            goal: { ...editingPlan.goal, earlyRepaymentCommission: Number(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                  )}
                </section>

                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-accent border-b pb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Ingresos por Miembro
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {editingPlan.snapshot.members.map((member, idx) => (
                      <div key={member.id} className="space-y-4 p-4 border rounded-xl bg-slate-50/30">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">{member.name}</Label>
                        <div className="space-y-2">
                          <Label className="text-[10px]">Neto Mensual (€)</Label>
                          <Input 
                            type="number"
                            className="bg-white"
                            value={member.incomeNetMonthly} 
                            onChange={(e) => {
                              const newMembers = [...editingPlan.snapshot.members];
                              newMembers[idx].incomeNetMonthly = Number(e.target.value);
                              setEditingPlan({
                                ...editingPlan,
                                snapshot: { ...editingPlan.snapshot, members: newMembers }
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-8">
                  <h4 className="font-bold text-sm uppercase text-orange-600 border-b pb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Estructura de Gastos
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="font-bold">Gastos Fijos (€)</Label>
                      <p className="text-[10px] text-muted-foreground">Incluye aquí todo lo necesario para vivir: alquiler/hipoteca, recibos, alimentación básica y prorrateo de seguros/IBI.</p>
                    </div>
                    <Input 
                      type="number"
                      value={editingPlan.snapshot.totalFixedCosts} 
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        snapshot: { ...editingPlan.snapshot, totalFixedCosts: Number(e.target.value) }
                      })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="font-bold">Gastos Variables (€)</Label>
                      <p className="text-[10px] text-muted-foreground">Gastos prescindibles o ajustables: suscripciones, compras no esenciales, hobbies.</p>
                    </div>
                    <Input 
                      type="number"
                      value={editingPlan.snapshot.totalVariableCosts} 
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        snapshot: { ...editingPlan.snapshot, totalVariableCosts: Number(e.target.value) }
                      })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="font-bold">Ocio Mínimo (€)</Label>
                      <p className="text-[10px] text-muted-foreground">Cantidad &apos;sagrada&apos; intocable para tu salud mental.</p>
                    </div>
                    <Input 
                      type="number"
                      value={editingPlan.snapshot.totalMinLeisureCosts} 
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        snapshot: { ...editingPlan.snapshot, totalMinLeisureCosts: Number(e.target.value) }
                      })}
                    />
                  </div>
                </section>

                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-green-600 border-b pb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Fondo de Emergencia y Ahorro
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Objetivo del Fondo (€)</Label>
                      <Input 
                        type="number"
                        value={editingPlan.snapshot.targetEmergencyFundAmount} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          snapshot: { ...editingPlan.snapshot, targetEmergencyFundAmount: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rentabilidad Ahorro (% TAE)</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={editingPlan.snapshot.savingsYieldRate || 0} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          snapshot: { ...editingPlan.snapshot, savingsYieldRate: Number(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                </section>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-6 border-t bg-slate-50/50 shrink-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePlan} className="rounded-full shadow-lg">
              <Save className="w-4 h-4 mr-2" /> Guardar y Recalcular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE VISUALIZACIÓN DE DETALLES */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b shrink-0">
            <div className="flex justify-between items-center pr-8">
              <div>
                <DialogTitle className="text-2xl font-headline font-bold">Análisis Detallado: {viewingPlan?.goal.name}</DialogTitle>
                <DialogDescription>Desglose matemático y evolución mensual para este periodo del Roadmap.</DialogDescription>
              </div>
              <Badge variant="outline" className="text-primary border-primary bg-primary/5 uppercase font-bold tracking-wider">
                {viewingPlan?.strategy === 'goal_first' ? 'Ahorro Máximo' : viewingPlan?.strategy === 'balanced' ? 'Plan Equilibrado' : 'Prioridad Seguridad'}
              </Badge>
            </div>
          </DialogHeader>

          {viewingPlan && (
            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-slate-50">
                      <CardDescription className="text-[10px] uppercase font-bold">Meta Objetivo</CardDescription>
                      <CardTitle className="text-lg">€{viewingPlan.goal.targetAmount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-red-50/30">
                      <CardDescription className="text-[10px] uppercase font-bold text-red-600">Interés Deuda</CardDescription>
                      <CardTitle className="text-lg text-red-600">€{viewingPlan.totalInterestPaid}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-green-50/30">
                      <CardDescription className="text-[10px] uppercase font-bold text-green-700">Interés Ganado</CardDescription>
                      <CardTitle className="text-lg text-green-700">€{viewingPlan.totalSavingsInterestEarned}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-orange-50/30">
                      <CardDescription className="text-[10px] uppercase font-bold text-orange-700">Comis. Pagadas</CardDescription>
                      <CardTitle className="text-lg text-orange-700">€{viewingPlan.totalCommissionPaid}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm">
                    <CardHeader className="py-3 px-4 bg-accent/5">
                      <CardDescription className="text-[10px] uppercase font-bold text-accent">Fondo Final</CardDescription>
                      <CardTitle className="text-lg text-accent">€{viewingPlan.totalEmergencySaved.toFixed(2)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <section className="space-y-4">
                      <h4 className="font-headline font-bold flex items-center text-sm">
                        <Calculator className="w-4 h-4 mr-2" /> Ejercicio Matemático
                      </h4>
                      <Card className="border-primary/10 bg-white">
                        <CardContent className="divide-y divide-slate-100 p-0">
                          {viewingPlan.mathSteps.map((step, i) => (
                            <div key={i} className="p-3 flex justify-between items-center text-sm">
                              <div>
                                <p className="text-[9px] font-bold uppercase text-muted-foreground">{step.label}</p>
                                <p className="font-mono text-xs">{step.operation}</p>
                              </div>
                              <p className="font-bold">{step.result}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </section>

                    <section className="space-y-4">
                      <h4 className="font-headline font-bold flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2" /> Tabla de Evolución Mensual
                      </h4>
                      <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <div className="max-h-[400px] overflow-auto">
                          <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                              <TableRow className="hover:bg-transparent border-b text-[10px]">
                                <TableHead className="w-24 text-center border-r font-bold">Mes</TableHead>
                                <TableHead className="text-center bg-red-50/30">Int. Pag.</TableHead>
                                <TableHead className="text-center bg-red-50/30">Comis.</TableHead>
                                <TableHead className="text-center bg-red-50/30 border-r text-primary font-bold">Neto Meta</TableHead>
                                <TableHead className="text-center bg-green-50/30">Int. Gan.</TableHead>
                                <TableHead className="text-center bg-green-50/30">Base</TableHead>
                                <TableHead className="text-center bg-green-50/30 text-accent">Extra</TableHead>
                                <TableHead className="text-center bg-green-50/30 border-r font-bold">Fondo Acum.</TableHead>
                                <TableHead className="text-right font-bold">Restante</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewingPlan.monthlyTable.map((row) => (
                                <TableRow key={row.month} className="hover:bg-slate-50 transition-colors">
                                  <TableCell className="font-bold text-center border-r text-[9px]">{row.monthName}</TableCell>
                                  <TableCell className="text-center text-red-500 font-mono text-[9px]">€{row.interestPaid.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-orange-500 font-mono text-[9px]">€{row.commissionPaid.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-primary font-bold font-mono text-[9px] border-r">€{row.extraPrincipalPaid.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-green-600 font-mono text-[9px]">€{row.savingsInterestEarned.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-muted-foreground font-mono text-[9px]">€{row.baseEmergencyContribution.toFixed(2)}</TableCell>
                                  <TableCell className="text-center text-accent font-bold font-mono text-[9px]">€{row.extraEmergencyContribution.toFixed(2)}</TableCell>
                                  <TableCell className="text-center bg-green-50/20 font-bold font-mono text-[9px] border-r">€{row.cumulativeEmergencyFund.toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-mono text-[9px] font-bold">€{row.remainingPrincipal.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </Card>
                    </section>
                  </div>

                  <div className="space-y-6">
                    {viewingPlan.split && viewingPlan.split.length > 0 && (
                      <section className="space-y-4">
                        <h4 className="font-headline font-bold flex items-center text-primary text-sm">
                          <UserCheck className="w-4 h-4 mr-2" /> Reparto Mensual
                        </h4>
                        <Card className="bg-white border-primary/20 shadow-sm">
                          <CardContent className="p-4 space-y-4">
                            {viewingPlan.split.map((s, i) => {
                              const member = viewingPlan.snapshot.members.find(m => m.id === s.memberId);
                              const percentage = viewingPlan.monthlyContributionExtra > 0 ? ((s.monthlyContribution / viewingPlan.monthlyContributionExtra) * 100).toFixed(0) : "0";
                              return (
                                <div key={i} className="space-y-1 pb-3 border-b last:border-0 last:pb-0">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold flex items-center">
                                      {member?.name}
                                    </span>
                                    <Badge variant="outline" className="text-[9px]">{percentage}%</Badge>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <p className="text-[10px] text-muted-foreground uppercase">Aporte extra:</p>
                                    <span className="font-bold text-sm text-primary">€{s.monthlyContribution}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      </section>
                    )}

                    <section className="space-y-4">
                      <h4 className="font-headline font-bold flex items-center text-sm"><Info className="w-4 h-4 mr-2" /> Notas del Plan</h4>
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-dashed border-blue-200 text-[11px] space-y-3 leading-relaxed">
                        <p><strong>Configuración de Gastos:</strong> Fijos: €{viewingPlan.snapshot.totalFixedCosts}, Variables: €{viewingPlan.snapshot.totalVariableCosts}, Ocio: €{viewingPlan.snapshot.totalMinLeisureCosts}.</p>
                        <p><strong>Fondo de Emergencia:</strong> Objetivo de €{viewingPlan.targetEmergencyFund} basado en 3 meses de gastos fijos básicos.</p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-4 border-t bg-slate-50 shrink-0">
            <Button onClick={() => setIsViewDialogOpen(false)} className="rounded-full">Cerrar Análisis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
