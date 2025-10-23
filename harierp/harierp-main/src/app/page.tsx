
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginUser, isAuthenticated } from '@/lib/auth'; 
import { useToast } from '@/hooks/use-toast';
import { Loader2, Droplets } from 'lucide-react';
import Logo from '@/components/layout/Logo';
import Image from 'next/image';

const AxisERPLogo = () => (
  <div className="flex items-center gap-4 text-primary">
    <div className="flex size-20 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <span className="font-black text-4xl">S+</span>
    </div>
    <span className="text-6xl font-extrabold tracking-tight">Axis ERP</span>
  </div>
);


export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated()) {
      const userRole = localStorage.getItem('currentUserRole');
      let intendedDestination = '/dashboard';
      // Adjust redirects based on new roles
      if (userRole === 'ProductionManager') intendedDestination = '/production';
      if (userRole === 'Laboratory') intendedDestination = '/laboratory';
      
      router.replace(intendedDestination);
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Username and password cannot be empty.');
      setIsLoading(false);
      return;
    }

    const loginResult = await loginUser(username, password);

    if (loginResult.success && loginResult.user) {
      toast({
        title: 'Login Successful',
        description: `Welcome, ${loginResult.user.name}! Role: ${loginResult.user.role}`,
      });
      
      let intendedDestination = '/dashboard';
      // Adjust redirects based on new roles
      if (loginResult.user.role === 'ProductionManager') intendedDestination = '/production';
      if (loginResult.user.role === 'Laboratory') intendedDestination = '/laboratory';
      
      router.push(intendedDestination);
    } else {
      setError(loginResult.message || 'Invalid credentials.');
      toast({
        title: 'Login Failed',
        description: loginResult.message || 'Invalid username or password.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };
  
  if (typeof window !== 'undefined' && isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-between p-6">
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <AxisERPLogo />
            <p className="mt-4 text-xl text-muted-foreground">Smart, Scalable, Seamless</p>
        </div>
        <p className="text-xs text-muted-foreground">
            Developed by: Sagheer Plus Lab Limited
        </p>
      </div>
      <div className="flex items-center justify-center py-12">
          <Card className="mx-auto w-full max-w-md shadow-xl border-none lg:border lg:shadow-sm">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <Logo className="text-2xl" />
              </div>
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && <p className="text-sm font-medium text-destructive text-center pt-1">{error}</p>}
                <Button type="submit" className="w-full !mt-6" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
