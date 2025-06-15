
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Bluetooth, Search, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon, Info, UserCircle, Trash2, Navigation, Megaphone, CircleDot, MessageSquareText, ListChecks, AlertTriangle as AlertTriangleForm } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DetectedSignal as BaseDetectedSignal, VictimBasicInfo, MassAlert } from '@/types/signals';
import { VictimDetailsDialog } from './victim-details-dialog';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';


interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
}

type ScanStatus = "idle" | "scanning" | "error";
const LOCAL_STORAGE_SOS_KEY = 'currentR.A.D.A.R.SOSSignal';
const LOCAL_STORAGE_VICTIM_INFO_KEY = 'victimBasicInfo';
const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions'; // For mass alerts

const SCAN_INTERVAL_MS = 10000; // 10 seconds for automatic refresh


const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
);

const VICTIM_STATUSES = ["Pending", "Located", "Assistance In Progress", "Rescued", "No Response", "False Alarm", "Signal Lost (Local)", "Active (Local)"];

interface SOSScannerPanelProps {
  detectedSignals: DetectedSignal[];
  setDetectedSignals: React.Dispatch<React.SetStateAction<DetectedSignal[]>>;
}

const getStatusColorClass = (status?: string): string => {
  if (!status) return "text-muted-foreground";
  switch (status) {
    case "Active (Local)":
      return "text-green-600 dark:text-green-400 font-medium";
    case "Signal Lost (Local)":
      return "text-red-600 dark:text-red-400 font-medium";
    case "Rescued":
      return "text-blue-600 dark:text-blue-400 font-medium";
    case "Located":
      return "text-yellow-600 dark:text-yellow-500 font-medium";
    case "Assistance In Progress":
      return "text-purple-600 dark:text-purple-400 font-medium";
    case "No Response":
      return "text-orange-600 dark:text-orange-400 font-medium";
    case "False Alarm":
      return "text-gray-500 dark:text-gray-400";
    case "Pending":
    default:
      return "text-muted-foreground";
  }
};

// Schema and type for Mass Alert Form
const massAlertSchema = z.object({
  lat: z.coerce.number().min(-90, "Invalid Latitude").max(90, "Invalid Latitude"),
  lon: z.coerce.number().min(-180, "Invalid Longitude").max(180, "Invalid Longitude"),
  radius: z.coerce.number().min(1, "Radius must be at least 1 meter").max(50000, "Radius cannot exceed 50km"), // Max 50km
  message: z.string().max(200, "Message too long (max 200 chars)").optional(),
});

type MassAlertFormValues = z.infer<typeof massAlertSchema>;


