
"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertTriangle, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// In a real app, this would be securely managed. For prototype:
const MASTER_KEY = "RESCUE123"; 

export default function RescuerLoginPage() {
  const [masterKey, setMasterKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (typeof window !== 'undefined' && localStorage.getItem('isRescuerAuthenticated') === 'true') {
      router.replace('/rescuer');
    }
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API call / key check
    setTimeout(() => {
      if (masterKey === MASTER_KEY) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('isRescuerAuthenticated', 'true');
        }
        toast({ title: "Login Successful", description: "Redirecting to Rescuer Dashboard..." });
        router.push('/rescuer');
      } else {
        setError("Invalid Master Key. Access Denied.");
        toast({ title: "Login Failed", description: "Invalid master key.", variant: "destructive" });
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem-4rem)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl mb-2">Rescuer Team Login</CardTitle>
          <CardDescription>
            Enter the Master Key to access the Rescuer Dashboard.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="masterKey" className="text-base">Master Key</Label>
              <Input
                id="masterKey"
                type="password"
                placeholder="Enter your secure master key"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                disabled={isLoading}
                className="text-lg"
              />
            </div>
            {error && (
              <div className="flex items-center text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertTriangle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="p-6 border-t">
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-lg py-6" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Access Dashboard
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

// Simple Loader2 icon if not already available globally or via lucide for this page scope
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
