'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { HouseholdType, Member, FinancialSnapshot, Goal, Roadmap } from '@/lib/types';
import { ChevronLeft, ChevronRight, User, Users, Target, ShieldCheck, Plus, Trash2, LayoutGrid, ListTodo, Info, Heart, PiggyBank, Scale, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Form State
  const [type, setType] = useState<HouseholdType>('individual');
  const [expenseMode, setExpenseMode] = useState<'shared' | 'individual'>('shared');
  const [members, setMembers] = useState<Member[]>([{ id: '1', name: 'Tú', incomeNetMonthly: 0 }]);
  const [fixedCosts, setFixedCosts] = useState(0);
  const [variableCosts, setVariableCosts] = useState(0);
  const [minLeisureCosts, setMinLeisureCosts] = useState(0);
  const [emergencyFundIncluded, setEmergencyFundIncluded] = useState(0);
  const [emergencyFund, setEmergencyFund] = useState(0);
  const [targetEmergencyFund, setTargetEmergencyFund] = useState(0);
  const [isTargetModified, setIsTargetModified] = useState(false);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [goal, setGoal] = useState<Goal>({
    id: 'g1',
    name: '',
    targetAmount: 0,
    urgencyLevel: 3,
    type: 'savings',
    isExistingDebt: false,
    existingMonthlyPayment: 0,
    debtCategory: 'fixed',
    assignedTo: 'shared',
    tin: 0,
    tae: 0,
    remainingPrincipal: 0
  });
  const [splitMethod, setSplitMethod] = useState<'equal' | 'proportional_income'>('equal');

  // Inheritance logic from Roadmap
  useEffect(() => {
    const storedRoadmap = localStorage.getItem('financiMate_roadmap');
    if (storedRoadmap) {
      try {
        const roadmap: Roadmap = JSON.parse(storedRoadmap);
        if (roadmap.items.length > 0) {
          const lastPlan = roadmap.items[roadmap.items.length - 1];
          // Propose start date after last plan ends
          const nextStart = new Date(lastPlan.endDate);
          nextStart.setMonth(nextStart.getMonth() + 1);
          setStartDate(nextStart.toISOString().split('T')[0]);
          
          // Propose current emergency fund from last plan
          setEmergencyFund(lastPlan.totalEmergencySaved);
          
          // Carry over household data
          setType(lastPlan.snapshot.type);
          setMembers(lastPlan.snapshot.members);
          setFixedCosts(lastPlan.snapshot.totalFixedCosts);
          setVariableCosts(lastPlan.snapshot.totalVariableCosts);
          setMinLeisureCosts(lastPlan.snapshot.totalMinLeisureCosts);
          setEmergencyFundIncluded(lastPlan.snapshot.emergencyFundIncludedInExpenses);
        }
      } catch (e) {
        console.error("Error loading roadmap for inheritance", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isTargetModified) {
      setTargetEmergencyFund(fixedCosts * 3);
    }
  }, [fixedCosts, isTargetModified]);

  const handleSetType = (newType: HouseholdType) => {
    setType(newType);
    if (newType === 'individual') {
      setMembers([{ id: '1', name: 'Tú', incomeNetMonthly: 0 }]);
    } else {
      setMembers([
        { id: '1', name: 'Persona 1', incomeNetMonthly: 0 },
        { id: '2', name: 'Persona 2', incomeNetMonthly: 0 }
      ]);
    }
  };

  const addMember = () => {
    setMembers([...members, { id: Math.random().toString(), name: `Persona ${members.length + 1}`, incomeNetMonthly: 0 }]);
  };

  const removeMember = (id: string) => {
    if (members.length > 1) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    setMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleComplete();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    const snapshot: FinancialSnapshot = {
      id: 'snap_' + Date.now(),
      type,
      members,
      totalFixedCosts: fixedCosts,
      totalVariableCosts: variableCosts,
      totalMinLeisureCosts: minLeisureCosts,
      emergencyFundIncludedInExpenses: emergencyFundIncluded,
      expenseMode,
      emergencyFundAmount: emergencyFund,
      targetEmergencyFundAmount: targetEmergencyFund,
      startDate: new Date(startDate).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('financiMate_snapshot', JSON.stringify(snapshot));
    localStorage.setItem('financiMate_goal', JSON.stringify(goal));
    localStorage.setItem('financiMate_splitMethod', splitMethod);
    
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Target className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-headline font-bold">Configura tu plan matemático</h1>
          <div className="w-full max-w-md space-y-1">
            <Progress value={(step / totalSteps) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground font-medium">Paso {step} de {totalSteps}</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            {step === 1 && (
              <>
                <CardTitle>Fecha de Inicio y Tipo</CardTitle>
                <CardDescription>¿Cuándo empezamos y para quién es este plan?</CardDescription>
              </>
            )}
            {step === 2 && (
              <>
                <CardTitle>Ingresos por Integrante</CardTitle>
                <CardDescription>Indica el neto mensual de cada persona.</CardDescription>
              </>
            )}
            {step === 3 && (
              <>
                <CardTitle>Gastos Mensuales</CardTitle>
                <CardDescription>Indica los gastos fijos, variables y tu ocio mínimo intocable.</CardDescription>
              </>
            )}
            {step === 4 && (
              <>
                <CardTitle>Fondo de Emergencia</CardTitle>
                <CardDescription>Configura tu colchón de seguridad actual y tu objetivo.</CardDescription>
              </>
            )}
            {step === 5 && (
              <>
                <CardTitle>Tu Meta Financiera</CardTitle>
                <CardDescription>Define qué quieres lograr. Calcularemos 3 escenarios para ti.</CardDescription>
              </>
            )}
            {step === 6 && (
              <>
                <CardTitle>Método de Reparto</CardTitle>
                <CardDescription>Cómo queréis dividir el esfuerzo extra.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-bold"><CalendarIcon className="w-4 h-4 text-primary" /> ¿Cuándo quieres empezar este plan?</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="max-w-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Útil si ya tienes planes previos en tu Roadmap.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant={type === 'individual' ? 'default' : 'outline'} 
                    className="h-32 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                    onClick={() => handleSetType('individual')}
                  >
                    <User className="w-8 h-8" />
                    <div className="text-center">
                      <p className="font-bold">Individual</p>
                      <p className="text-xs opacity-70">Para mí</p>
                    </div>
                  </Button>
                  <Button 
                    variant={type === 'couple' ? 'default' : 'outline'} 
                    className="h-32 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                    onClick={() => handleSetType('couple')}
                  >
                    <Users className="w-8 h-8" />
                    <div className="text-center">
                      <p className="font-bold">Pareja</p>
                      <p className="text-xs opacity-70">Para dos</p>
                    </div>
                  </Button>
                  <Button 
                    variant={type === 'group' ? 'default' : 'outline'} 
                    className="h-32 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                    onClick={() => handleSetType('group')}
                  >
                    <Users className="w-8 h-8" />
                    <div className="text-center">
                      <p className="font-bold">Grupo / Familia</p>
                      <p className="text-xs opacity-70">Hogar compartido</p>
                    </div>
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="space-y-3 p-4 rounded-xl border bg-slate-50/30 relative group">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold">
                        {type === 'individual' ? 'Tus ingresos netos' : `Ingresos de ${member.name}`}
                      </Label>
                      {type === 'group' && members.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMember(member.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {type !== 'individual' && (
                        <div className="space-y-2">
                           <Label className="text-xs text-muted-foreground uppercase">Nombre</Label>
                           <Input 
                            placeholder="Nombre"
                            value={member.name}
                            onChange={(e) => updateMember(member.id, { name: e.target.value })}
                           />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase">Mensual Neto (€)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                          <Input 
                            type="number" 
                            className="pl-8 bg-white" 
                            value={member.incomeNetMonthly || ''}
                            onChange={(e) => updateMember(member.id, { incomeNetMonthly: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {type === 'group' && (
                  <Button variant="outline" className="w-full border-dashed" onClick={addMember}>
                    <Plus className="w-4 h-4 mr-2" /> Añadir Miembro
                  </Button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {type !== 'individual' && (
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <Button 
                      variant={expenseMode === 'shared' ? 'secondary' : 'ghost'} 
                      className="flex-1 text-xs" 
                      onClick={() => setExpenseMode('shared')}
                    >
                      <LayoutGrid className="w-3 h-3 mr-2" /> Compartidos
                    </Button>
                    <Button 
                      variant={expenseMode === 'individual' ? 'secondary' : 'ghost'} 
                      className="flex-1 text-xs" 
                      onClick={() => setExpenseMode('individual')}
                    >
                      <ListTodo className="w-3 h-3 mr-2" /> Individuales
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Gastos Fijos</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        value={fixedCosts || ''}
                        onChange={(e) => setFixedCosts(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gastos Variables</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        value={variableCosts || ''}
                        onChange={(e) => setVariableCosts(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-primary">Ocio Mínimo <Heart className="w-3 h-3 fill-primary" /></Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8 border-primary/30"
                        placeholder="Intocable"
                        value={minLeisureCosts || ''}
                        onChange={(e) => setMinLeisureCosts(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-xl bg-green-50/50 space-y-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <PiggyBank className="w-5 h-5" />
                    <Label className="font-bold">¿Ya ahorras en estos gastos?</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Si dentro de tus fijos/variables ya incluyes una hucha para emergencias:</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8 bg-white border-green-200"
                        placeholder="Ej: 50€ al mes"
                        value={emergencyFundIncluded || ''}
                        onChange={(e) => setEmergencyFundIncluded(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent">
                      <ShieldCheck className="w-5 h-5" />
                      <Label className="font-bold">Saldo Actual</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">¿Cuánto dinero tienes guardado hoy?</p>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        value={emergencyFund || ''}
                        onChange={(e) => setEmergencyFund(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Scale className="w-5 h-5" />
                      <Label className="font-bold">Objetivo del Fondo</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">Meta de seguridad (recomendado 3-6 meses de fijos).</p>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        value={targetEmergencyFund || ''}
                        onChange={(e) => {
                          setTargetEmergencyFund(Number(e.target.value));
                          setIsTargetModified(true);
                        }}
                      />
                    </div>
                    {fixedCosts > 0 && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Equivale a {(targetEmergencyFund / fixedCosts).toFixed(1)} meses de tus gastos fijos.
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-dashed text-xs text-muted-foreground flex gap-3">
                  <Info className="w-5 h-5 text-primary shrink-0" />
                  <p>Cuando alcances tu objetivo de €{targetEmergencyFund}, el motor financiero redirigirá automáticamente todo el ahorro del fondo de emergencia hacia tu meta principal para acelerar el proceso.</p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>¿Qué quieres conseguir?</Label>
                    <Input 
                      placeholder="Ej: Amortizar préstamo coche"
                      value={goal.name}
                      onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monto Objetivo / Deuda (€)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8"
                        placeholder="550"
                        value={goal.targetAmount || ''}
                        onChange={(e) => setGoal({ ...goal, targetAmount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Checkbox 
                    id="isDebt" 
                    checked={goal.isExistingDebt}
                    onCheckedChange={(checked) => setGoal({ ...goal, isExistingDebt: !!checked })}
                  />
                  <Label htmlFor="isDebt" className="text-sm cursor-pointer flex items-center gap-1 font-bold text-blue-700">
                    <Info className="w-3 h-3" /> Es una deuda bancaria con intereses
                  </Label>
                </div>

                {goal.isExistingDebt && (
                  <div className="space-y-4 p-4 border rounded-xl bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Cuota Mensual Actual</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">€</span>
                          <Input 
                            type="number" 
                            className="pl-8 bg-white"
                            placeholder="90"
                            value={goal.existingMonthlyPayment || ''}
                            onChange={(e) => setGoal({ ...goal, existingMonthlyPayment: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>TIN (%)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          className="bg-white"
                          placeholder="10"
                          value={goal.tin || ''}
                          onChange={(e) => setGoal({ ...goal, tin: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TAE (%)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          className="bg-white"
                          placeholder="10.5"
                          value={goal.tae || ''}
                          onChange={(e) => setGoal({ ...goal, tae: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <Button 
                    variant={splitMethod === 'equal' ? 'default' : 'outline'} 
                    className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center text-center"
                    onClick={() => setSplitMethod('equal')}
                  >
                    <span className="font-bold">A partes iguales</span>
                    <span className="text-xs opacity-80">Todos aportan lo mismo</span>
                  </Button>
                  <Button 
                    variant={splitMethod === 'proportional_income' ? 'default' : 'outline'} 
                    className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center text-center"
                    onClick={() => setSplitMethod('proportional_income')}
                  >
                    <span className="font-bold">Proporcional a ingresos</span>
                    <span className="text-xs opacity-80">Quien más gana, aporta más</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <div className="p-6 flex justify-between gap-4 border-t bg-slate-50/50">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button className="flex-1 rounded-full" onClick={nextStep}>
              {step === totalSteps ? 'Calcular Todos los Escenarios' : 'Siguiente'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
