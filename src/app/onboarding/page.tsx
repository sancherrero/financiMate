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
import { ChevronLeft, ChevronRight, User, Users, Home, Target, ShieldCheck, Scale, Zap, FileUp, Loader2, AlertCircle } from 'lucide-react';
import { analyzeDebtDocument } from '@/ai/flows/analyze-debt-document';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
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
    debtCategory: 'fixed',
    tin: 0,
    tae: 0,
    remainingPrincipal: 0
  });
  const [splitMethod, setSplitMethod] = useState<'equal' | 'proportional_income'>('equal');

  const addMember = () => {
    setMembers([...members, { id: Math.random().toString(), name: `Usuario ${members.length + 1}`, incomeNetMonthly: 0 }]);
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    setMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const result = await analyzeDebtDocument({ fileDataUri: base64 });
        if (result) {
          setGoal({
            ...goal,
            isExistingDebt: true,
            existingMonthlyPayment: result.monthlyPayment || goal.existingMonthlyPayment,
            tin: result.tin || goal.tin,
            tae: result.tae || goal.tae,
            targetAmount: result.remainingPrincipal || goal.targetAmount,
            remainingPrincipal: result.remainingPrincipal || goal.remainingPrincipal,
            nextPaymentDate: result.nextPaymentDate || goal.nextPaymentDate,
          });
          toast({
            title: "Documento Analizado",
            description: "Hemos extraído los datos del préstamo correctamente.",
          });
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error al analizar",
          description: "No pudimos procesar el archivo. Inténtalo manualmente.",
        });
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
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
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Target className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-headline font-bold">Configura tu plan</h1>
          <div className="w-full max-w-md space-y-1">
            <Progress value={(step / totalSteps) * 100} className="h-2" />
            <p className="text-xs text-center text-muted-foreground font-medium">Paso {step} de {totalSteps}</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
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
                <CardDescription>Estimación de tus gastos habituales.</CardDescription>
              </>
            )}
            {step === 4 && (
              <>
                <CardTitle>Fondo de Emergencia</CardTitle>
                <CardDescription>¿Cuentas con algún colchón de seguridad?</CardDescription>
              </>
            )}
            {step === 5 && (
              <>
                <CardTitle>Tu Meta Financiera</CardTitle>
                <CardDescription>Define qué quieres lograr y cómo.</CardDescription>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant={type === 'individual' ? 'default' : 'outline'} 
                  className="h-32 flex flex-col space-y-2 rounded-2xl items-center justify-center"
                  onClick={() => setType('individual')}
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
                  onClick={() => setType('couple')}
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
                  onClick={() => setType('group')}
                >
                  <Users className="w-8 h-8" />
                  <div className="text-center">
                    <p className="font-bold">Grupo / Familia</p>
                    <p className="text-xs opacity-70">Hogar compartido</p>
                  </div>
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="space-y-3 p-4 rounded-xl border bg-slate-50/30">
                    <Label className="text-sm font-bold">{type === 'individual' ? 'Tus ingresos netos' : `Ingresos de ${member.name}`}</Label>
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
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      value={emergencyFund || ''}
                      onChange={(e) => setEmergencyFund(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>¿Qué quieres conseguir?</Label>
                  <Input 
                    placeholder="Ej: Amortizar préstamo coche"
                    value={goal.name}
                    onChange={(e) => setGoal({ ...goal, name: e.target.value })}
                  />
                </div>

                <div className="p-4 border-2 border-dashed rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
                  <FileUp className="w-8 h-8 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">¿Tienes el contrato?</p>
                    <p className="text-xs text-muted-foreground">Sube el PDF o una foto para extraer TIN, TAE y cuotas automáticamente.</p>
                  </div>
                  <Input 
                    type="file" 
                    className="hidden" 
                    id="doc-upload" 
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={analyzing}
                    onClick={() => document.getElementById('doc-upload')?.click()}
                  >
                    {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2" />}
                    {analyzing ? 'Analizando...' : 'Subir Documento'}
                  </Button>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Checkbox 
                    id="isDebt" 
                    checked={goal.isExistingDebt}
                    onCheckedChange={(checked) => setGoal({ ...goal, isExistingDebt: !!checked })}
                  />
                  <Label htmlFor="isDebt" className="text-sm cursor-pointer">Es una deuda que ya estoy pagando</Label>
                </div>

                {goal.isExistingDebt && (
                  <div className="space-y-4 p-4 border rounded-xl bg-slate-50 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Capital Pendiente</Label>
                        <Input 
                          type="number" 
                          value={goal.targetAmount || ''}
                          onChange={(e) => setGoal({ ...goal, targetAmount: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cuota Mensual</Label>
                        <Input 
                          type="number" 
                          value={goal.existingMonthlyPayment || ''}
                          onChange={(e) => setGoal({ ...goal, existingMonthlyPayment: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TIN (%)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={goal.tin || ''}
                          onChange={(e) => setGoal({ ...goal, tin: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TAE (%)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={goal.tae || ''}
                          onChange={(e) => setGoal({ ...goal, tae: Number(e.target.value) })}
                        />
                      </div>
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
                        <p className="font-bold text-sm">Priorizar Seguridad</p>
                        <p className="text-xs opacity-70">Completa el fondo de emergencia antes de amortizar extra.</p>
                      </div>
                    </Button>
                    <Button 
                      variant={goal.strategy === 'balanced' ? 'default' : 'outline'} 
                      className="h-auto py-3 px-4 flex justify-start items-start space-x-3 text-left"
                      onClick={() => setGoal({ ...goal, strategy: 'balanced' })}
                    >
                      <Scale className="w-5 h-5 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">Equilibrado</p>
                        <p className="text-xs opacity-70">Reparte el ahorro entre fondo y meta (50/50).</p>
                      </div>
                    </Button>
                    <Button 
                      variant={goal.strategy === 'goal_first' ? 'default' : 'outline'} 
                      className="h-auto py-3 px-4 flex justify-start items-start space-x-3 text-left"
                      onClick={() => setGoal({ ...goal, strategy: 'goal_first' })}
                    >
                      <Zap className="w-5 h-5 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">Priorizar Meta</p>
                        <p className="text-xs opacity-70">Todo el esfuerzo a liquidar la meta/deuda.</p>
                      </div>
                    </Button>
                  </div>
                </div>
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
                    <span className="text-xs opacity-80">Independientemente de ingresos</span>
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
              {step === totalSteps ? 'Generar Informe Detallado' : 'Siguiente'} <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
