
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Bluetooth, XCircle, Loader2, Zap, Volume2, ShieldAlert } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { VictimBasicInfo, DetectedSignal, MassAlert } from '@/types/signals';
import { calculateDistance } from '@/lib/utils'; // Import calculateDistance

type SOSStatus = "inactive" | "activating" | "active" | "error" | "unsupported";
type ActivationSource = "manual" | "central" | null;

const LOCAL_STORAGE_VICTIM_SOS_STATE_KEY = 'persistedR.A.D.A.R.SOSState'; 
const LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY = 'currentR.A.D.A.R.SOSSignal';
const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions';

const REBROADCAST_INTERVAL = 30; // seconds
const MASS_ALERT_CHECK_INTERVAL = 10000; // 10 seconds

interface PersistedSOSState {
  isActive: boolean;
  location: { lat: number; lon: number };
  victimNameForSignal: string; 
  advertisedName: string; 
  customSosMessage: string;
  activationTimestamp: number;
  activationSource: ActivationSource;
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
  const massAlertCheckIntervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const [currentVictimNameForSignal, setCurrentVictimNameForSignal] = useState<string>("Unknown");
  const [currentCustomMessage, setCurrentCustomMessage] = useState<string>("Emergency! I need help. My location is being broadcast.");
  const [activationSource, setActivationSource] = useState<ActivationSource>(null);
  const [activeCentralAlertMessage, setActiveCentralAlertMessage] = useState<string | null>(null);


  const getDeviceLocation = useCallback((): Promise<{ lat: number; lon: number }> => {
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const broadcastSignal = useCallback((
    currentLocation: { lat: number; lon: number },
    victimName: string,
    customMessage: string,
    source: ActivationSource,
    isResuming: boolean = false
  ) => {
    const advertisedName = `SOS_${victimName}_${currentLocation.lat}_${currentLocation.lon}`;
    const fullMessageForLog = `${customMessage} Location: LAT ${currentLocation.lat}, LON ${currentLocation.lon}. Name: ${victimName.replace(/_/g, ' ')}. Source: ${source || 'manual'}.`;

    if (!isResuming) {
      const logDetail = `SOS Signal Broadcast: Name ${advertisedName}. Message: ${fullMessageForLog}`;
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: logDetail }));
      toast({
        title: source === 'central' ? "Centrally Activated SOS" : "SOS Broadcasting",
        description: `Signal sent as: ${advertisedName}. Rebroadcasting periodically.`,
      });
    }
    
    const signalDataForSharedStorage: DetectedSignal = {
      id: 'local_sos_signal',
      advertisedName: advertisedName,
      name: victimName.replace(/_/g, ' '),
      lat: currentLocation.lat,
      lon: currentLocation.lon,
      rssi: -50 - Math.floor(Math.random() * 10),
      timestamp: Date.now(),
      status: 'Active (Local)',
    };
    localStorage.setItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY, JSON.stringify(signalDataForSharedStorage));