export function SOSScannerPanel({ detectedSignals, setDetectedSignals }: SOSScannerPanelProps) {
  const [scanButtonStatus, setScanButtonStatus] = useState<ScanStatus>("idle"); 
  const [error, setError] = useState<string | null>(null); 
  const { toast } = useToast();
  const [selectedVictimDetails, setSelectedVictimDetails] = useState<VictimBasicInfo | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [rescuerLocation, setRescuerLocation] = useState<{ lat: number; lon: number } | null>(null);
  
  // State and form for Mass Alerts
  const [activeMassAlerts, setActiveMassAlerts] = useState<MassAlert[]>([]);
  const massAlertForm = useForm<MassAlertFormValues>({
    resolver: zodResolver(massAlertSchema),
    defaultValues: {
      lat: undefined,
      lon: undefined,
      radius: 1000, 
      message: "",
    },
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lon: parseFloat(position.coords.longitude.toFixed(4)),
          };
          setRescuerLocation(newLoc);
          window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Rescuer location obtained: LAT ${newLoc.lat}, LON ${newLoc.lon}` }));
        },
        () => {
          console.warn("Could not get rescuer location for SOS Scanner.");
          window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Could not get rescuer location." }));
        }
      );
    } else {
       console.warn("Geolocation is not supported by this browser for SOS Scanner.");
       window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Geolocation not supported by browser." }));
    }

    // Load active mass alerts
    loadActiveMassAlerts();
    const handleStorageChangeForMassAlerts = (event: StorageEvent) => {
        if (event.key === MASS_ALERT_DEFINITIONS_KEY) {
          loadActiveMassAlerts();
        }
      };
    window.addEventListener('storage', handleStorageChangeForMassAlerts);
    return () => {
      window.removeEventListener('storage', handleStorageChangeForMassAlerts);
    };
  }, []);

  const performScanLogic = useCallback((isManualScan: boolean) => {
    if (isManualScan) {
      setScanButtonStatus("scanning");
      setError(null);
      toast({ title: "Refreshing Scan...", description: "Looking for active SOS signal from this device..." });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Manual refresh scan initiated." }));
    }

    setTimeout(() => {
      const storedSignalData = localStorage.getItem(LOCAL_STORAGE_SOS_KEY);
      setDetectedSignals(prevDetectedSignals => {
        let updatedSignalsList = [...prevDetectedSignals];
        const localSignalId = 'local_sos_signal'; 
        if (storedSignalData) {
          try {
            const signalFromStorage: BaseDetectedSignal = JSON.parse(storedSignalData);
            const existingSignalIndex = updatedSignalsList.findIndex(s => s.id === localSignalId);
            const newSignalData: DetectedSignal = { ...signalFromStorage, id: localSignalId, rssi: -50 - Math.floor(Math.random() * 10), timestamp: Date.now() };
            if (existingSignalIndex !== -1) {
              const wasPreviouslyLost = updatedSignalsList[existingSignalIndex].status === "Signal Lost (Local)";
              const oldStatus = updatedSignalsList[existingSignalIndex].status;
              const currentStatusInStorage = signalFromStorage.status || "Active (Local)";
              updatedSignalsList[existingSignalIndex] = { ...newSignalData, status: (oldStatus === "Signal Lost (Local)" && currentStatusInStorage !== "Signal Lost (Local)") ? currentStatusInStorage : oldStatus || currentStatusInStorage };
              if (wasPreviouslyLost && currentStatusInStorage !== "Signal Lost (Local)") {
                  if (isManualScan) toast({ title: "Local SOS Re-acquired", description: `Tracking: ${signalFromStorage.name}` });
                  window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Re-acquired active local SOS for ${signalFromStorage.name}. Status: ${updatedSignalsList[existingSignalIndex].status}` }));
              } else if (isManualScan) {
                window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Refreshed active local SOS for ${signalFromStorage.name}. Status: ${updatedSignalsList[existingSignalIndex].status}` }));
              }
            } else { 
              updatedSignalsList.push({ ...newSignalData, status: signalFromStorage.status || "Active (Local)" });
              if(isManualScan) toast({ title: "Local SOS Signal Found", description: `Tracking: ${signalFromStorage.name}` }); // Toast only on manual if new
              window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Detected new active local SOS for ${signalFromStorage.name}. Status: ${signalFromStorage.status || "Active (Local)"}` }));
            }
          } catch (e) {
            console.error("Error parsing signal from localStorage:", e);
            if (isManualScan) { setError("Could not read local SOS signal data."); toast({ title: "Local SOS Error", description: "Could not read local SOS data. It might be corrupted.", variant: "destructive" });}
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Error parsing local SOS data from localStorage.` }));
          }
        } else { 
          const existingSignalIndex = updatedSignalsList.findIndex(s => s.id === localSignalId);
          if (existingSignalIndex !== -1) {
            if (updatedSignalsList[existingSignalIndex].status !== "Signal Lost (Local)") {
              updatedSignalsList[existingSignalIndex].status = "Signal Lost (Local)";
              updatedSignalsList[existingSignalIndex].rssi = -100;
              if (isManualScan || prevDetectedSignals[existingSignalIndex].status !== "Signal Lost (Local)") {
                toast({ title: "Local SOS Signal Lost", description: `SOS for ${updatedSignalsList[existingSignalIndex].name} is no longer broadcasting.` });
                window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Local SOS signal for ${updatedSignalsList[existingSignalIndex].name} is no longer active.` }));
              }
            }
          }
        }
        return updatedSignalsList.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
      if (isManualScan) setScanButtonStatus("idle");
    }, isManualScan ? 500 : 100); 
  }, [setDetectedSignals, toast]);

  useEffect(() => {
    performScanLogic(false); // Initial scan
    const intervalId = setInterval(() => performScanLogic(false), SCAN_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [performScanLogic]);

  const handleViewDetails = (signalId: string) => {
    const storedVictimInfoRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_INFO_KEY);
    if (storedVictimInfoRaw) {
      try {
        const victimInfo = JSON.parse(storedVictimInfoRaw) as VictimBasicInfo;
        setSelectedVictimDetails(victimInfo);
        setIsDetailsDialogOpen(true);
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Viewing profile for signal ID ${signalId} (local user: ${victimInfo.name || 'N/A'}).` }));
      } catch (e) {
        console.error("Error parsing victim info for details dialog:", e);
        toast({ title: "Error", description: "Could not load victim details.", variant: "destructive" });
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Error loading profile for signal ID ${signalId}.` }));
      }
    } else {
      toast({ title: "No Details", description: "Victim profile information not found locally for this signal.", variant: "default" });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Victim profile not found locally for signal ID ${signalId}.` }));
    }
  };

  const handleStatusChange = (signalId: string, newStatus: string) => {
    const signal = detectedSignals.find(s => s.id === signalId);
    const updatedSignals = detectedSignals.map(s => s.id === signalId ? { ...s, status: newStatus } : s);
    setDetectedSignals(updatedSignals);
    if (signalId === 'local_sos_signal') {
        const signalFromStorageRaw = localStorage.getItem(LOCAL_STORAGE_SOS_KEY);
        if (signalFromStorageRaw) { try { let signalFromStorage: DetectedSignal = JSON.parse(signalFromStorageRaw); signalFromStorage.status = newStatus; localStorage.setItem(LOCAL_STORAGE_SOS_KEY, JSON.stringify(signalFromStorage)); } catch (e) { console.error("Could not update status in localStorage for local_sos_signal:", e);}}
    }
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Updated status for victim ${signal?.name || signalId} to ${newStatus}.` }));
  };

  const handleRemoveSignal = (signalIdToRemove: string) => {
    const signalToRemove = detectedSignals.find(s => s.id === signalIdToRemove);
    const remainingSignals = detectedSignals.filter(signal => signal.id !== signalIdToRemove);
    setDetectedSignals(remainingSignals);
    toast({ title: "Signal Removed", description: `Signal for ${signalToRemove?.name || signalIdToRemove} has been removed.` });
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Manually removed signal ${signalToRemove?.name || signalIdToRemove} from the list.` }));
  };

  const openGoogleMapsDirections = (victimLat: number, victimLon: number, victimName?: string) => {
    let url: string;
    if (rescuerLocation) { url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`; window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Opening Google Maps directions for ${victimName || 'victim'} from ${rescuerLocation.lat},${rescuerLocation.lon} to ${victimLat},${victimLon}.` }));} 
    else { url = `https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLon}`; window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Opening Google Maps for ${victimName || 'victim'} at ${victimLat},${victimLon} (rescuer location unavailable).` })); console.warn("Rescuer location not available for directions, opening victim location directly.");}
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getSignalStrengthIcon = (rssi: number | undefined) => {
    if (rssi === undefined) return <SignalMedium className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />;
    if (rssi > -60) return <SignalHigh className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />;
    if (rssi > -75) return <SignalMedium className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />;
    return <SignalLow className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
  };

  const getProximityText = (rssi: number | undefined) => {
    if (rssi === undefined) return "Unknown";
    if (rssi > -60) return "Very Close";
    if (rssi > -75) return "Close";
    if (rssi > -90) return "Medium";
    return "Far";
  };

  // Mass Alert Logic
  const loadActiveMassAlerts = () => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      if (storedAlertsRaw) {
        const storedAlerts = JSON.parse(storedAlertsRaw) as MassAlert[];
        setActiveMassAlerts(storedAlerts.sort((a, b) => b.timestamp - a.timestamp));
      } else { setActiveMassAlerts([]); }
    } catch (error) { console.error("Failed to load mass alerts from localStorage:", error); setActiveMassAlerts([]); }
  };

  const onMassAlertSubmit: SubmitHandler<MassAlertFormValues> = async (data) => {
    const newAlert: MassAlert = { id: `massalert_${Date.now()}`, lat: data.lat, lon: data.lon, radius: data.radius, message: data.message || undefined, timestamp: Date.now() };
    try {
      const currentAlerts = [...activeMassAlerts];
      currentAlerts.unshift(newAlert);
      localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(currentAlerts));
      setActiveMassAlerts(currentAlerts.sort((a, b) => b.timestamp - a.timestamp));
      toast({ title: "Area Alert Created", description: `Alert active for LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m.` });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Created for LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m. ID: ${newAlert.id}` }));
      massAlertForm.reset();
    } catch (e) {
      toast({ title: "Error Creating Alert", description: "Could not save the area alert.", variant: "destructive" });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Error creating alert - LocalStorage issue.` }));
    }
  };

  const handleStopMassAlert = (alertId: string) => {
    const alertToStop = activeMassAlerts.find(a => a.id === alertId);
    const updatedAlerts = activeMassAlerts.filter(alert => alert.id !== alertId);
    localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(updatedAlerts));
    setActiveMassAlerts(updatedAlerts);
    toast({ title: "Area Alert Stopped", description: `Alert ID ${alertId} has been deactivated.` });
    if (alertToStop) { window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Stopped alert ID ${alertId} (LAT ${alertToStop.lat}, LON ${alertToStop.lon}, Radius ${alertToStop.radius}m).` }));} 
    else { window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Stopped alert ID ${alertId}.` }));}
  };
  const { isSubmitting: isMassAlertSubmitting } = massAlertForm.formState;


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Bluetooth className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            SOS Management: Signal Scan & Area Alerts
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Automatically checks for local SOS signals. Define areas for mass SOS activation. Detected signals and active alerts persist until manually removed/stopped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Section 1: Local SOS Signal Monitor */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-2">Local Signal Monitor</h3>
            <Button onClick={() => performScanLogic(true)} disabled={scanButtonStatus === "scanning"} className="w-full sm:w-auto mb-3 bg-primary hover:bg-primary/90 text-sm">
              {scanButtonStatus === "scanning" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {scanButtonStatus === "scanning" ? "Scanning..." : "Refresh Scan"}
            </Button>
            
            {error && (
              <div className="text-destructive text-sm flex items-center gap-2 p-3 bg-destructive/10 rounded-md mb-3">
                <AlertTriangleIcon className="w-5 h-5" /> <p>{error}</p>
              </div>
            )}

            {detectedSignals.length > 0 ? (
              <ul className="space-y-0.5 border rounded-md max-h-[calc(50vh-14rem)] sm:max-h-[calc(50vh-11rem)] overflow-y-auto">
                {detectedSignals.map((signal) => (
                  <ListItemWrapper key={signal.id}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 sm:gap-3">
                      <div className="flex-grow">
                        <p className="font-semibold text-sm text-foreground">
                          {signal.lat && signal.lon ? `Victim: ${signal.name}` : `Device: ${signal.name}`}
                          {signal.status === "Signal Lost (Local)" && <span className="text-xs text-red-500 ml-1">(Signal Lost)</span>}
                          {signal.status === "Active (Local)" && <span className="text-xs text-green-500 ml-1">(Active)</span>}
                        </p>
                        {signal.lat && signal.lon && ( <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> LAT: {signal.lat}, LON: {signal.lon}</p>)}
                        <div className="flex items-center gap-1.5 text-xs mt-0.5">{getSignalStrengthIcon(signal.rssi)}<span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi !== undefined ? `${signal.rssi} dBm` : 'N/A'} - local)</span></div>
                        <p className="text-xs text-muted-foreground mt-0.5">{signal.advertisedName && signal.advertisedName !== signal.name ? `Raw Signal: ${signal.advertisedName}` : `ID: ${signal.id}`}</p>
                      </div>
                      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(signal.id)} className="text-xs h-8 w-full sm:w-auto flex-shrink-0"><UserCircle className="mr-1.5 h-3.5 w-3.5" /> View Profile</Button>
                        {signal.lat && signal.lon && (<Button variant="outline" size="sm" onClick={() => openGoogleMapsDirections(signal.lat!, signal.lon!, signal.name)} className="text-xs h-8 w-full sm:w-auto flex-shrink-0" disabled={!signal.lat || !signal.lon}><Navigation className="mr-1.5 h-3.5 w-3.5" />Directions</Button>)}
                        <div className="w-full sm:w-40 flex-shrink-0">
                          <Select value={signal.status || "Pending"} onValueChange={(value) => handleStatusChange(signal.id, value)}>
                            <SelectTrigger className={cn("w-full text-xs h-8", getStatusColorClass(signal.status))}><SelectValue placeholder="Set Status" /></SelectTrigger>
                            <SelectContent>{VICTIM_STATUSES.map(stat => (<SelectItem key={stat} value={stat} className={cn("text-xs", getStatusColorClass(stat))}>{stat}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 w-8 h-8 p-0 self-center sm:self-auto flex-shrink-0" onClick={() => handleRemoveSignal(signal.id)} aria-label={`Remove signal for ${signal.name}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </ListItemWrapper>
                ))}
              </ul>
            ) : ( scanButtonStatus === "idle" && !error && ( <div className="text-muted-foreground text-sm text-center py-4 flex flex-col items-center gap-2"><Info className="w-8 h-8 text-primary/70"/><p>No active local SOS signal detected.</p><p className="text-xs">Activate SOS in "User Mode" on this device for it to appear here.</p></div>))}
          </div>

          <Separator className="my-4" />

          {/* Section 2: Area SOS Alert Manager */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-1 flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary"/>Area SOS Alert Manager</h3>
            <p className="text-xs text-muted-foreground mb-3">Define an area to centrally activate SOS for R.A.D.A.R users within it. Alerts are stored locally for this demo.</p>
            
            <Form {...massAlertForm}>
              <form onSubmit={massAlertForm.handleSubmit(onMassAlertSubmit)} className="space-y-3 border p-3 rounded-md bg-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField control={massAlertForm.control} name="lat" render={({ field }) => (<FormItem><FormLabel htmlFor="lat" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>Latitude <span className="text-destructive">*</span></FormLabel><FormControl><Input id="lat" type="number" step="any" placeholder="e.g., 34.0522" {...field} className="text-sm h-9" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={massAlertForm.control} name="lon" render={({ field }) => (<FormItem><FormLabel htmlFor="lon" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>Longitude <span className="text-destructive">*</span></FormLabel><FormControl><Input id="lon" type="number" step="any" placeholder="e.g., -118.2437" {...field} className="text-sm h-9" /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={massAlertForm.control} name="radius" render={({ field }) => (<FormItem><FormLabel htmlFor="radius" className="text-xs flex items-center gap-1"><CircleDot className="w-3 h-3"/>Radius (meters) <span className="text-destructive">*</span></FormLabel><FormControl><Input id="radius" type="number" placeholder="e.g., 1000 (for 1km)" {...field} className="text-sm h-9" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={massAlertForm.control} name="message" render={({ field }) => (<FormItem><FormLabel htmlFor="message" className="text-xs flex items-center gap-1"><MessageSquareText className="w-3 h-3"/>Alert Message (Optional)</FormLabel><FormControl><Textarea id="message" placeholder="e.g., Evacuate area due to fire." {...field} className="text-sm min-h-[50px]" /></FormControl><FormMessage /><p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/200</p></FormItem>)} />
                <Button type="submit" disabled={isMassAlertSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm w-full h-9">
                  {isMassAlertSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangleForm className="mr-2 h-4 w-4" />} Create Area Alert
                </Button>
              </form>
            </Form>

            {activeMassAlerts.length > 0 && (
              <div className="mt-4 space-y-3">
                <h4 className="text-base font-medium text-primary flex items-center gap-2"><ListChecks className="w-4 h-4" /> Active Area Alerts ({activeMassAlerts.length})</h4>
                <ScrollArea className="h-32 w-full rounded-md border">
                  <ul className="p-2 space-y-2">
                    {activeMassAlerts.map(alert => (
                      <li key={alert.id} className="p-2 border-b last:border-b-0 bg-muted/20 rounded-md text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">LAT: {alert.lat}, LON: {alert.lon}, Radius: {alert.radius}m</p>
                            {alert.message && <p className="text-muted-foreground italic mt-0.5">"{alert.message}"</p>}
                            <p className="text-muted-foreground text-xs mt-0.5">Created: {format(new Date(alert.timestamp), 'PPpp')}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleStopMassAlert(alert.id)} className="text-destructive hover:text-destructive h-7 px-2">
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Stop
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <VictimDetailsDialog victimInfo={selectedVictimDetails} isOpen={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen} />
    </>
  );
}
