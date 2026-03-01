'use client';

import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, ShieldCheck } from 'lucide-react';
import { useInView } from '@/hooks/use-in-view';

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const { ref: contentRef, isInView: contentInView } = useInView({ threshold: 0.08, triggerOnce: true });

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const height = sectionRef.current.offsetHeight;
      const t = rect.top < 0 ? Math.min(1, -rect.top / (height * 0.6)) : 0;
      setOffset(t);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const parallaxY = offset * 30;

  return (
    <section
      id="features"
      ref={sectionRef}
      className="w-full py-20 md:py-28 lg:py-36 bg-white relative overflow-hidden"
      aria-labelledby="features-heading"
    >
      {/* Capa de profundidad sutil: grid que se mueve con scroll */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        style={{ transform: `translateY(${parallaxY}px)` }}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>
      <div className="container px-4 md:px-8 lg:px-12 mx-auto relative z-10" ref={contentRef}>
        <div className="flex flex-col items-center justify-center space-y-5 text-center mb-16">
          <h2 id="features-heading" className={`text-3xl font-headline font-bold tracking-tighter sm:text-4xl lg:text-5xl ${contentInView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`}>
            Diseñado para la vida real
          </h2>
          <p className={`max-w-[720px] text-muted-foreground md:text-lg leading-relaxed ${contentInView ? 'opacity-100 animate-fade-in' : 'opacity-0'}`} style={contentInView ? { animationDelay: '0.1s' } : undefined}>
            Olvídate de hojas de cálculo complejas. FinanciMate aplica lógica financiera profesional a tu situación personal.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <Card className={`border-none shadow-lg bg-background/50 hover:shadow-xl transition-shadow ${contentInView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={contentInView ? { animationDelay: '0.15s' } : undefined}>
            <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-headline font-bold">Metas Claras</h3>
              <p className="text-muted-foreground">Define qué quieres lograr y nosotros calculamos el camino más corto y seguro.</p>
            </CardContent>
          </Card>
          <Card className={`border-none shadow-lg bg-background/50 hover:shadow-xl transition-shadow ${contentInView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={contentInView ? { animationDelay: '0.25s' } : undefined}>
            <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-headline font-bold">Economía Compartida</h3>
              <p className="text-muted-foreground">Repartos proporcionales según ingresos. Justo, transparente y sin discusiones.</p>
            </CardContent>
          </Card>
          <Card className={`border-none shadow-lg bg-background/50 hover:shadow-xl transition-shadow ${contentInView ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`} style={contentInView ? { animationDelay: '0.35s' } : undefined}>
            <CardContent className="pt-8 flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-headline font-bold">Seguridad Primero</h3>
              <p className="text-muted-foreground">Priorizamos tu fondo de emergencia para que ningún imprevisto detenga tu progreso.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
