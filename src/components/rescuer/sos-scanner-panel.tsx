
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon, Info, UserCircle, Trash2, Navigation } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DetectedSignal as BaseDetectedSignal, VictimBasicInfo } from '@/types/signals';
import { VictimDetailsDialog } from './victim-details-dialog';
import { cn } from "@/lib/utils";

interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
}

type ScanStatus = "idle" | "scanning" | "error";
const LOCAL_STORAGE_SOS_KEY = 'currentR.A.D.A.R.SOSSignal';
const LOCAL_STORAGE_VICTIM_INFO_KEY = 'victimBasicInfo';


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


export function SOSScannerPanel({ detectedSignals, setDetectedSignals }: SOSScannerPanelProps) {
  const [scanButtonStatus, setScanButtonStatus] = useState<ScanStatus>("idle"); 
  const [error, setError] = useState<string | null>(null); 
  const { toast } = useToast();
  const [selectedVictimDetails, setSelectedVictimDetails] = useState<VictimBasicInfo | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [rescuerLocation, setRescuerLocation] = useState<{ lat: number; lon: number } | null>(null);
  

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lon: parseFloat(position.coords.longitude.toFixed(4)),
          };
          setRescuerLocation(newLoc);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Rescuer location obtained: LAT ${newLoc.lat}, LON ${newLoc.lon}` }));
          }, 0);
        },
        () => {
          console.warn("Could not get rescuer location for SOS Scanner.");
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Could not get rescuer location." }));
          }, 0);
        }
      );
    } else {
       console.warn("Geolocation is not supported by this browser for SOS Scanner.");
       setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Geolocation not supported by browser." }));
       }, 0);
    }
  }, []);

  const performScanLogic = useCallback((isManualScan: boolean) => {
    if (isManualScan) {
      setScanButtonStatus("scanning");
      setError(null);
      toast({ title: "Refreshing Scan...", description: "Looking for active SOS signal from this device..." });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Manual refresh scan initiated." }));
      }, 0);
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
              if(isManualScan) toast({ title: "Local SOS Signal Found", description: `Tracking: ${signalFromStorage.name}` }); 
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDetectedSignals, toast]);

  useEffect(() => {
    performScanLogic(false); 
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
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Viewing profile for signal ID ${signalId} (local user: ${victimInfo.name || 'N/A'}).` }));
        }, 0);
      } catch (e) {
        console.error("Error parsing victim info for details dialog:", e);
        toast({ title: "Error", description: "Could not load victim details.", variant: "destructive" });
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Error loading profile for signal ID ${signalId}.` }));
        }, 0);
      }
    } else {
      toast({ title: "No Details", description: "Victim profile information not found locally for this signal.", variant: "default" });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Victim profile not found locally for signal ID ${signalId}.` }));
      }, 0);
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
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Updated status for victim ${signal?.name || signalId} to ${newStatus}.` }));
    }, 0);
  };

  const handleRemoveSignal = (signalIdToRemove: string) => {
    const signalToRemove = detectedSignals.find(s => s.id === signalIdToRemove);
    const remainingSignals = detectedSignals.filter(signal => signal.id !== signalIdToRemove);
    setDetectedSignals(remainingSignals);
    toast({ title: "Signal Removed", description: `Signal for ${signalToRemove?.name || signalIdToRemove} has been removed.` });
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Manually removed signal ${signalToRemove?.name || signalIdToRemove} from the list.` }));
    }, 0);
  };

  const openGoogleMapsDirections = (victimLat: number, victimLon: number, victimName?: string) => {
    let url: string;
    let logDetail: string;
    if (rescuerLocation) { 
        url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`; 
        logDetail = `SOS Scanner: Opening Google Maps directions for ${victimName || 'victim'} from ${rescuerLocation.lat},${rescuerLocation.lon} to ${victimLat},${victimLon}.`;
    } else { 
        url = `https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLon}`; 
        logDetail = `SOS Scanner: Opening Google Maps for ${victimName || 'victim'} at ${victimLat},${victimLon} (rescuer location unavailable).`;
        console.warn("Rescuer location not available for directions, opening victim location directly.");
    }
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: logDetail }));
    }, 0);
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


  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Bluetooth className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Local SOS Signal Monitor 
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Automatically checks for local SOS signals. Detected signals persist until manually removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <ul className="space-y-0.5 border rounded-md max-h-[calc(100vh-28rem)] sm:max-h-[calc(100vh-25rem)] overflow-y-auto">
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
        </CardContent>
      </Card>
      <VictimDetailsDialog victimInfo={selectedVictimDetails} isOpen={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen} />
    </>
  );
}

