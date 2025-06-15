
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Bluetooth, XCircle, Loader2, Zap, Volume2, ShieldAlert } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { VictimBasicInfo, DetectedSignal, MassAlert, PersistedSOSState as PersistedSOSStateImport } from '@/types/signals'; 
import { calculateDistance } from '@/lib/utils'; 

type SOSStatus = "inactive" | "activating" | "active" | "error" | "unsupported";
type ActivationSource = "manual" | "central" | null;

const LOCAL_STORAGE_VICTIM_SOS_STATE_KEY = 'persistedR.A.D.A.R.SOSState'; 
const LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY = 'currentR.A.D.A.R.SOSSignal';
const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions';

const REBROADCAST_INTERVAL = 30; 
const MASS_ALERT_CHECK_INTERVAL = 10000; 

type PersistedSOSState = PersistedSOSStateImport;


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
    sosStateToBroadcast: PersistedSOSState,
    isResumingOrUpdating: boolean = false
  ) => {
    const { advertisedName, victimNameForSignal, location: sosLocation, customSosMessage: sosCustomMessage, activationSource: sosActivationSource } = sosStateToBroadcast;
    const victimNameDisplay = victimNameForSignal.replace(/_/g, ' ');

    if (!isResumingOrUpdating) {
      const logDetail = `SOS Signal Broadcast: Name ${advertisedName}. Message: ${sosCustomMessage} Location: LAT ${sosLocation.lat}, LON ${sosLocation.lon}. Name: ${victimNameDisplay}. Source: ${sosActivationSource || 'manual'}.`;
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: logDetail }));
      toast({
        title: sosActivationSource === 'central' ? "Centrally Activated SOS" : "SOS Broadcasting",
        description: `Signal sent as: ${advertisedName}. Rebroadcasting. Msg: ${sosCustomMessage}`,
      });
    }
    
    const signalDataForSharedStorage: DetectedSignal = {
      id: 'local_sos_signal',
      advertisedName: advertisedName,
      name: victimNameDisplay,
      lat: sosLocation.lat,
      lon: sosLocation.lon,
      rssi: -50 - Math.floor(Math.random() * 10),
      timestamp: Date.now(),
      status: 'Active (Local)',
    };
    localStorage.setItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY, JSON.stringify(signalDataForSharedStorage));
    localStorage.setItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY, JSON.stringify(sosStateToBroadcast));
  }, [toast]);

  const startRebroadcastCountdown = useCallback((
    currentLocationToUse: { lat: number; lon: number },
    victimNameToUse: string,
    customMessageToUse: string,
    sourceToUse: ActivationSource
  ) => {
    setCountdown(REBROADCAST_INTERVAL);
    if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current); 
    
    rebroadcastIntervalIdRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          getDeviceLocation().then(newLoc => {
            setLocation(newLoc); 
            const updatedSosState: PersistedSOSState = {
                isActive: true, location: newLoc, victimNameForSignal: victimNameToUse, 
                advertisedName: `SOS_${victimNameToUse}_${newLoc.lat}_${newLoc.lon}`, 
                customSosMessage: customMessageToUse, activationTimestamp: Date.now(), activationSource: sourceToUse
            };
            broadcastSignal(updatedSosState, true); 
          }).catch(err => {
            console.error("Error getting location for rebroadcast, using last known:", err);
            const lastKnownLocation = location || currentLocationToUse;
            const updatedSosState: PersistedSOSState = {
                isActive: true, location: lastKnownLocation, victimNameForSignal: victimNameToUse, 
                advertisedName: `SOS_${victimNameToUse}_${lastKnownLocation.lat}_${lastKnownLocation.lon}`, 
                customSosMessage: customMessageToUse, activationTimestamp: Date.now(), activationSource: sourceToUse
            };
            broadcastSignal(updatedSosState, true); 
          });
          return REBROADCAST_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
  }, [broadcastSignal, getDeviceLocation, location]);


  const activateSOS = useCallback(async (
    initialSourceParam: ActivationSource = "manual", 
    initialCentralAlertMsgParam?: string,
    resumePersistedState?: PersistedSOSState
  ) => {
    if ((status === "active" || status === "activating") && !resumePersistedState) {
        // If already active and this is not a sync/resume call, do nothing.
        // If it IS a sync/resume, we might need to update message/source, so proceed.
        if (resumePersistedState && 
            (activationSource !== resumePersistedState.activationSource || currentCustomMessage !== resumePersistedState.customSosMessage)) {
            // Proceed to update if source or message differs
        } else if (resumePersistedState) {
             // If resuming but no change in critical data, ensure countdown is running and exit.
             if(location && currentVictimNameForSignal && currentCustomMessage && activationSource){
                 startRebroadcastCountdown(location, currentVictimNameForSignal, currentCustomMessage, activationSource);
             }
             return; 
        } else {
            return; // Standard re-activation attempt, already active.
        }
    }

    setStatus("activating");
    setError(null);
    // Only reset these if not resuming, or if resume state indicates they should be off (which it won't)
    if (!resumePersistedState) {
        setIsFlashlightActive(false);
        setIsBuzzerActive(false);
    }


    const effectiveSource = resumePersistedState ? resumePersistedState.activationSource : initialSourceParam;
    

    let locToUse: { lat: number; lon: number };
    let victimNameToUse: string;
    let sosMessageToUse: string;
    let activationTimestampToUse: number;

    if (rebroadcastIntervalIdRef.current) {
        clearInterval(rebroadcastIntervalIdRef.current);
        rebroadcastIntervalIdRef.current = null;
    }

    try {
      if (resumePersistedState && resumePersistedState.location) {
        locToUse = resumePersistedState.location;
        victimNameToUse = resumePersistedState.victimNameForSignal;
        sosMessageToUse = resumePersistedState.customSosMessage;
        activationTimestampToUse = resumePersistedState.activationTimestamp || Date.now();
        
        setLocation(locToUse); // Update panel state
        setIsFlashlightActive(true); // Assume these should be on if resuming active state
        setIsBuzzerActive(true);

      } else {
        locToUse = await getDeviceLocation();
        setLocation(locToUse);
        
        const storedBasicInfo = localStorage.getItem('victimBasicInfo');
        let victimNameFromProfile = "Unknown";
        let customMessageFromProfile = "Emergency! I need help. My location is being broadcast.";

        if (storedBasicInfo) {
            try {
                const parsed = JSON.parse(storedBasicInfo) as VictimBasicInfo;
                if(parsed.name) victimNameFromProfile = parsed.name;
                if(parsed.customSOSMessage && effectiveSource === 'manual') customMessageFromProfile = parsed.customSOSMessage; 
            } catch(e){ console.error("Could not parse victim info for SOS activation", e); }
        }
        
        victimNameToUse = victimNameFromProfile.replace(/\s+/g, '_').substring(0, 20);
        sosMessageToUse = effectiveSource === 'central' 
            ? (initialCentralAlertMsgParam || "Emergency! Centrally activated.")
            : customMessageFromProfile;
        activationTimestampToUse = Date.now();
        setIsFlashlightActive(true); 
        setIsBuzzerActive(true); 
      }
      
      // Update all relevant panel states
      setActivationSource(effectiveSource);
      setCurrentVictimNameForSignal(victimNameToUse);
      setCurrentCustomMessage(sosMessageToUse);
      setActiveCentralAlertMessage(effectiveSource === 'central' ? sosMessageToUse : null);

      const currentPersistedState: PersistedSOSState = {
        isActive: true, location: locToUse, victimNameForSignal: victimNameToUse, 
        advertisedName: `SOS_${victimNameToUse}_${locToUse.lat}_${locToUse.lon}`, 
        customSosMessage: sosMessageToUse, activationTimestamp: activationTimestampToUse, activationSource: effectiveSource,
      };
      
      broadcastSignal(currentPersistedState, !!resumePersistedState); 

      await new Promise(resolve => setTimeout(resolve, 100)); // Shorter buffer

      setStatus("active");
      startRebroadcastCountdown(locToUse, victimNameToUse, sosMessageToUse, effectiveSource);

      if (!resumePersistedState) {
        const deviceNameForLog = `SOS_${victimNameToUse}_${locToUse.lat}_${locToUse.lon}`;
        window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activated (${effectiveSource}). Broadcasting as ${deviceNameForLog}. Alerts enabled. Msg: "${sosMessageToUse}"` }));
      } else {
        // If resuming, a different toast/log might be appropriate to indicate sync
        const isUpdate = status === "active"; // If panel was already active, it's an update
        if (isUpdate) {
            toast({ title: "SOS Synced & Updated", description: `Source: ${effectiveSource}. Msg: "${sosMessageToUse}"` });
            window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Synced & Updated Externally. Source: ${effectiveSource}. Msg: "${sosMessageToUse}"` }));
        } else {
            toast({ title: "SOS Resumed/Activated", description: `Source: ${effectiveSource}. Msg: "${sosMessageToUse}"` });
            window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Resumed/Activated Externally. Source: ${effectiveSource}. Msg: "${sosMessageToUse}"` }));
        }
      }

    } catch (err: any) {
      setStatus("error");
      const errorMsg = err.message || "Failed to activate SOS.";
      setError(errorMsg);
      setActivationSource(null); 
      setActiveCentralAlertMessage(null);
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activation Failed (${effectiveSource}): ${errorMsg}` }));
      toast({ title: "SOS Activation Failed", description: errorMsg, variant: "destructive" });
      localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
    }
  }, [status, getDeviceLocation, broadcastSignal, startRebroadcastCountdown, toast, location, activationSource, currentCustomMessage, currentVictimNameForSignal]);
  
  const deactivateSOS = useCallback(() => {
    setStatus("inactive");
    setError(null);
    setLocation(null);
    setIsFlashlightActive(false);
    setIsBuzzerActive(false);
    if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current);
    rebroadcastIntervalIdRef.current = null;
    setCountdown(0);
    setActivationSource(null); 
    setActiveCentralAlertMessage(null);
    
    localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY); 
    localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY); 

    window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Deactivated. Alerts stopped. Local signal cleared." }));
    toast({ title: "SOS Deactivated", description: "SOS broadcast and alerts have been stopped." });
  }, [toast]);

  const checkMassAlerts = useCallback(async () => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      const currentLocForAlertCheck = location || await getDeviceLocation(); 
      
      let deviceInAlertZone = false;
      let triggeringAlert: MassAlert | null = null;

      if (storedAlertsRaw) {
        const massAlerts = JSON.parse(storedAlertsRaw) as MassAlert[];
        for (const alert of massAlerts) {
          const distance = calculateDistance(currentLocForAlertCheck.lat, currentLocForAlertCheck.lon, alert.lat, alert.lon);
          if (distance <= alert.radius) {
            deviceInAlertZone = true;
            triggeringAlert = alert;
            break; 
          }
        }
      }

      if (deviceInAlertZone && triggeringAlert) {
        if (status === "inactive" || status === "error") {
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Device in active mass alert zone. Forcing SOS activation. Alert Msg: ${triggeringAlert.message || 'Standard emergency.'}` }));
          activateSOS("central", triggeringAlert.message || undefined);
        } else if (status === "active" && activationSource !== "central") {
           // Already active, but now also under a central alert. Update source and message.
           const alertMessage = triggeringAlert.message || "Centrally activated by rescuer.";
           const persistedStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
           if (persistedStateRaw) {
               const persistedState = JSON.parse(persistedStateRaw) as PersistedSOSState;
               const updatedState: PersistedSOSState = {
                   ...persistedState,
                   activationSource: "central",
                   customSosMessage: alertMessage,
               };
               // Call activateSOS to sync this updated state
               activateSOS("central", alertMessage, updatedState);
           }
           window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS (manual) now also under central alert. Source and message updated. Alert Msg: "${alertMessage}"` }));
        }
      } else { 
        if (activationSource === 'central' && status === 'active') {
           // Was centrally activated, but no longer in any alert zone. Switch to manual.
           const persistedStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
           if (persistedStateRaw) {
               const persistedState = JSON.parse(persistedStateRaw) as PersistedSOSState;
               let originalCustomMsg = "Emergency! I need help. My location is being broadcast.";
               const basicInfoRaw = localStorage.getItem('victimBasicInfo');
               if(basicInfoRaw) { try { originalCustomMsg = (JSON.parse(basicInfoRaw) as VictimBasicInfo).customSosMessage || originalCustomMsg; } catch(e){} }
               
               const updatedState: PersistedSOSState = {
                   ...persistedState,
                   activationSource: "manual",
                   customSosMessage: originalCustomMsg,
               };
               activateSOS("manual", undefined, updatedState);
           }
           window.dispatchEvent(new CustomEvent('newAppLog', { detail: "Exited mass alert zone. SOS remains active (switched to manual)." }));
           toast({ title: "Exited Area Alert Zone", description: "SOS remains active (manual). Deactivate manually if safe.", variant:"default"});
        }
      }
    } catch (err) {
      console.error("Error checking mass alerts:", err);
       if (status === "inactive" && location === null && (err as Error).message.includes("Geolocation")) {
        // This error is expected if location is not yet available during initial checkMassAlerts
       } else {
        window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Error during mass alert check: ${(err as Error).message}` }));
       }
    }
  }, [status, activationSource, activateSOS, getDeviceLocation, toast, location]);


  useEffect(() => {
    const storedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
    let resumedFromStorage = false;

    if (storedSOSStateRaw) {
      try {
        const persistedState = JSON.parse(storedSOSStateRaw) as PersistedSOSState;
        if (persistedState.isActive && persistedState.location) {
          activateSOS(persistedState.activationSource, persistedState.customSosMessage, persistedState);
          resumedFromStorage = true;
        } else {
           localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
           localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
        }
      } catch (e) {
        console.error("Failed to parse persisted SOS state on mount:", e);
        localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
      }
    }
    
    if (!resumedFromStorage && searchParams.get('sos') === 'true' && status === "inactive") {
      activateSOS("manual");
    }

    checkMassAlerts(); 
    massAlertCheckIntervalIdRef.current = setInterval(checkMassAlerts, MASS_ALERT_CHECK_INTERVAL);
    
    const handleMassAlertsUpdatedEvent = () => { checkMassAlerts(); };
    window.addEventListener('massAlertsUpdated', handleMassAlertsUpdatedEvent);

    return () => {
      if (rebroadcastIntervalIdRef.current) clearInterval(rebroadcastIntervalIdRef.current);
      if (massAlertCheckIntervalIdRef.current) clearInterval(massAlertCheckIntervalIdRef.current);
      window.removeEventListener('massAlertsUpdated', handleMassAlertsUpdatedEvent);
    };
  }, [searchParams, activateSOS, checkMassAlerts]); // Removed status from deps to avoid re-running this entire effect on status change


  useEffect(() => {
    const handleExternalSOSChange = () => {
      const storedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      if (storedSOSStateRaw) {
        try {
          const persistedState = JSON.parse(storedSOSStateRaw) as PersistedSOSState;
          if (persistedState.isActive) {
            // Call activateSOS to sync/resume. It has internal guards.
            activateSOS(persistedState.activationSource, persistedState.customSosMessage, persistedState);
          } else if (status === "active" && !persistedState.isActive) {
            deactivateSOS(); 
            toast({ title: "SOS Deactivated Externally", description: `SOS was stopped by an external action.` });
            window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Deactivated Externally.` }));
          }
        } catch (e) { 
          console.error("Error processing external SOS change:", e);
          toast({ title: "SOS Sync Error", description: "Could not process external SOS state change.", variant: "destructive" });
        }
      } else if (status === "active") {
         deactivateSOS();
         toast({ title: "SOS Cleared Externally", description: `SOS state was cleared externally.` });
         window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Cleared Externally.` }));
      }
    };

    window.addEventListener('localSOSStateChangedByExternal', handleExternalSOSChange);
    return () => {
      window.removeEventListener('localSOSStateChangedByExternal', handleExternalSOSChange);
    };
  }, [status, activateSOS, deactivateSOS, toast]);


  const getStatusContent = () => {
    let baseText = "";
    let iconToShow = <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />;
    let colorClass = "text-muted-foreground";
    let subTextToDisplay: string | null = null;

    switch (status) {
      case "inactive":
        baseText = "SOS is OFF.";
        break;
      case "activating":
        iconToShow = <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" />;
        baseText = activationSource === 'central' ? "Centrally Activating SOS..." : "Activating SOS...";
        colorClass = "text-primary";
        if (activeCentralAlertMessage) subTextToDisplay = activeCentralAlertMessage;
        break;
      case "active":
        iconToShow = <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />;
        colorClass = "text-green-500";
        const sourceText = activationSource === 'central' ? "(Centrally Activated)" : "(Manually Activated)";
        if (location) {
          const deviceName = `SOS_${currentVictimNameForSignal}_${location.lat}_${location.lon}`;
          baseText = `SOS Active! ${sourceText} Broadcasting as: ${deviceName}`;
        } else {
          baseText = `SOS Active! ${sourceText} Broadcasting... Initializing location...`;
        }
        if (activationSource === 'central' && activeCentralAlertMessage) {
            subTextToDisplay = activeCentralAlertMessage;
        } else if (activationSource === 'manual' && currentCustomMessage && currentCustomMessage !== "Emergency! I need help. My location is being broadcast.") {
            subTextToDisplay = `Custom Message: "${currentCustomMessage}"`;
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
    return { icon: iconToShow, text: baseText, color: colorClass, subText: subTextToDisplay };
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
            <p className="text-sm text-muted-foreground px-2 flex items-center justify-center gap-1.5 text-center">
                {activationSource === 'central' ? <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" /> : null} 
                <span className="max-w-xs sm:max-w-sm break-words">{subText}</span>
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

