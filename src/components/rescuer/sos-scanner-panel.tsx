
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon, Info, UserCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DetectedSignal as BaseDetectedSignal, VictimBasicInfo } from '@/types/signals';
import { VictimDetailsDialog } from './victim-details-dialog'; // Import the new dialog

interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
}

type ScanStatus = "idle" | "scanning" | "error";
const LOCAL_STORAGE_SOS_KEY = 'currentR.A.D.A.R.SOSSignal';
const LOCAL_STORAGE_VICTIM_INFO_KEY = 'victimBasicInfo';


const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
);

const VICTIM_STATUSES = ["Pending", "Located", "Assistance In Progress", "Rescued", "No Response", "False Alarm"];

interface SOSScannerPanelProps {
  onSignalsDetected: (signals: DetectedSignal[]) => void;
  detectedSignals: DetectedSignal[];
  setDetectedSignals: React.Dispatch<React.SetStateAction<DetectedSignal[]>>;
}

export function SOSScannerPanel({ onSignalsDetected, detectedSignals, setDetectedSignals }: SOSScannerPanelProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedVictimDetails, setSelectedVictimDetails] = useState<VictimBasicInfo | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const startScan = async () => {
    setStatus("scanning");
    setError(null);
    
    toast({ title: "Checking Local SOS", description: "Looking for active SOS signal from this device..." });

    setTimeout(() => {
      const storedSignalData = localStorage.getItem(LOCAL_STORAGE_SOS_KEY);
      let newDetectedSignals: DetectedSignal[] = [];

      if (storedSignalData) {
        try {
          const signalFromStorage: DetectedSignal = JSON.parse(storedSignalData);
          const existingSignal = detectedSignals.find(s => s.id === signalFromStorage.id);
          signalFromStorage.status = existingSignal?.status || "Pending"; 
          
          newDetectedSignals = [signalFromStorage];
          toast({ title: "Local SOS Signal Found", description: `Tracking: ${signalFromStorage.name}` });
          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: Detected active local SOS for ${signalFromStorage.name}` }));
        } catch (e) {
          console.error("Error parsing signal from localStorage:", e);
          setError("Could not read local SOS signal data.");
           toast({ title: "Local SOS Error", description: "Could not read local SOS data. It might be corrupted.", variant: "destructive" });
           window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: Error parsing local SOS data from localStorage.` }));
        }
      } else {
        toast({ title: "No Local SOS Signal", description: "No active SOS signal found from this device." });
        window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: No active local SOS signal found on this device.` }));
      }
      
      setDetectedSignals(newDetectedSignals);
      onSignalsDetected(newDetectedSignals);
      setStatus("idle");
    }, 500);
  };

  const handleViewDetails = (signalId: string) => {
    // Since we only detect local SOS, the details are always from 'victimBasicInfo'
    const storedVictimInfoRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_INFO_KEY);
    if (storedVictimInfoRaw) {
      try {
        const victimInfo = JSON.parse(storedVictimInfoRaw) as VictimBasicInfo;
        setSelectedVictimDetails(victimInfo);
        setIsDetailsDialogOpen(true);
        window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: Viewing profile for signal ID ${signalId} (local user: ${victimInfo.name || 'N/A'}).` }));
      } catch (e) {
        console.error("Error parsing victim info for details dialog:", e);
        toast({ title: "Error", description: "Could not load victim details.", variant: "destructive" });
        window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: Error loading profile for signal ID ${signalId}.` }));
      }
    } else {
      toast({ title: "No Details", description: "Victim profile information not found locally for this signal.", variant: "default" });
      window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: Victim profile not found locally for signal ID ${signalId}.` }));
    }
  };

  const handleStatusChange = (signalId: string, newStatus: string) => {
    const updatedSignals = detectedSignals.map(signal =>
      signal.id === signalId ? { ...signal, status: newStatus } : signal
    );
    setDetectedSignals(updatedSignals);
    onSignalsDetected(updatedSignals);

    const signalFromStorageRaw = localStorage.getItem(LOCAL_STORAGE_SOS_KEY);
    if (signalFromStorageRaw) {
        try {
            let signalFromStorage: DetectedSignal = JSON.parse(signalFromStorageRaw);
            if (signalFromStorage.id === signalId) {
                signalFromStorage.status = newStatus; // Save status to the broadcasted signal for consistency if needed elsewhere
                localStorage.setItem(LOCAL_STORAGE_SOS_KEY, JSON.stringify(signalFromStorage));
            }
        } catch (e) {
            console.error("Could not update status in localStorage for signal:", signalId, e);
        }
    }
    window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Rescuer: Updated status for ${signalId} to ${newStatus}.` }));
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
            Checks for an active SOS signal being broadcast by the R.A.D.A.R app on THIS device.
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
            <ul className="space-y-0.5 border rounded-md max-h-60 sm:max-h-72 overflow-y-auto">
              {detectedSignals.map((signal) => (
                <ListItemWrapper key={signal.id}>
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 sm:gap-3">
                    <div className="flex-grow">
                      <p className="font-semibold text-sm text-foreground">
                        {signal.lat && signal.lon ? `Victim: ${signal.name}` : `Device: ${signal.name}`}
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
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-1 sm:mt-0">
                       <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewDetails(signal.id)}
                        className="text-xs h-8 w-full sm:w-auto"
                      >
                        <UserCircle className="mr-1.5 h-3.5 w-3.5" /> View Profile
                      </Button>
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
