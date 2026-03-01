'use client';

import Link from 'next/link';
import { PiggyBank } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="w-full py-6 px-4 md:px-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-background">
      <div className="flex items-center space-x-2">
        <PiggyBank className="text-primary w-4 h-4" aria-hidden />
        <p className="text-xs text-muted-foreground">© 2025 FinanciMate. Información orientativa, no asesoramiento financiero personalizado.</p>
      </div>
      <nav className="flex gap-4 sm:gap-6" aria-label="Enlaces legales">
        <Link className="text-xs hover:underline underline-offset-4" href="#" aria-label="Términos de uso">Términos</Link>
        <Link className="text-xs hover:underline underline-offset-4" href="#" aria-label="Política de privacidad">Privacidad</Link>
      </nav>
    </footer>
  );
}
