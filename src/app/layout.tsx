import type {Metadata} from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FinanciMate - Tu Orientador de Finanzas Personales',
  description: 'Alcanza tus metas financieras con un plan realista y equitativo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={spaceGrotesk.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <FirebaseClientProvider>
          <TooltipProvider delayDuration={0}>
            {children}
            <Toaster />
          </TooltipProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
