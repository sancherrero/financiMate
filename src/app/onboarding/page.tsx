
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { HouseholdType, Member, FinancialSnapshot, Goal } from '@/lib/types';
import { ChevronLeft, ChevronRight, User, Users, Home, Target, ShieldCheck, Scale, Zap } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Form State
  const [type, setType] = useState<HouseholdType>('individual');
  const [members, setMembers] = useState<Member[]>([{ id: '1', name: 'Usuario 1', incomeNetMonthly: 0 }]);
  const [fixedCosts, setFixedCosts] = useState(0);
  const [variableCosts, setVariableCosts] = useState(0);
  const [emergencyFund, setEmergencyFund] = useState(0);
  const [goal, setGoal] = useState<Goal>({
    id: 'g1',
    name: '',
    targetAmount: 0,
    urgencyLevel: 3,
    type: 'savings',
    strategy: 'emergency_first',
    isExistingDebt: false,
    existingMonthlyPayment: 0,
    debtCategory: 'fixed'
  });
  const [splitMethod, setSplitMethod] = useState<'equal' | 'proportional_income'>('equal');

  const addMember = () => {
    setMembers([...members, { id: Math.random().toString(), name: `Usuario ${members.length + 1}`, incomeNetMonthly: 0 }]);
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
      emergencyFundAmount: emergencyFund,
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('financiMate_snapshot', JSON.stringify(snapshot));
    localStorage.setItem('financiMate_goal', JSON.stringify(goal));
    localStorage.setItem('financiMate_splitMethod', splitMethod);
    
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Target className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-headline font-bold">Configura tu plan</h1>
          <div className="w-full space-y-1">
            <Progress value={(step / totalSteps) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground font-medium">Paso {step} de {totalSteps}</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white">
          <CardHeader>
            {step === 1 && (
              <>
                <CardTitle>Tipo de Plan</CardTitle>
                <CardDescription>¿Para quién es este plan financiero?</CardDescription>
              </>
            )}
            {step === 2 && (
              <>
                <CardTitle>Tus Ingresos</CardTitle>
                <CardDescription>Introduce el neto mensual disponible (después de impuestos).</CardDescription>
              </>
            )}
            {step === 3 && (
              <>
                <CardTitle>Gastos Mensuales</CardTitle>
                <CardDescription>Estimación de tus gastos fijos (alquiler, préstamos) y variables.</CardDescription>
              </>
            )}
            {step === 4 && (
              <>
                <CardTitle>Fondo de Emergencia</CardTitle>
                <CardDescription>¿Cuentas con algún colchón de seguridad actualmente?</CardDescription>
              </>
            )}
            {step === 5 && (
              <>
                <CardTitle>Tu Meta Financiera</CardTitle>
                <CardDescription>¿Qué quieres conseguir y cómo quieres priorizarlo?</CardDescription>
              </>
            )}
            {step === 6 && (
              <>
                <CardTitle>Método de Reparto</CardTitle>
                <CardDescription>Cómo queréis dividir las aportaciones adicionales.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant={type === 'individual' ? 'default' : 'outline'} 
                  className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                  onClick={() => { setType('individual'); setMembers([{ id: '1', name: 'Individual', incomeNetMonthly: members[0].incomeNetMonthly }]) }}
                >
                  <User className="w-6 h-6" />
                  <div className="text-center">
                    <p className="font-bold">Individual</p>
                    <p className="text-xs opacity-70">Para mis finanzas personales</p>
                  </div>
                </Button>
                <Button 
                  variant={type === 'couple' ? 'default' : 'outline'} 
                  className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                  onClick={() => { setType('couple'); if (members.length < 2) addMember(); }}
                >
                  <Users className="w-6 h-6" />
                  <div className="text-center">
                    <p className="font-bold">Pareja</p>
                    <p className="text-xs opacity-70">Plan compartido para dos</p>
                  </div>
                </Button>
                <Button 
                  variant={type === 'group' ? 'default' : 'outline'} 
                  className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                  onClick={() => setType('group')}
                >
                  <Users className="w-6 h-6" />
                  <div className="text-center">
                    <p className="font-bold">Grupo / Familia</p>
                    <p className="text-xs opacity-70">Múltiples fuentes de ingresos</p>
                  </div>
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="space-y-2 p-4 rounded-xl border bg-slate-50/50">
                    <Label className="text-sm font-bold">{type === 'individual' ? 'Tus ingresos netos' : `Ingresos de ${member.name}`}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8 bg-white" 
                        placeholder="Ej: 1800"
                        value={member.incomeNetMonthly || ''}
                        onChange={(e) => updateMember(member.id, { incomeNetMonthly: Number(e.target.value) })}
                      />
                    </div>
                    {type !== 'individual' && (
                      <Input 
                        placeholder="Nombre del miembro"
                        className="mt-2 h-8 text-xs bg-white"
                        value={member.name}
                        onChange={(e) => updateMember(member.id, { name: e.target.value })}
                      />
                    )}
                  </div>
                ))}
                {type === 'group' && (
                  <Button variant="outline" className="w-full border-dashed" onClick={addMember}>+ Añadir miembro</Button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Gastos Fijos Mensuales</Label>
                  <p className="text-xs text-muted-foreground mb-2">Vivienda, suministros, suscripciones y préstamos actuales.</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                    <Input 
                      type="number" 
                      className="pl-8"
                      placeholder="Ej: 950"
                      value={fixedCosts || ''}
                      onChange={(e) => setFixedCosts(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gastos Variables Mensuales</Label>
                  <p className="text-xs text-muted-foreground mb-2">Alimentación, ocio, transporte y compras.</p>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                    <Input 
                      type="number" 
                      className="pl-8"
                      placeholder="Ej: 400"
                      value={variableCosts || ''}
                      onChange={(e) => setVariableCosts(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 text-center">
                <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center text-accent mx-auto">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div className="space-y-2 text-left">
                  <Label>Saldo actual en tu fondo de emergencia</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                    <Input 
                      type="number" 
                      className="pl-8"
                      placeholder="Ej: 2000"
                      value={emergencyFund || ''}
                      onChange={(e) => setEmergencyFund(Number(e.target.value))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground italic">El fondo de emergencia ideal cubre 3-6 meses de tus gastos totales.</p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>¿Qué quieres conseguir?</Label>
                  <Input 
                    placeholder="Ej: Amortizar coche, Viaje, Entrada casa..."
                    value={goal.name}
                    onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Importe total pendiente (€)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 6000"
                    value={goal.targetAmount || ''}
                    onChange={(e) => setGoal({ ...goal, targetAmount: Number(e.target.value) })}
                  />
                </div>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Checkbox 
                    id="isDebt" 
                    checked={goal.isExistingDebt}
                    onCheckedChange={(checked) => setGoal({ ...goal, isExistingDebt: !!checked })}
                  />
                  <Label htmlFor="isDebt" className="text-sm cursor-pointer">Es una deuda que ya estoy pagando mensualmente</Label>
                </div>

                {goal.isExistingDebt && (
                  <div className="space-y-4 p-4 border rounded-lg bg-slate-50 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label>¿Cuál es la cuota mensual actual?</Label>
                      <Input 
                        type="number" 
                        placeholder="Ej: 150"
                        value={goal.existingMonthlyPayment || ''}
                        onChange={(e) => setGoal({ ...goal, existingMonthlyPayment: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>¿En qué categoría de gasto la incluiste antes?</Label>
                      <RadioGroup 
                        value={goal.debtCategory} 
                        onValueChange={(val: any) => setGoal({ ...goal, debtCategory: val })}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fixed" id="fixed-cat" />
                          <Label htmlFor="fixed-cat" className="text-xs">Gastos Fijos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="variable" id="var-cat" />
                          <Label htmlFor="var-cat" className="text-xs">Gastos Variables</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-primary font-bold">Estrategia de prioridad</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      variant={goal.strategy === 'emergency_first' ? 'default' : 'outline'} 
                      className="h-auto py-3 px-4 flex justify-start items-start space-x-3 text-left"
                      onClick={() => setGoal({ ...goal, strategy: 'emergency_first' })}
                    >
                      <ShieldCheck className="w-5 h-5 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold">Priorizar Seguridad</p>
                        <p className="text-xs opacity-70">Completa 3 meses de gastos antes de aportar extra a la meta.</p>
                      </div>
                    </Button>
                    <Button 
                      variant={goal.strategy === 'balanced' ? 'default' : 'outline'} 
                      className="h-auto py-3 px-4 flex justify-start items-start space-x-3 text-left"
                      onClick={() => setGoal({ ...goal, strategy: 'balanced' })}
                    >
                      <Scale className="w-5 h-5 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold">Equilibrado</p>
                        <p className="text-xs opacity-70">Divide el excedente (50/50) entre fondo y meta.</p>
                      </div>
                    </Button>
                    <Button 
                      variant={goal.strategy === 'goal_first' ? 'default' : 'outline'} 
                      className="h-auto py-3 px-4 flex justify-start items-start space-x-3 text-left"
                      onClick={() => setGoal({ ...goal, strategy: 'goal_first' })}
                    >
                      <Zap className="w-5 h-5 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold">Priorizar Meta</p>
                        <p className="text-xs opacity-70">Todo el excedente a la meta. El fondo puede esperar.</p>
                      </div>
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Urgencia / Motivación</Label>
                    <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded">{goal.urgencyLevel}/5</span>
                  </div>
                  <Slider 
                    defaultValue={[goal.urgencyLevel]} 
                    max={5} 
                    min={1} 
                    step={1} 
                    onValueChange={(vals) => setGoal({ ...goal, urgencyLevel: vals[0] })}
                  />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                {type === 'individual' ? (
                  <div className="text-center space-y-4 py-12">
                    <Target className="w-16 h-16 text-primary/30 mx-auto" />
                    <p className="text-muted-foreground font-medium">Como plan individual, el esfuerzo de ahorro recae al 100% en ti.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      variant={splitMethod === 'equal' ? 'default' : 'outline'} 
                      className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center text-center"
                      onClick={() => setSplitMethod('equal')}
                    >
                      <span className="font-bold">A partes iguales</span>
                      <span className="text-xs opacity-80">Independientemente de lo que gane cada uno</span>
                    </Button>
                    <Button 
                      variant={splitMethod === 'proportional_income' ? 'default' : 'outline'} 
                      className="h-24 flex flex-col space-y-2 rounded-2xl items-center justify-center text-center"
                      onClick={() => setSplitMethod('proportional_income')}
                    >
                      <span className="font-bold">Proporcional a ingresos</span>
                      <span className="text-xs opacity-80">Quien más gana, aporta una parte proporcional mayor</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <div className="p-6 flex justify-between gap-4 border-t bg-slate-50/50 rounded-b-2xl">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button className="flex-1 rounded-full" onClick={nextStep}>
              {step === totalSteps ? 'Ver mi Plan' : 'Siguiente'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
