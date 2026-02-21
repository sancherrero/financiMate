'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PiggyBank, Users, Target, Zap, ShieldCheck, ChevronRight, ListOrdered, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  const [hasData, setHasData] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(false);

  useEffect(() => {
    const snapshot = localStorage.getItem('financiMate_snapshot');
    const roadmap = localStorage.getItem('financiMate_roadmap');
    
    if (snapshot) setHasData(true);
    if (roadmap) {
      try {
        const parsed = JSON.parse(roadmap);
        // Soporte para modelo nuevo (goals) y antiguo (items) durante la transición
        const goalsCount = (parsed.goals?.length || 0) + (parsed.items?.length || 0);
        if (goalsCount > 0) setHasRoadmap(true);
      } catch (e) {
        console.error("Error parsing roadmap in landing", e);
      }
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center space-x-2" href="/">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <PiggyBank className="text-white w-5 h-5" />
          </div>
          <span className="font-headline font-bold text-xl tracking-tight">FinanciMate</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          {hasRoadmap && (
            <Link className="hidden md:flex text-sm font-medium hover:text-primary transition-colors items-center" href="/roadmap">
              <ListOrdered className="w-4 h-4 mr-1" /> Mi Roadmap
            </Link>
          )}
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
            Características
          </Link>
          <Button asChild variant="default" size="sm" className="rounded-full">
            <Link href={hasData ? "/dashboard" : "/onboarding"}>
              {hasData ? "Ir a mi Dashboard" : "Empezar"}
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-white to-background overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="inline-block rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent-foreground border border-accent/30 w-fit">
                  Tu futuro financiero empieza aquí
                </div>
                <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Planifica tus metas <br /><span className="text-primary">en menos de 90 segundos</span>
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl font-body">
                  No somos otro tracker de gastos. Somos el motor de decisión que te dice exactamente cuánto aportar para lograr tus sueños, solo o en pareja.
                </p>
                
                <div className="flex flex-col gap-3 min-[400px]:flex-row pt-4">
                  {hasRoadmap ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button asChild size="lg" className="px-8 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg">
                        <Link href="/roadmap">Ver mi Roadmap <ListOrdered className="ml-2 h-4 w-4" /></Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="px-8 rounded-full">
                        <Link href="/onboarding">Añadir Nueva Meta</Link>
                      </Button>
                    </div>
                  ) : hasData ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button asChild size="lg" className="px-8 rounded-full">
                        <Link href="/dashboard">Ver mis Escenarios <LayoutDashboard className="ml-2 h-4 w-4" /></Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="px-8 rounded-full">
                        <Link href="/onboarding">Reiniciar Configuración</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button asChild size="lg" className="px-8 rounded-full shadow-xl shadow-primary/20">
                      <Link href="/onboarding">Generar mi Plan <ChevronRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  )}
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[500px] aspect-square rounded-3xl overflow-hidden shadow-2xl rotate-3">
                <Image
                  src="https://picsum.photos/seed/finance1/600/600"
                  alt="FinanciMate Dashboard"
                  width={600}
                  height={600}
                  className="object-cover"
                  data-ai-hint="finance planning"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">Diseñado para la vida real</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Olvídate de hojas de cálculo complejas. FinanciMate aplica lógica financiera profesional a tu situación personal.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none shadow-lg bg-background/50 hover:shadow-xl transition-shadow">
                <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Target className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-headline font-bold">Metas Claras</h3>
                  <p className="text-muted-foreground">Define qué quieres lograr y nosotros calculamos el camino más corto y seguro.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg bg-background/50 hover:shadow-xl transition-shadow">
                <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-headline font-bold">Economía Compartida</h3>
                  <p className="text-muted-foreground">Repartos proporcionales según ingresos. Justo, transparente y sin discusiones.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-lg bg-background/50 hover:shadow-xl transition-shadow">
                <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
                  <div className="p-3 bg-orange-100 rounded-2xl text-orange-500">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-headline font-bold">Seguridad Primero</h3>
                  <p className="text-muted-foreground">Priorizamos tu fondo de emergencia para que ningún imprevisto detenga tu progreso.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8">
            <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">¿Listo para tomar el control?</h2>
            <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">Únete a miles de personas que ya planifican su éxito financiero con FinanciMate.</p>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-12 font-bold">
              <Link href={hasData ? "/dashboard" : "/onboarding"}>
                {hasData ? "Continuar con mi Plan" : "Empezar Onboarding"}
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 px-4 md:px-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center space-x-2">
          <PiggyBank className="text-primary w-4 h-4" />
          <p className="text-xs text-muted-foreground">© 2024 FinanciMate. Información orientativa, no asesoramiento financiero personalizado.</p>
        </div>
        <nav className="flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Términos</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacidad</Link>
        </nav>
      </footer>
    </div>
  );
}
