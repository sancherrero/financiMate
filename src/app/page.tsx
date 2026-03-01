'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PiggyBank, ListOrdered } from 'lucide-react';
import { readRoadmap, readSnapshot } from '@/lib/local-storage';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const [hasData, setHasData] = useState(false);
  const [hasRoadmap, setHasRoadmap] = useState(false);

  useEffect(() => {
    const { value: snapshot } = readSnapshot();
    const { value: roadmap } = readRoadmap();

    if (snapshot) setHasData(true);
    if (roadmap && roadmap.goals.length > 0) setHasRoadmap(true);
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
        <nav className="ml-auto flex items-center gap-4 sm:gap-6" aria-label="Navegación principal">
          {hasRoadmap && (
            <Link className="hidden md:flex text-sm font-medium hover:text-primary transition-colors items-center" href="/roadmap">
              <ListOrdered className="w-4 h-4 mr-1" /> Mi Roadmap
            </Link>
          )}
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
            Características
          </Link>
          <Button asChild variant="default" size="sm" className="rounded-full">
            <Link href={hasData ? '/dashboard' : '/onboarding'}>
              {hasData ? 'Ir a mi Dashboard' : 'Empezar'}
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <HeroSection hasData={hasData} hasRoadmap={hasRoadmap} />
        <FeaturesSection />
        <CTASection hasData={hasData} />
      </main>

      <LandingFooter />
    </div>
  );
}
