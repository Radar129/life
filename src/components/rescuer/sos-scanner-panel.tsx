
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon, Info, UserCircle, Trash2, Navigation } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DetectedSignal as BaseDetectedSignal, VictimBasicInfo } from '@/types/signals';
import { VictimDetailsDialog } from './victim-details-dialog';

interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
}

type ScanStatus = "idle" | "scanning" | "error";
const LOCAL_STORAGE_SOS_KEY = 'currentR.A.D.A.R.SOSSignal';
const LOCAL_STORAGE_VICTIM_INFO_KEY = 'victimBasicInfo';


const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
);

const VICTIM_STATUSES = ["Pending", "Located", "Assistance In Progress", "Rescued", "No Response", "False Alarm", "Signal Lost (Local)", "Active (Local)"];

interface SOSScannerPanelProps {
  detectedSignals: DetectedSignal[];
  setDetectedSignals: React.Dispatch<React.SetStateAction<DetectedSignal[]>>;
}

export function SOSScannerPanel({ detectedSignals, setDetectedSignals }: SOSScannerPanelProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
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
  }, []);


  const startScan = async () => {
    setStatus("scanning");
    setError(null);
    
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "SOS Scanner: Check for local SOS initiated." }));
    toast({ title: "Checking Local SOS", description: "Looking for active SOS signal from this device..." });

    setTimeout(() => {
      const storedSignalData = localStorage.getItem(LOCAL_STORAGE_SOS_KEY);
      let updatedSignalsList = [...detectedSignals]; 

      if (storedSignalData) {
        try {
          const signalFromStorage: BaseDetectedSignal = JSON.parse(storedSignalData); 
          const existingSignalIndex = updatedSignalsList.findIndex(s => s.id === signalFromStorage.id);
          
          const newSignalData = {
            ...signalFromStorage,
            rssi: -50 - Math.floor(Math.random() * 10), 
            timestamp: Date.now(),
          };

          if (existingSignalIndex !== -1) {
            updatedSignalsList[existingSignalIndex] = {
              ...newSignalData,
              status: updatedSignalsList[existingSignalIndex].status && updatedSignalsList[existingSignalIndex].status !== "Signal Lost (Local)"
                ? updatedSignalsList[existingSignalIndex].status 
                : "Active (Local)",
            };
            toast({ title: "Local SOS Signal Updated", description: `Tracking: ${signalFromStorage.name}` });
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Updated active local SOS for ${signalFromStorage.name}` }));
          } else {
            updatedSignalsList.push({
              ...newSignalData,
              status: "Active (Local)", 
            });
            toast({ title: "Local SOS Signal Found", description: `Tracking: ${signalFromStorage.name}` });
            window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Detected new active local SOS for ${signalFromStorage.name}` }));
          }
        } catch (e) {
          console.error("Error parsing signal from localStorage:", e);
          setError("Could not read local SOS signal data.");
          toast({ title: "Local SOS Error", description: "Could not read local SOS data. It might be corrupted.", variant: "destructive" });
          window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Error parsing local SOS data from localStorage.` }));
        }
      } else { 
        const existingSignalIndex = updatedSignalsList.findIndex(s => s.id === 'local_sos_signal');
        if (existingSignalIndex !== -1) {
          if (updatedSignalsList[existingSignalIndex].status !== "Signal Lost (Local)") {
             updatedSignalsList[existingSignalIndex].status = "Signal Lost (Local)";
             updatedSignalsList[existingSignalIndex].rssi = -100; 
             toast({ title: "Local SOS Signal Lost", description: `Previously active SOS for ${updatedSignalsList[existingSignalIndex].name} is no longer broadcasting.` });
             window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Local SOS signal previously for ${updatedSignalsList[existingSignalIndex].name} is no longer active.` }));
          }
        } else {
          toast({ title: "No Local SOS Signal", description: "No active SOS signal found from this device." });
          window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: No active local SOS signal found on this device.` }));
        }
      }
      
      setDetectedSignals(updatedSignalsList);
      setStatus("idle");
    }, 500);
  };

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
    const updatedSignals = detectedSignals.map(s =>
      s.id === signalId ? { ...s, status: newStatus } : s
    );
    setDetectedSignals(updatedSignals);

    if (signalId === 'local_sos_signal') {
        const signalFromStorageRaw = localStorage.getItem(LOCAL_STORAGE_SOS_KEY);
        if (signalFromStorageRaw) {
            try {
                let signalFromStorage: DetectedSignal = JSON.parse(signalFromStorageRaw);
                signalFromStorage.status = newStatus; 
                localStorage.setItem(LOCAL_STORAGE_SOS_KEY, JSON.stringify(signalFromStorage));
            } catch (e) {
                console.error("Could not update status in localStorage for local_sos_signal:", e);
            }
        }
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
    if (rescuerLocation) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`;
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Opening Google Maps directions for ${victimName || 'victim'} from ${rescuerLocation.lat},${rescuerLocation.lon} to ${victimLat},${victimLon}.` }));
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLon}`;
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `SOS Scanner: Opening Google Maps for ${victimName || 'victim'} at ${victimLat},${victimLon} (rescuer location unavailable).` }));
      console.warn("Rescuer location not available for directions, opening victim location directly.");
    }
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
            Checks for an active SOS signal being broadcast by the R.A.D.A.R app on THIS device. Detected signals persist until manually removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startScan} disabled={status === "scanning"} className="w-full sm:w-auto mb-4 sm:mb-6 bg-primary hover:bg-primary/90 text-sm">
            {status === "scanning" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {status === "scanning" ? "Checking..." : "Check for Local SOS"}
          </Button>
          
          {error && (
            <div className="text-destructive text-sm flex items-center gap-2 p-3 sm:p-4 bg-destructive/10 rounded-md">
              <AlertTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6" /> 
              <p>{error}</p>
            </div>
          )}

          {detectedSignals.length > 0 ? (
            <ul className="space-y-0.5 border rounded-md max-h-[calc(100vh-28rem)] sm:max-h-[calc(100vh-22rem)] overflow-y-auto"> {/* Adjusted max-h */}
              {detectedSignals.map((signal) => (
                <ListItemWrapper key={signal.id}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 sm:gap-3">
                    <div className="flex-grow">
                      <p className="font-semibold text-sm text-foreground">
                        {signal.lat && signal.lon ? `Victim: ${signal.name}` : `Device: ${signal.name}`}
                        {signal.status === "Signal Lost (Local)" && <span className="text-xs text-destructive ml-1">(Signal Lost)</span>}
                      </p>
                      {signal.lat && signal.lon && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> LAT: {signal.lat}, LON: {signal.lon}
                        </p>
                      )}
                       <div className="flex items-center gap-1.5 text-xs mt-0.5">
                          {getSignalStrengthIcon(signal.rssi)}
                          <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi !== undefined ? `${signal.rssi} dBm` : 'N/A'} - local)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {signal.advertisedName && signal.advertisedName !== signal.name ? `Raw Signal: ${signal.advertisedName}` : `ID: ${signal.id}`}
                        </p>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewDetails(signal.id)}
                        className="text-xs h-8 w-full sm:w-auto flex-shrink-0"
                      >
                        <UserCircle className="mr-1.5 h-3.5 w-3.5" /> View Profile
                      </Button>
                       {signal.lat && signal.lon && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGoogleMapsDirections(signal.lat!, signal.lon!, signal.name)}
                            className="text-xs h-8 w-full sm:w-auto flex-shrink-0"
                            disabled={!signal.lat || !signal.lon}
                        >
                            <Navigation className="mr-1.5 h-3.5 w-3.5" />
                            Directions
                        </Button>
                       )}
                      <div className="w-full sm:w-40 flex-shrink-0">
                        <Select
                          value={signal.status || "Pending"}
                          onValueChange={(value) => handleStatusChange(signal.id, value)}
                        >
                          <SelectTrigger className="w-full text-xs h-8">
                            <SelectValue placeholder="Set Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {VICTIM_STATUSES.map(stat => (
                              <SelectItem key={stat} value={stat} className="text-xs">
                                {stat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                       <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 w-8 h-8 p-0 self-center sm:self-auto flex-shrink-0"
                          onClick={() => handleRemoveSignal(signal.id)}
                          aria-label={`Remove signal for ${signal.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                </ListItemWrapper>
              ))}
            </ul>
          ) : (
            status === "idle" && !error && ( 
              <div className="text-muted-foreground text-sm text-center py-4 flex flex-col items-center gap-2">
                <Info className="w-8 h-8 text-primary/70"/>
                <p>No active local SOS signal detected.</p>
                <p className="text-xs">Activate SOS in "User Mode" on this device, then "Check for Local SOS".</p>
              </div>
            )
          )}
        </CardContent>
      </Card>
      <VictimDetailsDialog
        victimInfo={selectedVictimDetails}
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </>
  );
}

