
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
// import { useToast } from '@/hooks/use-toast'; // Removed useToast import

export default function RescuerLoginPage() {
  const router = useRouter();
  // const { toast } = useToast(); // Removed toast usage

  useEffect(() => {
    // Automatically "log in" the rescuer and redirect
    if (typeof window !== 'undefined') {
      localStorage.setItem('isRescuerAuthenticated', 'true');
      // toast({ title: "Access Granted", description: "Redirecting to Rescuer Dashboard..." }); // Removed toast call
      router.replace('/rescuer');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-7rem)] py-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-xl sm:text-2xl mb-1">Rescuer Area Access</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Granting access to the Rescuer Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 text-center">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Redirecting, please wait...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
