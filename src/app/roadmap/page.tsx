'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Roadmap, PlanResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PiggyBank, Calendar, ArrowRight, TrendingUp, ShieldCheck, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('financiMate_roadmap');
    if (stored) {
      try {
        setRoadmap(JSON.parse(stored));
      } catch (e) {
        console.error("Error loading roadmap", e);
      }
    }
  }, []);

  const removePlan = (id: string) => {
    if (!roadmap) return;
    const newItems = roadmap.items.filter(item => item.id !== id);
    const newRoadmap = { ...roadmap, items: newItems, lastUpdated: new Date().toISOString() };
    setRoadmap(newRoadmap);
    localStorage.setItem('financiMate_roadmap', JSON.stringify(newRoadmap));
  };

  const clearRoadmap = () => {
    if (confirm("¿Estás seguro de que quieres borrar todo tu roadmap?")) {
      localStorage.removeItem('financiMate_roadmap');
      setRoadmap(null);
    }
  };

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
  const firstPlan = roadmap.items[0];

  return (
    <div className="min-h-screen bg-background pb-12">
      <nav className="h-16 flex items-center px-4 md:px-8 border-b bg-white sticky top-0 z-50">
        <div className="flex items-center space-x-2" onClick={() => router.push('/')}>
          <PiggyBank className="text-primary w-6 h-6 cursor-pointer" />
          <span className="font-headline font-bold text-lg cursor-pointer">FinanciMate</span>
        </div>
        <div className="ml-auto flex gap-2">
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

                    <div className="flex flex-wrap gap-4">
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Importe Meta</p>
                        <p className="font-bold">€{plan.goal.targetAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-accent">Fondo Final</p>
                        <p className="font-bold text-accent">€{plan.totalEmergencySaved.toFixed(2)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePlan(plan.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
    </div>
  );
}
