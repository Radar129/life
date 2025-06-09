
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
        return { icon: <XCircle className="w-12 h-12 text-muted-foreground" />, text: "SOS is Inactive.", color: "text-muted-foreground" };
      case "activating":
        return { icon: <Loader2 className="w-12 h-12 text-primary animate-spin" />, text: "Activating SOS...", color: "text-primary" };
      case "active":
        return { icon: <CheckCircle className="w-12 h-12 text-green-500" />, text: `SOS Active! Broadcasting location: ${location ? `LAT ${location.lat}, LON ${location.lon}` : 'N/A'}`, color: "text-green-500" };
      case "error":
        return { icon: <AlertTriangle className="w-12 h-12 text-destructive" />, text: `Error: ${error}`, color: "text-destructive" };
      case "unsupported":
        return { icon: <Bluetooth className="w-12 h-12 text-destructive" />, text: "Bluetooth not supported by browser.", color: "text-destructive" };
      default:
        return { icon: <XCircle className="w-12 h-12 text-muted-foreground" />, text: "SOS is Inactive.", color: "text-muted-foreground" };
    }
  };

  const { icon, text, color } = getStatusContent();

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-center">Victim SOS Mode</CardTitle>
        <CardDescription className="text-center">
          Broadcast your location and activate alerts. (Simulated for web environment)
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-6 py-10">
        <div className={`flex justify-center items-center ${color}`}>
          {icon}
        </div>
        <p className={`text-lg font-semibold ${color}`}>{text}</p>
        
        {status === "active" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-500">
              <Zap className="w-5 h-5" /> <span>Flashlight Blinking (Simulated)</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-500">
              <Volume2 className="w-5 h-5" /> <span>SOS Buzzer Active (Simulated)</span>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              Ensure your device's Bluetooth is ON. Rescuers nearby may detect your signal.
            </p>
          </div>
        )}

         {status === "error" && error?.includes("Geolocation") && (
          <p className="text-sm text-destructive">
            Please enable location services in your browser and system settings and try again.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 p-6 border-t">
        {status !== "active" && status !== "activating" && (
          <Button onClick={activateSOS} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/80 text-accent-foreground">
            <AlertTriangle className="mr-2 h-5 w-5" /> Activate SOS
          </Button>
        )}
        {(status === "active" || status === "activating") && (
          <Button onClick={deactivateSOS} variant="outline" size="lg" className="w-full sm:w-auto">
            <XCircle className="mr-2 h-5 w-5" /> Deactivate SOS
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
