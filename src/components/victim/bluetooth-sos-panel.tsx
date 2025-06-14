
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Bluetooth, XCircle, Loader2, Zap, Volume2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { VictimBasicInfo } from '@/types/signals';

type SOSStatus = "inactive" | "activating" | "active" | "error" | "unsupported";

export function BluetoothSOSPanel() {
  const [status, setStatus] = useState<SOSStatus>("inactive");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashlightActive, setIsFlashlightActive] = useState(false);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(0);
  const [rebroadcastIntervalId, setRebroadcastIntervalId] = useState<NodeJS.Timeout | null>(null);

  const REBROADCAST_INTERVAL = 30; // seconds

  useEffect(() => {
    if (searchParams.get('sos') === 'true' && status === "inactive") {
      activateSOS();
    }
    return () => {
      if (rebroadcastIntervalId) clearInterval(rebroadcastIntervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, status]);

  const getDeviceLocation = (): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lon: parseFloat(position.coords.longitude.toFixed(4)),
          });
        },
        (err) => {
          reject(new Error(`Geolocation error: ${err.message}. Please ensure location services are enabled.`));
        }
      );
    });
  };

  const broadcastSignal = (currentLocation: { lat: number; lon: number }) => {
    const storedBasicInfo = localStorage.getItem('victimBasicInfo');
    let basicInfo: VictimBasicInfo | null = null;
    let sosMessage = "Emergency! I need help. My location is being broadcast.";

    if (storedBasicInfo) {
      try {
        basicInfo = JSON.parse(storedBasicInfo);
        if (basicInfo?.customSOSMessage) {
          sosMessage = basicInfo.customSOSMessage;
        }
      } catch (e) {
        console.error("Could not parse victim basic info from localStorage", e);
      }
    }
    
    const fullMessage = `${sosMessage} Location: LAT ${currentLocation.lat}, LON ${currentLocation.lon}.`;
    console.log(`SOS broadcast. Device name format: SOS_${currentLocation.lat}_${currentLocation.lon}`);
    console.log("User Info Sent:", basicInfo);
    console.log("Full SOS Message Sent:", fullMessage);
    
    const logDetail = `SOS Signal Broadcast: LAT ${currentLocation.lat}, LON ${currentLocation.lon}.`;
    window.dispatchEvent(new CustomEvent('newAppLog', { detail: logDetail }));
    toast({
      title: "SOS Broadcasting",
      description: `Signal sent with: LAT ${currentLocation.lat}, LON ${currentLocation.lon}.`,
    });
  };

  const startRebroadcastCountdown = (currentLocation: {lat: number, lon: number}) => {
    setCountdown(REBROADCAST_INTERVAL);
    if (rebroadcastIntervalId) clearInterval(rebroadcastIntervalId); 
    const intervalId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          broadcastSignal(currentLocation); 
          return REBROADCAST_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    setRebroadcastIntervalId(intervalId);
  };


  const activateSOS = async () => {
    setStatus("activating");
    setError(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    if (rebroadcastIntervalId) {
        clearInterval(rebroadcastIntervalId);
        setRebroadcastIntervalId(null);
    }

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      const errorMsg = "Web Bluetooth API is not supported by your browser. SOS broadcast cannot be initiated.";
      setError(errorMsg);
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activation Failed: Web Bluetooth not supported.` }));
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot broadcast SOS.", variant: "destructive" });
      return;
    }

    try {
      const loc = await getDeviceLocation();
      setLocation(loc);
      
      broadcastSignal(loc); // Initial broadcast

      await new Promise(resolve => setTimeout(resolve, 1000)); 

      setIsFlashlightActive(true); 
      setIsBuzzerActive(true); 
      setStatus("active");
      startRebroadcastCountdown(loc);
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activated. Broadcasting from LAT ${loc.lat}, LON ${loc.lon}. Alerts enabled.` }));
      toast({ title: "SOS Active", description: "Your SOS signal and alerts are active. Rebroadcasting periodically.", variant: "default" });

    } catch (err: any) {
      setStatus("error");
      const errorMsg = err.message || "Failed to activate SOS.";
      setError(errorMsg);
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activation Failed: ${errorMsg}` }));
      toast({ title: "SOS Activation Failed", description: errorMsg, variant: "destructive" });
    }
  };

  const deactivateSOS = () => {
    setStatus("inactive");
    setError(null);
    setLocation(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    if (rebroadcastIntervalId) clearInterval(rebroadcastIntervalId);
    setRebroadcastIntervalId(null);
    setCountdown(0);
    window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Deactivated. Alerts stopped." }));
    toast({ title: "SOS Deactivated", description: "SOS broadcast and alerts have been stopped." });
  };

  const getStatusContent = () => {
    switch (status) {
      case "inactive":
        return { icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: "SOS is OFF.", color: "text-muted-foreground" };
      case "activating":
        return { icon: <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />, text: "Activating SOS...", color: "text-primary" };
      case "active":
        return { icon: <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />, text: `SOS Active! Broadcasting: ${location ? `LAT ${location.lat}, LON ${location.lon}` : 'Location N/A'}`, color: "text-green-500" };
      case "error":
        return { icon: <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: `Error: ${error}`, color: "text-destructive" };
      case "unsupported":
        return { icon: <Bluetooth className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: "Bluetooth not supported by browser.", color: "text-destructive" };
      default:
        return { icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: "SOS is OFF.", color: "text-muted-foreground" };
    }
  };

  const { icon, text, color } = getStatusContent();

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-xl sm:text-2xl text-center">SOS Alert Box</CardTitle>
        <CardDescription className="text-center text-xs sm:text-sm">
          Broadcast your location and activate alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-3 py-4 sm:py-6">
        <div className={`flex justify-center items-center`}>
          {icon}
        </div>
        <p className={`text-base sm:text-lg font-semibold ${color} px-2`}>{text}</p>
        
        {status === "active" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-green-500">
              <Zap className="w-3 h-3" /> <span>Flashlight Blinking</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-green-500">
              <Volume2 className="w-3 h-3" /> <span>SOS Buzzer Active</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Rebroadcasting signal in: <span className="font-semibold text-primary">{countdown}s</span>
            </p>
             <p className="text-xs text-muted-foreground mt-2">
            Rescuers nearby may detect your signal.
          </p>
          </div>
        )}

         {status === "error" && error?.includes("Geolocation") && (
          <p className="text-xs text-destructive pt-2">
            Please enable location services in your browser and system settings and try again.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 p-4 border-t">
        {status !== "active" && status !== "activating" && (
          <Button onClick={activateSOS} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/80 text-accent-foreground text-sm sm:text-base py-3 h-14">
            <AlertTriangle className="mr-2 h-5 w-5" /> ACTIVATE SOS
          </Button>
        )}
        {(status === "active" || status === "activating") && (
          <Button 
            onClick={deactivateSOS} 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto text-sm sm:text-base py-3 h-14 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
          >
            <XCircle className="mr-2 h-5 w-5" /> Deactivate SOS
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
