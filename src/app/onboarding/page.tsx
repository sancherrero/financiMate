
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { HouseholdType, Member, FinancialSnapshot, Goal } from '@/lib/types';
import { ChevronLeft, ChevronRight, User, Users, Home, Target, Calculator } from 'lucide-react';

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
    // Persist to localStorage for simulation
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
          <Home className="w-10 h-10 text-primary" />
          <h1 className="text-2xl font-headline font-bold">Configura tu plan</h1>
          <div className="w-full space-y-1">
            <Progress value={(step / totalSteps) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">Paso {step} de {totalSteps}</p>
          </div>
        </div>

        <Card className="border-none shadow-xl">
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
                <CardDescription>Introduce el neto mensual disponible.</CardDescription>
              </>
            )}
            {step === 3 && (
              <>
                <CardTitle>Gastos Mensuales</CardTitle>
                <CardDescription>Estimación de tus gastos fijos y variables.</CardDescription>
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
                <CardTitle>Tu Meta</CardTitle>
                <CardDescription>¿Qué quieres conseguir y cuán urgente es?</CardDescription>
              </>
            )}
            {step === 6 && (
              <>
                <CardTitle>Método de Reparto</CardTitle>
                <CardDescription>Cómo queréis dividir las aportaciones.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant={type === 'individual' ? 'default' : 'outline'} 
                  className="h-20 flex flex-col space-y-1 rounded-2xl"
                  onClick={() => { setType('individual'); setMembers([{ id: '1', name: 'Individual', incomeNetMonthly: members[0].incomeNetMonthly }]) }}
                >
                  <User className="w-6 h-6" />
                  <span>Individual</span>
                </Button>
                <Button 
                  variant={type === 'couple' ? 'default' : 'outline'} 
                  className="h-20 flex flex-col space-y-1 rounded-2xl"
                  onClick={() => { setType('couple'); if (members.length < 2) addMember(); }}
                >
                  <Users className="w-6 h-6" />
                  <span>Pareja</span>
                </Button>
                <Button 
                  variant={type === 'group' ? 'default' : 'outline'} 
                  className="h-20 flex flex-col space-y-1 rounded-2xl"
                  onClick={() => setType('group')}
                >
                  <Users className="w-6 h-6" />
                  <span>Grupo</span>
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {members.map((member, idx) => (
                  <div key={member.id} className="space-y-2">
                    <Label>Ingresos Netos - {type === 'individual' ? 'Tus ingresos' : member.name}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                      <Input 
                        type="number" 
                        className="pl-8" 
                        placeholder="Ej: 2000"
                        value={member.incomeNetMonthly || ''}
                        onChange={(e) => updateMember(member.id, { incomeNetMonthly: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                ))}
                {type === 'group' && (
                  <Button variant="ghost" className="w-full text-primary" onClick={addMember}>+ Añadir miembro</Button>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Gastos Fijos Mensuales (Alquiler, luz, seguros...)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 900"
                    value={fixedCosts || ''}
                    onChange={(e) => setFixedCosts(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gastos Variables Mensuales (Comida, ocio, transporte...)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 400"
                    value={variableCosts || ''}
                    onChange={(e) => setVariableCosts(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 text-center">
                <ShieldCheck className="w-16 h-16 text-accent mx-auto" />
                <div className="space-y-2 text-left">
                  <Label>Importe actual en tu colchón de seguridad</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 1000"
                    value={emergencyFund || ''}
                    onChange={(e) => setEmergencyFund(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Recomendamos tener al menos 3 meses de gastos cubiertos.</p>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Nombre de la meta</Label>
                  <Input 
                    placeholder="Ej: Entrada coche, Viaje Japón..."
                    value={goal.name}
                    onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Importe objetivo (€)</Label>
                  <Input 
                    type="number" 
                    placeholder="Ej: 7000"
                    value={goal.targetAmount || ''}
                    onChange={(e) => setGoal({ ...goal, targetAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Nivel de Urgencia</Label>
                    <span className="text-xs font-bold text-primary">{goal.urgencyLevel}/5</span>
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
                  <div className="text-center space-y-4 py-8">
                    <Target className="w-16 h-16 text-primary mx-auto" />
                    <p className="text-muted-foreground">Como plan individual, el reparto es al 100% para ti.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <Button 
                      variant={splitMethod === 'equal' ? 'default' : 'outline'} 
                      className="h-20 flex flex-col space-y-1 rounded-2xl"
                      onClick={() => setSplitMethod('equal')}
                    >
                      <span>A partes iguales</span>
                      <span className="text-xs font-normal opacity-80">Todos aportan la misma cantidad</span>
                    </Button>
                    <Button 
                      variant={splitMethod === 'proportional_income' ? 'default' : 'outline'} 
                      className="h-20 flex flex-col space-y-1 rounded-2xl"
                      onClick={() => setSplitMethod('proportional_income')}
                    >
                      <span>Proporcional a ingresos</span>
                      <span className="text-xs font-normal opacity-80">Quien más gana, más aporta</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <div className="p-6 flex justify-between gap-4">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button className="flex-1" onClick={nextStep}>
              {step === totalSteps ? 'Ver mi Plan' : 'Siguiente'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
