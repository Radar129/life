
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SOSScannerPanel } from '@/components/rescuer/sos-scanner-panel';
import { MapDisplayPanel } from '@/components/rescuer/map-display-panel';
import { RescuerAdvicePanel } from '@/components/rescuer/rescuer-advice-panel';
import { RescuerLogPanel } from '@/components/rescuer/rescuer-log-panel';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DetectedSignal {
  id: string;
  name: string;
  rssi: number;
  lat?: number;
  lon?: number;
  timestamp: number;
  status?: string; 
  advertisedName?: string;
}

export default function RescuerPage() {
  const [detectedSignals, setDetectedSignals] = useState<DetectedSignal[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Default to false

  // Effect for authentication check and setting isAuthenticated state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem('isRescuerAuthenticated');
      if (authStatus !== 'true') {
        router.replace('/rescuer/login');
        // No toast here; login page implies requirement.
      } else {
        setIsAuthenticated(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Only router as dependency

  // Effect for logging when authentication is confirmed
  useEffect(() => {
    if (isAuthenticated) {
      // Dispatch the log event after the current render cycle is complete
      const timerId = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Rescuer Dashboard: Authenticated and loaded." }));
      }, 0); 
      return () => clearTimeout(timerId); // Cleanup timeout
    }
  }, [isAuthenticated]); // This effect runs when isAuthenticated changes

  const handleSignalsDetected = (signals: DetectedSignal[]) => {
    setDetectedSignals(signals);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('isRescuerAuthenticated');
        setIsAuthenticated(false); // Update local state immediately
    }
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    // Ensure this log also happens after state updates and router navigation might be initiated
    setTimeout(() => { 
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Rescuer Dashboard: Logged out." }));
    }, 0);
    router.replace('/'); 
  };

  if (!isAuthenticated) {
    // Show a loading state or minimal UI while checking auth / redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] py-6">
        {/* Removed Loader2 to simplify, text indicates status */}
        <p className="text-muted-foreground">Verifying access...</p>
      </div>
    );
  }

  // Main dashboard content, rendered only if isAuthenticated is true
  return (
    <div className="container mx-auto py-4 sm:py-6">
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-headline font-bold text-primary">Rescuer Dashboard</h1>
            <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1">
            Access tools to locate victims and receive operational advice.
            </p>
        </div>
        <Button variant="outline" onClick={handleLogout} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
          <LogOut className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Logout
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <SOSScannerPanel detectedSignals={detectedSignals} setDetectedSignals={setDetectedSignals}/>
          <MapDisplayPanel signals={detectedSignals} />
        </div>
        <div className="lg:sticky lg:top-[calc(4rem+1.5rem)] space-y-4 sm:space-y-6">
          <RescuerAdvicePanel />
        </div>
      </div>
      <div className="mt-6"> 
         <RescuerLogPanel />
      </div>
    </div>
  );
}

