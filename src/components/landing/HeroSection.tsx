'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight, ListOrdered, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';

export interface HeroSectionProps {
  hasData: boolean;
  hasRoadmap: boolean;
}

export function HeroSection({ hasData, hasRoadmap }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const height = sectionRef.current.offsetHeight;
      // Avance 0..1 según scroll dentro del hero
      const t = rect.top < 0 ? Math.min(1, -rect.top / (height * 0.5)) : 0;
      setScrollOffset(t);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const parallax1 = scrollOffset * 40;
  const parallax2 = scrollOffset * 80;

  return (
    <section
      ref={sectionRef}
      className="w-full py-16 md:py-28 lg:py-36 xl:py-44 bg-gradient-to-b from-white to-background overflow-hidden relative"
      aria-label="Presentación principal"
    >
      {/* Capas parallax: gradiente y formas geométricas sutiles */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{ transform: `translateY(${parallax1}px)` }}
        aria-hidden
      >
        <div className="absolute top-1/4 right-0 w-[80%] max-w-2xl h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{ transform: `translateY(${parallax2}px)` }}
        aria-hidden
      >
        <div className="absolute bottom-1/4 left-0 w-72 h-72 border border-primary/10 rounded-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 border border-accent/10 rounded-full" />
      </div>
      <div className="container px-4 md:px-8 lg:px-12 mx-auto relative z-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-16 xl:grid-cols-[1fr_600px] items-center">
          <div className="flex flex-col justify-center space-y-6 opacity-0 animate-fade-in-up">
            <div className="inline-block rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent-foreground border border-accent/30 w-fit">
              Tu futuro financiero empieza aquí
            </div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
              Planifica tus metas <span className="text-primary">en menos de 90 segundos</span>
            </h1>
            <p className="max-w-[540px] text-muted-foreground md:text-lg font-body leading-relaxed">
              Motor de decisión que te dice exactamente cuánto aportar para lograr tus metas, solo o en pareja.
            </p>

            <div className="flex flex-col gap-4 pt-2">
              {hasRoadmap ? (
                <>
                  <Button asChild size="lg" className="px-8 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg w-fit">
                    <Link href="/roadmap">Ver mi Roadmap <ListOrdered className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Link href="/onboarding" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-fit">
                    Añadir nueva meta
                  </Link>
                </>
              ) : hasData ? (
                <>
                  <Button asChild size="lg" className="px-8 rounded-full w-fit">
                    <Link href="/dashboard">Ir a mi Dashboard <LayoutDashboard className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Link href="/onboarding" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-fit">
                    Reiniciar configuración
                  </Link>
                </>
              ) : (
                <Button asChild size="lg" className="px-8 rounded-full shadow-xl shadow-primary/20 w-fit">
                  <Link href="/onboarding">Generar mi Plan <ChevronRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              )}
              {!hasData && (
                <p className="text-sm text-muted-foreground">
                  Planificación clara y paso a paso. Sin compromiso.
                </p>
              )}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[500px] aspect-square rounded-3xl overflow-hidden shadow-2xl rotate-3">
            <Image
              src="https://picsum.photos/seed/finance1/600/600"
              alt="Vista de planificación financiera con FinanciMate"
              width={600}
              height={600}
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 500px"
              data-ai-hint="finance planning"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
