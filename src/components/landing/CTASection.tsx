'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface CTASectionProps {
  hasData: boolean;
}

export function CTASection({ hasData }: CTASectionProps) {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground" aria-labelledby="cta-heading">
      <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8">
        <h2 id="cta-heading" className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">¿Listo para tomar el control?</h2>
        <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">Únete a miles de personas que ya planifican su éxito financiero con FinanciMate.</p>
        <Button asChild size="lg" variant="secondary" className="rounded-full px-12 font-bold">
          <Link href={hasData ? '/dashboard' : '/onboarding'}>
            {hasData ? 'Continuar con mi Plan' : 'Empezar Onboarding'}
          </Link>
        </Button>
      </div>
    </section>
  );
}
