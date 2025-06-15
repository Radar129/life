
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

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const locationRef = useRef(location);
    useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const currentVictimNameForSignalRef = useRef(currentVictimNameForSignal);
  useEffect(() => {
    currentVictimNameForSignalRef.current = currentVictimNameForSignal;
  }, [currentVictimNameForSignal]);

  const currentCustomMessageRef = useRef(currentCustomMessage);
  useEffect(() => {
    currentCustomMessageRef.current = currentCustomMessage;
  }, [currentCustomMessage]);

  const activationSourceRef = useRef(activationSource);
  useEffect(() => {
    activationSourceRef.current = activationSource;
  }, [activationSource]);


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
    sosStateToBroadcast: PersistedSOSState
  ) => {
    const { advertisedName, victimNameForSignal, location: sosLocation } = sosStateToBroadcast;
    const victimNameDisplay = victimNameForSignal.replace(/_/g, ' ');

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
  }, []);

  const startRebroadcastCountdown = useCallback((
    currentLocationToUse: { lat: number; lon: number },
    victimNameToUse: string,
    customMessageToUse: string,
    sourceToUse: ActivationSource,
    triggeringAlertIdFromState?: string
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
                customSosMessage: customMessageToUse, activationTimestamp: Date.now(), activationSource: sourceToUse,
                triggeringCentralAlertId: sourceToUse === 'central' ? triggeringAlertIdFromState : undefined,
            };
            broadcastSignal(updatedSosState);
          }).catch(err => {
            console.error("Error getting location for rebroadcast, using last known:", err);
            const lastKnownLocation = locationRef.current || currentLocationToUse;
            const updatedSosState: PersistedSOSState = {
                isActive: true, location: lastKnownLocation, victimNameForSignal: victimNameToUse,
                advertisedName: `SOS_${victimNameToUse}_${lastKnownLocation.lat}_${lastKnownLocation.lon}`,
                customSosMessage: customMessageToUse, activationTimestamp: Date.now(), activationSource: sourceToUse,
                triggeringCentralAlertId: sourceToUse === 'central' ? triggeringAlertIdFromState : undefined,
            };
            broadcastSignal(updatedSosState);
          });
          return REBROADCAST_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
  }, [broadcastSignal, getDeviceLocation]);

  const deactivateSOS = useCallback(() => {
    const wasActive = statusRef.current === "active";

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

    if (wasActive) {
      setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Deactivated. Alerts stopped. Local signal cleared." })), 0);
      toast({ title: "SOS Deactivated", description: "SOS broadcast and alerts have been stopped." });
    }
  }, [toast]);


  const activateSOS = useCallback(async (
    initialSourceParam: ActivationSource = "manual",
    initialCentralAlertMsgParam?: string,
    resumePersistedState?: PersistedSOSState,
    triggeringAlertId?: string
  ) => {

    const panelWasActuallyInactive = statusRef.current === 'inactive';
    let detailsChangedDuringSync = false;

    if (resumePersistedState) {
        const persistedStateInStorage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY) || '{}') as PersistedSOSState;
        const currentTriggeringIdFromStorage = persistedStateInStorage?.triggeringCentralAlertId;


        const alreadyInTargetState =
            statusRef.current === 'active' &&
            locationRef.current?.lat.toFixed(4) === resumePersistedState.location.lat.toFixed(4) &&
            locationRef.current?.lon.toFixed(4) === resumePersistedState.location.lon.toFixed(4) &&
            currentVictimNameForSignalRef.current === resumePersistedState.victimNameForSignal &&
            currentCustomMessageRef.current === resumePersistedState.customSosMessage &&
            activationSourceRef.current === resumePersistedState.activationSource &&
            (resumePersistedState.activationSource !== 'central' || currentTriggeringIdFromStorage === resumePersistedState.triggeringCentralAlertId);

        if (alreadyInTargetState) {
            if (rebroadcastIntervalIdRef.current === null && locationRef.current && currentVictimNameForSignalRef.current && currentCustomMessageRef.current && activationSourceRef.current) {
                 startRebroadcastCountdown(locationRef.current, currentVictimNameForSignalRef.current, currentCustomMessageRef.current, activationSourceRef.current, resumePersistedState.triggeringCentralAlertId);
            }
            return;
        }
        if (statusRef.current === 'active' || statusRef.current === 'activating') { // Panel was already active or activating
             detailsChangedDuringSync = currentVictimNameForSignalRef.current !== resumePersistedState.victimNameForSignal ||
                                       currentCustomMessageRef.current !== resumePersistedState.customSosMessage ||
                                       activationSourceRef.current !== resumePersistedState.activationSource ||
                                       (resumePersistedState.activationSource === 'central' && currentTriggeringIdFromStorage !== resumePersistedState.triggeringCentralAlertId);
        }
    } else { // This is for non-resume (manual/URL activation)
      if (statusRef.current === "active" || statusRef.current === "activating") {
        return;
      }
    }

    setStatus("activating"); // Visual feedback that something is happening
    setError(null);
    if (!resumePersistedState) { // Only reset these for fresh activations
        setIsFlashlightActive(false);
        setIsBuzzerActive(false);
    }

    const effectiveSource = resumePersistedState ? resumePersistedState.activationSource : initialSourceParam;
    const effectiveTriggeringAlertId = resumePersistedState ? resumePersistedState.triggeringCentralAlertId : (effectiveSource === 'central' ? triggeringAlertId : undefined);

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

        setLocation(locToUse);
        if (panelWasActuallyInactive || detailsChangedDuringSync) {
            setIsFlashlightActive(true);
            setIsBuzzerActive(true);
        }
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

      setActivationSource(effectiveSource);
      setCurrentVictimNameForSignal(victimNameToUse);
      setCurrentCustomMessage(sosMessageToUse);
      setActiveCentralAlertMessage(effectiveSource === 'central' ? sosMessageToUse : null);

      const currentPersistedState: PersistedSOSState = {
        isActive: true, location: locToUse, victimNameForSignal: victimNameToUse,
        advertisedName: `SOS_${victimNameToUse}_${locToUse.lat}_${locToUse.lon}`,
        customSosMessage: sosMessageToUse, activationTimestamp: activationTimestampToUse, activationSource: effectiveSource,
        triggeringCentralAlertId: effectiveTriggeringAlertId,
      };

      broadcastSignal(currentPersistedState);

      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for state to settle

      setStatus("active");
      startRebroadcastCountdown(locToUse, victimNameToUse, sosMessageToUse, effectiveSource, effectiveTriggeringAlertId);

      // Strict Toasting Logic: Only toast if panel was previously inactive
      if (panelWasActuallyInactive) {
        const deviceNameForLog = `SOS_${victimNameToUse}_${locToUse.lat}_${locToUse.lon}`;
        const logMsg = `SOS Activated (${effectiveSource}). Broadcasting as ${deviceNameForLog}. Alerts enabled. Msg: "${sosMessageToUse}"`;
        setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: logMsg })), 0);
        toast({
            title: effectiveSource === 'central' ? "Centrally Activated SOS" : "SOS Broadcasting",
            description: `Signal sent as: ${currentPersistedState.advertisedName}. Rebroadcasting. Msg: "${sosMessageToUse}"`,
        });
      } else if (detailsChangedDuringSync) { // Log if details changed while active, but no new toast
        const logMsg = `SOS Synced & Updated Externally. Source: ${effectiveSource}. Msg: "${sosMessageToUse}"`;
        setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: logMsg })), 0);
      }


    } catch (err: any) {
      setStatus("error");
      const errorMsg = err.message || "Failed to activate SOS.";
      setError(errorMsg);
      setActivationSource(null);
      setActiveCentralAlertMessage(null);
      setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: `SOS Activation Failed (${effectiveSource}): ${errorMsg}` })), 0);
      toast({ title: "SOS Activation Failed", description: errorMsg, variant: "destructive" });
      localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);
    }
  }, [broadcastSignal, getDeviceLocation, startRebroadcastCountdown, toast]);

  const checkMassAlerts = useCallback(async () => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      const currentLocForAlertCheck = locationRef.current || await getDeviceLocation();

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

      const persistedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      let currentPersistedState: PersistedSOSState | null = null;
      if (persistedSOSStateRaw) {
        try { currentPersistedState = JSON.parse(persistedSOSStateRaw); } catch(e) { console.error("Error parsing persisted SOS for mass alert check:", e); }
      }


      if (deviceInAlertZone && triggeringAlert) {
        const alertIsNewOrDifferent = !currentPersistedState || !currentPersistedState.isActive ||
                                       currentPersistedState.activationSource !== 'central' ||
                                       currentPersistedState.triggeringCentralAlertId !== triggeringAlert.id;

        if (alertIsNewOrDifferent) {
          setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Device in active mass alert zone. Forcing SOS activation/update. Alert Msg: ${triggeringAlert.message || 'Standard emergency.'}` })), 0);
          activateSOS("central", triggeringAlert.message || undefined, undefined, triggeringAlert.id);
        }
      } else {
        if (activationSourceRef.current === 'central' && statusRef.current === 'active' && currentPersistedState && currentPersistedState.activationSource === 'central') {
           let originalCustomMsg = "Emergency! I need help. My location is being broadcast.";
           const basicInfoRaw = localStorage.getItem('victimBasicInfo');
           if(basicInfoRaw) { try { originalCustomMsg = (JSON.parse(basicInfoRaw) as VictimBasicInfo).customSOSMessage || originalCustomMsg; } catch(e){} }

           const manualState: PersistedSOSState = {
               isActive: true,
               location: currentPersistedState.location,
               victimNameForSignal: currentPersistedState.victimNameForSignal,
               advertisedName: currentPersistedState.advertisedName,
               customSosMessage: originalCustomMsg,
               activationTimestamp: Date.now(),
               activationSource: "manual",
               triggeringCentralAlertId: undefined,
           };
           activateSOS("manual", undefined, manualState);
           setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "Exited mass alert zone. SOS remains active (switched to manual)." })), 0);
           // No toast here to reduce noise, user must manually deactivate if safe.
        }
      }
    } catch (err) {
      console.error("Error checking mass alerts:", err);
       if (statusRef.current === "inactive" && locationRef.current === null && (err as Error).message.includes("Geolocation")) {
         // Suppress toast if geolocation fails when inactive and no location yet
       } else {
        setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Error during mass alert check: ${(err as Error).message}` })), 0);
       }
    }
  }, [activateSOS, getDeviceLocation]);


  useEffect(() => {
    const storedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
    let resumedFromStorage = false;

    if (storedSOSStateRaw) {
      try {
        const persistedState = JSON.parse(storedSOSStateRaw) as PersistedSOSState;
        if (persistedState.isActive && persistedState.location) {
          activateSOS(persistedState.activationSource, persistedState.customSosMessage, persistedState, persistedState.triggeringCentralAlertId);
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

    if (!resumedFromStorage && searchParams.get('sos') === 'true' && statusRef.current === "inactive") {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activateSOS, checkMassAlerts]);


  useEffect(() => {
    const handleExternalSOSChange = () => {
      const storedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      const currentPanelStatus = statusRef.current;

      if (storedSOSStateRaw) {
        try {
          const persistedState = JSON.parse(storedSOSStateRaw) as PersistedSOSState;
          if (persistedState.isActive) {
            activateSOS(persistedState.activationSource, persistedState.customSosMessage, persistedState, persistedState.triggeringCentralAlertId);
          } else if (currentPanelStatus === "active" && !persistedState.isActive) {
            deactivateSOS();
          }
        } catch (e) {
          console.error("Error processing external SOS change:", e);
          setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Sync Error processing external change." })), 0);
          toast({ title: "SOS Sync Error", description: "Could not process external SOS state change.", variant: "destructive" });
        }
      } else if (currentPanelStatus === "active") {
         deactivateSOS();
         setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "SOS Cleared Externally, deactivating panel." })), 0);
      }
    };

    window.addEventListener('localSOSStateChangedByExternal', handleExternalSOSChange);
    return () => {
      window.removeEventListener('localSOSStateChangedByExternal', handleExternalSOSChange);
    };
  }, [activateSOS, deactivateSOS, toast]); // Dependencies are stable callbacks


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
        baseText = activationSourceRef.current === 'central' ? "Centrally Activating SOS..." : "Activating SOS...";
        colorClass = "text-primary";
        if (activeCentralAlertMessage) subTextToDisplay = activeCentralAlertMessage;
        break;
      case "active":
        iconToShow = <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />;
        colorClass = "text-green-500";
        const sourceText = activationSourceRef.current === 'central' ? "(Centrally Activated)" : "(Manually Activated)";
        if (locationRef.current) {
          const deviceName = `SOS_${currentVictimNameForSignalRef.current}_${locationRef.current.lat}_${locationRef.current.lon}`;
          baseText = `SOS Active! ${sourceText} Broadcasting as: ${deviceName}`;
        } else {
          baseText = `SOS Active! ${sourceText} Broadcasting... Initializing location...`;
        }
        if (activationSourceRef.current === 'central' && activeCentralAlertMessage) {
            subTextToDisplay = activeCentralAlertMessage;
        } else if (activationSourceRef.current === 'manual' && currentCustomMessageRef.current && currentCustomMessageRef.current !== "Emergency! I need help. My location is being broadcast.") {
            subTextToDisplay = `Custom Message: "${currentCustomMessageRef.current}"`;
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
                {activationSourceRef.current === 'central' ? <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0" /> : null}
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