    const victimSOSState: PersistedSOSState = {
      isActive: true,
      location: currentLocation,
      victimNameForSignal: victimName,
      advertisedName,
      customSosMessage: customMessage,
      activationTimestamp: isResuming 
          ? (JSON.parse(localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY) || '{}') as PersistedSOSState).activationTimestamp || Date.now() 
          : Date.now(),
      activationSource: source,
    };
    localStorage.setItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY, JSON.stringify(victimSOSState));
  }, [toast]);

  const startRebroadcastCountdown = useCallback((
    currentLocation: { lat: number; lon: number },
    victimName: string,
    customMessage: string,
    source: ActivationSource
  ) => {
    setCountdown(REBROADCAST_INTERVAL);
    if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current); 
    
    rebroadcastIntervalIdRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          getDeviceLocation().then(newLoc => {
            setLocation(newLoc); 
            broadcastSignal(newLoc, victimName, customMessage, source); 
          }).catch(err => {
            console.error("Error getting location for rebroadcast, using last known:", err);
            const lastKnownLocation = location || currentLocation;
            broadcastSignal(lastKnownLocation, victimName, customMessage, source); 
          });
          return REBROADCAST_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
  }, [broadcastSignal, getDeviceLocation, location]);

  const activateSOS = useCallback(async (source: ActivationSource = "manual", centralAlertMsg?: string) => {
    if (status === "active" || status === "activating") return; // Prevent re-activation if already active/activating

    setStatus("activating");
    setError(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    setActivationSource(source);
    setActiveCentralAlertMessage(source === 'central' ? centralAlertMsg || "Centrally activated by rescuer." : null);

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
      setCurrentVictimNameForSignal(processedVictimName);
      setCurrentCustomMessage(customMessageFromProfile);

      broadcastSignal(loc, processedVictimName, customMessageFromProfile, source); 

      await new Promise(resolve => setTimeout(resolve, 500));

      setIsFlashlightActive(true); 
      setIsBuzzerActive(true); 
      setStatus("active");
      startRebroadcastCountdown(loc, processedVictimName, customMessageFromProfile, source);

      const deviceNameForLog = `SOS_${processedVictimName}_${loc.lat}_${loc.lon}`;
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activated (${source}). Broadcasting as ${deviceNameForLog}. Alerts enabled.` }));

    } catch (err: any) {
      setStatus("error");
      const errorMsg = err.message || "Failed to activate SOS.";
      setError(errorMsg);
      setActivationSource(null); // Reset source on error
      setActiveCentralAlertMessage(null);
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activation Failed (${source}): ${errorMsg}` }));
      toast({ title: "SOS Activation Failed", description: errorMsg, variant: "destructive" });
      localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
    }
  }, [status, getDeviceLocation, broadcastSignal, startRebroadcastCountdown, toast]);
  
  const deactivateSOS = useCallback(() => {
    setStatus("inactive");
    setError(null);
    setLocation(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current);
    rebroadcastIntervalIdRef.current = null;
    setCountdown(0);
    setActivationSource(null); // Clear activation source
    setActiveCentralAlertMessage(null);
    
    localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY); 
    localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY); 

    window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Deactivated. Alerts stopped. Local signal cleared." }));
    toast({ title: "SOS Deactivated", description: "SOS broadcast and alerts have been stopped." });
  }, [toast]);

  const checkMassAlerts = useCallback(async () => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      if (!storedAlertsRaw) {
        if (activationSource === 'central' && status === 'active') {
          // If was centrally active but alerts are now gone, keep SOS active but remove central flag.
          // User must manually deactivate. This assumes central alerts list is the source of truth.
          setActivationSource('manual'); // Reverts to manual, or could be 'manual_after_central'
          setActiveCentralAlertMessage(null);
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: "Area alert cleared. SOS remains active, switch to manual." }));
          toast({ title: "Area Alert Cleared", description: "SOS remains active. Deactivate manually if safe.", variant:"default"});
        }
        return;
      }
      const massAlerts = JSON.parse(storedAlertsRaw) as MassAlert[];
      if (massAlerts.length === 0 && activationSource === 'central' && status === 'active') {
         setActivationSource('manual'); 
         setActiveCentralAlertMessage(null);
         window.dispatchEvent(new CustomEvent('newAppLog', { detail: "Area alert list empty. SOS remains active, switch to manual." }));
         toast({ title: "Area Alert Cleared", description: "SOS remains active. Deactivate manually if safe.", variant:"default"});
         return;
      }

      const currentLoc = await getDeviceLocation(); // Get fresh location for check
      
      let deviceInAlertZone = false;
      let triggeringAlertMessage: string | undefined = undefined;

      for (const alert of massAlerts) {
        const distance = calculateDistance(currentLoc.lat, currentLoc.lon, alert.lat, alert.lon);
        if (distance <= alert.radius) {
          deviceInAlertZone = true;
          triggeringAlertMessage = alert.message;
          break; 
        }
      }

      if (deviceInAlertZone) {
        if (status === "inactive" || status === "error") {
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Device in active mass alert zone. Forcing SOS activation. Message: ${triggeringAlertMessage || 'Standard emergency.'}` }));
          activateSOS("central", triggeringAlertMessage);
        } else if (status === "active" && activationSource !== "central") {
          // If already active manually, but now also in a central alert zone, update source.
          setActivationSource("central");
          setActiveCentralAlertMessage(triggeringAlertMessage || "Centrally activated by rescuer.");
          // Potentially re-broadcast with central flag, or just update persisted state
           const victimSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
           if(victimSOSStateRaw) {
             const victimSOSState = JSON.parse(victimSOSStateRaw) as PersistedSOSState;
             victimSOSState.activationSource = "central";
             localStorage.setItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY, JSON.stringify(victimSOSState));
           }
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS (manual) now also under central alert. Source updated.` }));
        }
      } else { // Device is NOT in any active alert zone
        if (activationSource === 'central' && status === 'active') {
          // Was centrally activated, but no longer in an active zone
          setActivationSource('manual'); // Revert to manual, SOS stays on
          setActiveCentralAlertMessage(null);
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: "Exited mass alert zone. SOS remains active (manual)." }));
          toast({ title: "Exited Area Alert Zone", description: "SOS remains active. Deactivate manually if safe.", variant:"default"});
        }
      }
    } catch (err) {
      console.error("Error checking mass alerts:", err);
      // Don't change SOS state based on an error here, could be transient (e.g. localStorage parse error)
    }
  }, [status, activationSource, activateSOS, getDeviceLocation, toast]);


  // Effect for initializing and cleaning up SOS state
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
          setActivationSource(persistedState.activationSource);
          setActiveCentralAlertMessage(persistedState.activationSource === 'central' ? (persistedState.message || "Centrally activated by rescuer.") : null);
          setIsFlashlightActive(true);
          setIsBuzzerActive(true);
          
          broadcastSignal(persistedState.location, persistedState.victimNameForSignal, persistedState.customSosMessage, persistedState.activationSource, true);
          startRebroadcastCountdown(persistedState.location, persistedState.victimNameForSignal, persistedState.customSosMessage, persistedState.activationSource);

          toast({ title: "SOS Resumed", description: `Your SOS signal (${persistedState.activationSource || 'manual'}) has been resumed.` });
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Resumed (${persistedState.activationSource || 'manual'}). Broadcasting as ${persistedState.advertisedName}. Alerts enabled.` }));
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
    
    if (!resumedFromStorage && searchParams.get('sos') === 'true' && status === "inactive") {
      activateSOS("manual");
    }

    // Start checking for mass alerts
    checkMassAlerts(); // Initial check
    massAlertCheckIntervalIdRef.current = setInterval(checkMassAlerts, MASS_ALERT_CHECK_INTERVAL);

    return () => {
      if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current);
      if (massAlertCheckIntervalIdRef.current) clearInterval(massAlertCheckIntervalIdRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Dependencies: searchParams. `status` removed from deps of outer useEffect.
                      // activateSOS, broadcastSignal, startRebroadcastCountdown, checkMassAlerts are memoized with useCallback.


  const getStatusContent = () => {
    let baseText = "";
    let iconToShow = <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />;
    let colorClass = "text-muted-foreground";
    let subText: string | null = null;

    switch (status) {
      case "inactive":
        baseText = "SOS is OFF.";
        break;
      case "activating":
        iconToShow = <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />;
        baseText = activationSource === 'central' ? "Centrally Activating SOS..." : "Activating SOS...";
        colorClass = "text-primary";
        if (activeCentralAlertMessage) subText = activeCentralAlertMessage;
        break;
      case "active":
        iconToShow = <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />;
        colorClass = "text-green-500";
        const sourceText = activationSource === 'central' ? "(Centrally Activated)" : "";
        if (location) {
          const deviceName = `SOS_${currentVictimNameForSignal}_${location.lat}_${location.lon}`;
          baseText = `SOS Active! ${sourceText} Broadcasting as: ${deviceName}`;
        } else {
          baseText = `SOS Active! ${sourceText} Broadcasting... Initializing location...`;
        }
        if (activationSource === 'central' && activeCentralAlertMessage) {
            subText = activeCentralAlertMessage;
        }
        break;
      case "error":
        iconToShow = <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />;
        baseText = `Error: ${error}`;
        colorClass = "text-destructive";
        break;
      case "unsupported": 
        iconToShow = <Bluetooth className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />;
        baseText = "SOS feature unavailable (e.g. no geolocation).";
        colorClass = "text-destructive";
        break;
      default:
        baseText = "SOS is OFF.";
    }
    return { icon: iconToShow, text: baseText, color: colorClass, subText };
  };

  const { icon, text, color, subText } = getStatusContent();

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-xl sm:text-2xl text-center">SOS Alert Box</CardTitle>
        <CardDescription className="text-center text-xs sm:text-sm">
          Broadcast your location locally and activate alerts. SOS will remain active until manually stopped, or if centrally managed by rescuers.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-3 py-4 sm:py-6">
        <div className={`flex justify-center items-center`}>
          {icon}
        </div>
        <p className={`text-base sm:text-lg font-semibold ${color} px-2`}>{text}</p>
        {subText && (
            <p className="text-sm text-muted-foreground px-2 flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-orange-500" /> {subText}
            </p>
        )}
        
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
          <Button onClick={() => activateSOS("manual")} size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/80 text-accent-foreground text-sm sm:text-base py-3 h-14">
            <AlertTriangle className="mr-2 h-5 w-5" /> ACTIVATE SOS MANUALLY
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
