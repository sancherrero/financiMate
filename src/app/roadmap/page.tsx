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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PiggyBank, Calendar, ArrowRight, TrendingUp, ShieldCheck, Trash2, Plus, ArrowLeft, Edit2, Save, LogOut, Info, Heart } from 'lucide-react';
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
  const [editingPlan, setEditingPlan] = useState<PlanResult | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  const handleUpdatePlan = () => {
    if (!roadmap || !editingPlan) return;
    
    const newItems = roadmap.items.map(item => 
      item.id === editingPlan.id ? editingPlan : item
    );
    
    const recalculated = recalculateRoadmap(newItems);
    saveRoadmapState({ ...roadmap, items: recalculated, lastUpdated: new Date().toISOString() });
    setIsEditDialogOpen(false);
    toast({ title: "Roadmap actualizado", description: "Todos tus planes futuros se han recalculado con los nuevos datos." });
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
          <p className="text-muted-foreground max-w-sm">Comienza añadiendo tu primer plan financiero para ver tu línea temporal.</p>
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
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Dashboard
          </Button>
          <Button variant="destructive" size="sm" onClick={clearRoadmap}>
            <Trash2 className="w-4 h-4 mr-2" /> Borrar Todo
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold">Tu Línea Temporal Financiera</h1>
            <p className="text-muted-foreground">Visualiza el encadenamiento de tus metas y tu crecimiento.</p>
          </div>
          <Button onClick={() => router.push('/onboarding')} className="rounded-full">
            <Plus className="w-4 h-4 mr-2" /> Añadir Nueva Meta
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
              <CardDescription className="text-[10px] uppercase font-bold text-orange-600">Total Metas Encadenadas</CardDescription>
              <CardTitle className="text-xl text-orange-600">{roadmap.items.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <section className="space-y-6 relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 -z-10" />
          
          {roadmap.items.map((plan, index) => (
            <div key={plan.id} className="relative flex gap-8 group">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center shadow-md shrink-0 z-10">
                <span className="font-bold text-primary">{index + 1}</span>
              </div>
              
              <Card className="flex-1 border-none shadow-md hover:shadow-lg transition-shadow overflow-hidden">
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
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Importe Meta</p>
                        <p className="font-bold">€{plan.goal.targetAmount}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-[10px] uppercase font-bold text-accent">Fondo Final</p>
                        <p className="font-bold text-accent">€{plan.totalEmergencySaved.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(plan)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePlan(plan.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span>Sobrante mensual libre: <strong>€{plan.monthlySurplus}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <span>Objetivo Fondo: <strong>€{plan.targetEmergencyFund}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </section>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Editar Meta del Roadmap</DialogTitle>
            <DialogDescription>Configuración completa para este periodo. Los cambios recalcularán el futuro en cadena.</DialogDescription>
          </DialogHeader>
          
          {editingPlan && (
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-12 pb-8">
                {/* 1. OBJETIVO */}
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

                  <div className="flex items-center space-x-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <Checkbox 
                      id="editIsDebt" 
                      checked={editingPlan.goal.isExistingDebt}
                      onCheckedChange={(checked) => setEditingPlan({
                        ...editingPlan,
                        goal: { ...editingPlan.goal, isExistingDebt: !!checked }
                      })}
                    />
                    <Label htmlFor="editIsDebt" className="text-sm cursor-pointer font-bold text-blue-700">
                      Es una deuda bancaria con intereses
                    </Label>
                  </div>

                  {editingPlan.goal.isExistingDebt && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-slate-50 rounded-xl">
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
                  )}
                </section>

                {/* 2. INGRESOS */}
                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-accent border-b pb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Ingresos de los Miembros
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {editingPlan.snapshot.members.map((member, idx) => (
                      <div key={member.id} className="space-y-2 p-4 border rounded-xl bg-slate-50/30">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">{member.name}</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">€</span>
                          <Input 
                            type="number"
                            className="pl-8 bg-white"
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

                {/* 3. GASTOS */}
                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-orange-600 border-b pb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Estructura de Gastos y Ahorro
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label>Fijos (€)</Label>
                      <Input 
                        type="number"
                        value={editingPlan.snapshot.totalFixedCosts} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          snapshot: { ...editingPlan.snapshot, totalFixedCosts: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Variables (€)</Label>
                      <Input 
                        type="number"
                        value={editingPlan.snapshot.totalVariableCosts} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          snapshot: { ...editingPlan.snapshot, totalVariableCosts: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ocio Mínimo (€)</Label>
                      <Input 
                        type="number"
                        value={editingPlan.snapshot.totalMinLeisureCosts} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          snapshot: { ...editingPlan.snapshot, totalMinLeisureCosts: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ahorro en Gastos (€)</Label>
                      <Input 
                        type="number"
                        placeholder="Ya ahorrado en fijos"
                        value={editingPlan.snapshot.emergencyFundIncludedInExpenses} 
                        onChange={(e) => setEditingPlan({
                          ...editingPlan,
                          snapshot: { ...editingPlan.snapshot, emergencyFundIncludedInExpenses: Number(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                </section>

                {/* 4. FONDO EMERGENCIA */}
                <section className="space-y-6">
                  <h4 className="font-bold text-sm uppercase text-green-600 border-b pb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Objetivo Fondo de Emergencia
                  </h4>
                  <div className="max-w-xs space-y-2">
                    <Label>Meta de Seguridad (€)</Label>
                    <Input 
                      type="number"
                      value={editingPlan.snapshot.targetEmergencyFundAmount} 
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        snapshot: { ...editingPlan.snapshot, targetEmergencyFundAmount: Number(e.target.value) }
                      })}
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      Recomendado: €{editingPlan.snapshot.totalFixedCosts * 3} (3 meses de fijos).
                    </p>
                  </div>
                </section>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="p-6 border-t bg-slate-50/50">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePlan} className="rounded-full shadow-lg">
              <Save className="w-4 h-4 mr-2" /> Guardar y Recalcular Futuro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
