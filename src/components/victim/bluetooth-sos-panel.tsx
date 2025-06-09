
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Bluetooth, XCircle, Loader2, Zap, Volume2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type SOSStatus = "inactive" | "activating" | "active" | "error" | "unsupported";

export function BluetoothSOSPanel() {
  const [status, setStatus] = useState<SOSStatus>("inactive");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashlightActive, setIsFlashlightActive] = useState(false);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('sos') === 'true' && status === "inactive") {
      activateSOS();
    }
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

  const activateSOS = async () => {
    setStatus("activating");
    setError(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth API is not supported by your browser. SOS broadcast cannot be initiated.");
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot broadcast SOS.", variant: "destructive" });
      return;
    }

    try {
      const loc = await getDeviceLocation();
      setLocation(loc);
      
      console.log(`Simulating SOS broadcast. Device name format: SOS_${loc.lat}_${loc.lon}`);
      toast({
        title: "SOS Activating",
        description: `Attempting to broadcast SOS with location: LAT ${loc.lat}, LON ${loc.lon}. (Simulated Bluetooth broadcast)`,
      });

      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate activation delay

      setIsFlashlightActive(true); // Simulate flashlight activation
      setIsBuzzerActive(true); // Simulate buzzer activation
      setStatus("active");
      toast({ title: "SOS Active", description: "Your SOS signal and alerts are active (simulated).", variant: "default" });

    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to activate SOS.");
      toast({ title: "SOS Activation Failed", description: err.message || "Could not activate SOS.", variant: "destructive" });
    }
  };

  const deactivateSOS = () => {
    setStatus("inactive");
    setError(null);
    setLocation(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    toast({ title: "SOS Deactivated", description: "SOS broadcast and alerts have been stopped." });
  };

  const getStatusContent = () => {
    switch (status) {
      case "inactive":
        return { icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />, text: "SOS is Inactive.", color: "text-muted-foreground" };
      case "activating":
        return { icon: <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />, text: "Activating SOS...", color: "text-primary" };
      case "active":
        return { icon: <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />, text: `SOS Active! Broadcasting: ${location ? `LAT ${location.lat}, LON ${location.lon}` : 'Location N/A'}`, color: "text-green-500" };
      case "error":
        return { icon: <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: `Error: ${error}`, color: "text-destructive" };
      case "unsupported":
        return { icon: <Bluetooth className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: "Bluetooth not supported by browser.", color: "text-destructive" };
      default:
        return { icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />, text: "SOS is Inactive.", color: "text-muted-foreground" };
    }
  };

  const { icon, text, color } = getStatusContent();

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-center">Victim SOS Mode</CardTitle>
        <CardDescription className="text-center text-xs sm:text-sm">
          Broadcast your location and activate alerts. (Simulated for web environment)
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4 py-6 sm:py-10">
        <div className={`flex justify-center items-center ${color}`}>
          {icon}
        </div>
        <p className={`text-base font-semibold ${color} px-2`}>{text}</p>
        
        {status === "active" && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-center gap-1.5 text-sm text-green-500">
              <Zap className="w-4 h-4" /> <span>Flashlight Blinking (Simulated)</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-sm text-green-500">
              <Volume2 className="w-4 h-4" /> <span>SOS Buzzer Active (Simulated)</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Ensure Bluetooth is ON. Rescuers nearby may detect your signal.
            </p>
          </div>
        )}

         {status === "error" && error?.includes("Geolocation") && (
          <p className="text-xs text-destructive">
            Please enable location services in your browser and system settings and try again.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 p-4 sm:p-6 border-t">
        {status !== "active" && status !== "activating" && (
          <Button onClick={activateSOS} size="default" className="w-full sm:w-auto bg-accent hover:bg-accent/80 text-accent-foreground text-sm">
            <AlertTriangle className="mr-2 h-4 w-4" /> Activate SOS
          </Button>
        )}
        {(status === "active" || status === "activating") && (
          <Button onClick={deactivateSOS} variant="outline" size="default" className="w-full sm:w-auto text-sm">
            <XCircle className="mr-2 h-4 w-4" /> Deactivate SOS
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
