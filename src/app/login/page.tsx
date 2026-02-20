'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn, initiateEmailSignUp, initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PiggyBank, Mail, Lock, LogIn, UserPlus, Ghost } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (isSignUp) {
      initiateEmailSignUp(auth, email, password);
      toast({ title: "Creando cuenta...", description: "Te estamos registrando en FinanciMate." });
    } else {
      initiateEmailSignIn(auth, email, password);
      toast({ title: "Iniciando sesión...", description: "Bienvenido de nuevo." });
    }
  };

  const handleAnonymous = () => {
    initiateAnonymousSignIn(auth);
    toast({ title: "Entrando como invitado...", description: "Tus datos se guardarán localmente." });
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl">
        <CardHeader className="space-y-4 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
            <PiggyBank className="w-8 h-8" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-headline font-bold">FinanciMate</CardTitle>
            <CardDescription>Tu futuro financiero, bajo control.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full rounded-full font-bold">
              {isSignUp ? <><UserPlus className="w-4 h-4 mr-2" /> Crear Cuenta</> : <><LogIn className="w-4 h-4 mr-2" /> Iniciar Sesión</>}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">O continúa con</span></div>
          </div>

          <Button variant="outline" onClick={handleAnonymous} className="w-full rounded-full border-dashed">
            <Ghost className="w-4 h-4 mr-2" /> Entrar como Invitado
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Button variant="link" size="sm" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
