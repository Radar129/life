
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Bluetooth, XCircle, Loader2, Zap, Volume2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { VictimBasicInfo, DetectedSignal } from '@/types/signals';

type SOSStatus = "inactive" | "activating" | "active" | "error" | "unsupported";

// Key for this panel's own persistent state
const LOCAL_STORAGE_VICTIM_SOS_STATE_KEY = 'persistedR.A.D.A.R.SOSState'; 
// Key for sharing the currently "broadcast" signal with the RescuerPanel on the same device
const LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY = 'currentR.A.D.A.R.SOSSignal';

interface PersistedSOSState {
  isActive: boolean;
  location: { lat: number; lon: number };
  victimNameForSignal: string; // The name part used in the SOS_Name_Lat_Lon string
  advertisedName: string; // The full SOS_Name_Lat_Lon string
  customSosMessage: string;
  activationTimestamp: number;
}

export function BluetoothSOSPanel() {
  const [status, setStatus] = useState<SOSStatus>("inactive");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFlashlightActive, setIsFlashlightActive] = useState(false);
  const [isBuzzerActive, setIsBuzzerActive] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(0);
  const rebroadcastIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const [currentVictimNameForSignal, setCurrentVictimNameForSignal] = useState<string>("Unknown");
  const [currentCustomMessage, setCurrentCustomMessage] = useState<string>("Emergency! I need help. My location is being broadcast.");


  const REBROADCAST_INTERVAL = 30; // seconds

  // Effect for initializing and cleaning up SOS state based on localStorage or URL params
  useEffect(() => {
    const storedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
    let resumedFromStorage = false;

    if (storedSOSStateRaw) {
      try {
        const persistedState = JSON.parse(storedSOSStateRaw) as PersistedSOSState;
        if (persistedState.isActive && persistedState.location) {
          setStatus("active");
          setLocation(persistedState.location);
          setCurrentVictimNameForSignal(persistedState.victimNameForSignal);
          setCurrentCustomMessage(persistedState.customSosMessage);
          setIsFlashlightActive(true);
          setIsBuzzerActive(true);
          
          broadcastSignal(persistedState.location, persistedState.victimNameForSignal, persistedState.customSosMessage, true); // isResuming = true
          startRebroadcastCountdown(persistedState.location, persistedState.victimNameForSignal, persistedState.customSosMessage);

          toast({ title: "SOS Resumed", description: "Your SOS signal has been resumed." });
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Resumed. Broadcasting (simulated) as ${persistedState.advertisedName}. Alerts enabled.` }));
          resumedFromStorage = true;
        } else {
           localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
           localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
        }
      } catch (e) {
        console.error("Failed to parse persisted SOS state:", e);
        localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
      }
    }
    
    // Only activate via URL if SOS was not resumed from storage and is currently inactive
    if (!resumedFromStorage && searchParams.get('sos') === 'true' && status === "inactive") {
      activateSOS();
    }

    return () => {
      if (rebroadcastIntervalIdRef.current) {
        clearInterval(rebroadcastIntervalIdRef.current);
      }
      // Do not remove localStorage items here on unmount, as we want them to persist.
      // They are cleared only on explicit deactivation.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Removed `status` to prevent loops with activateSOS triggered by URL

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
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // maximumAge 0 for fresh location
      );
    });
  };

  const broadcastSignal = (
    currentLocation: { lat: number; lon: number },
    victimName: string, // This is the already processed name (underscores, truncated)
    customMessage: string,
    isResuming: boolean = false
  ) => {
    const advertisedName = `SOS_${victimName}_${currentLocation.lat}_${currentLocation.lon}`;
    const fullMessageForLog = `${customMessage} Location: LAT ${currentLocation.lat}, LON ${currentLocation.lon}. Name: ${victimName.replace(/_/g, ' ')}.`;

    console.log(`SOS broadcast. Simulated device name: ${advertisedName}`);
    console.log("Full SOS Message (Simulated):", fullMessageForLog);
    
    if (!isResuming) { // Avoid duplicate logs/toasts if just resuming and immediately broadcasting
      const logDetail = `SOS Signal Broadcast: Simulated Name ${advertisedName}. Message: ${fullMessageForLog}`;
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: logDetail }));
      toast({
        title: "SOS Broadcasting",
        description: `Signal sent with (simulated): ${advertisedName}. Rebroadcasting periodically.`,
      });
    }
    
    const signalDataForSharedStorage: DetectedSignal = {
      id: 'local_sos_signal',
      advertisedName: advertisedName,
      name: victimName.replace(/_/g, ' '), // Store user-friendly name
      lat: currentLocation.lat,
      lon: currentLocation.lon,
      rssi: -50 - Math.floor(Math.random() * 10),
      timestamp: Date.now(),
      status: 'Active (Local)',
    };
    localStorage.setItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY, JSON.stringify(signalDataForSharedStorage));

    // Persist the full victim SOS state
    const victimSOSState: PersistedSOSState = {
      isActive: true,
      location: currentLocation,
      victimNameForSignal: victimName,
      advertisedName,
      customSosMessage: customMessage,
      activationTimestamp: isResuming 
          ? (JSON.parse(localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY) || '{}') as PersistedSOSState).activationTimestamp || Date.now() 
          : Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY, JSON.stringify(victimSOSState));
  };

  const startRebroadcastCountdown = (
    currentLocation: { lat: number; lon: number },
    victimName: string,
    customMessage: string
  ) => {
    setCountdown(REBROADCAST_INTERVAL);
    if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current); 
    
    rebroadcastIntervalIdRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Fetch fresh location for rebroadcast
          getDeviceLocation().then(newLoc => {
            setLocation(newLoc); // Update panel's location state
            broadcastSignal(newLoc, victimName, customMessage); 
          }).catch(err => {
            console.error("Error getting location for rebroadcast, using last known:", err);
            broadcastSignal(currentLocation, victimName, customMessage); // Use last known if fresh fails
          });
          return REBROADCAST_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
  };


  const activateSOS = async () => {
    setStatus("activating");
    setError(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    if (rebroadcastIntervalIdRef.current) {
        clearInterval(rebroadcastIntervalIdRef.current);
        rebroadcastIntervalIdRef.current = null;
    }

    try {
      const loc = await getDeviceLocation();
      setLocation(loc);
      
      const storedBasicInfo = localStorage.getItem('victimBasicInfo');
      let victimNameFromProfile = "Unknown";
      let customMessageFromProfile = "Emergency! I need help. My location is being broadcast.";

      if (storedBasicInfo) {
          try {
              const parsed = JSON.parse(storedBasicInfo) as VictimBasicInfo;
              if(parsed.name) victimNameFromProfile = parsed.name;
              if(parsed.customSOSMessage) customMessageFromProfile = parsed.customSOSMessage;
          } catch(e){ console.error("Could not parse victim info for SOS activation", e); }
      }
      const processedVictimName = victimNameFromProfile.replace(/\s+/g, '_').substring(0, 20);
      setCurrentVictimNameForSignal(processedVictimName); // Update state for display
      setCurrentCustomMessage(customMessageFromProfile);


      broadcastSignal(loc, processedVictimName, customMessageFromProfile); // Initial broadcast

      await new Promise(resolve => setTimeout(resolve, 500)); // Short delay for effect

      setIsFlashlightActive(true); 
      setIsBuzzerActive(true); 
      setStatus("active");
      startRebroadcastCountdown(loc, processedVictimName, customMessageFromProfile);

      const deviceNameForLog = `SOS_${processedVictimName}_${loc.lat}_${loc.lon}`;
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activated. Broadcasting (simulated) as ${deviceNameForLog}. Alerts enabled.` }));
      // Toast for initial activation is handled in broadcastSignal if !isResuming

    } catch (err: any) {
      setStatus("error");
      const errorMsg = err.message || "Failed to activate SOS.";
      setError(errorMsg);
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activation Failed: ${errorMsg}` }));
      toast({ title: "SOS Activation Failed", description: errorMsg, variant: "destructive" });
      // Clear any potentially partially saved state if activation fails critically
      localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
    }
  };

  const deactivateSOS = () => {
    setStatus("inactive");
    setError(null);
    setLocation(null); // Clear location from panel state
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current);
    rebroadcastIntervalIdRef.current = null;
    setCountdown(0);
    
    localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY); // Clear persisted victim SOS state
    localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY); // Clear shared signal for rescuer panel

    window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Deactivated. Alerts stopped. Local signal cleared." }));
    toast({ title: "SOS Deactivated", description: "SOS broadcast and alerts have been stopped." });
  };

  const getStatusContent = () => {
    switch (status) {
      case "inactive":
        return { icon: <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: "SOS is OFF.", color: "text-muted-foreground" };
      case "activating":
        return { icon: <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />, text: "Activating SOS...", color: "text-primary" };
      case "active":
         if (location) {
            const deviceName = `SOS_${currentVictimNameForSignal}_${location.lat}_${location.lon}`;
            return { icon: <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />, text: `SOS Active! Broadcasting locally as: ${deviceName}`, color: "text-green-500" };
         }
         return { icon: <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />, text: `SOS Active! Broadcasting locally... Initializing location...`, color: "text-green-500" };

      case "error":
        return { icon: <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: `Error: ${error}`, color: "text-destructive" };
      case "unsupported": 
        return { icon: <Bluetooth className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />, text: "SOS feature unavailable (e.g. no geolocation).", color: "text-destructive" };
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
          Broadcast your location (locally on this device) and activate alerts. SOS will remain active until manually stopped.
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
              Rebroadcasting signal (locally) in: <span className="font-semibold text-primary">{countdown}s</span>
            </p>
             <p className="text-xs text-muted-foreground mt-2">
            The Rescuer panel on this device can detect this signal.
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
