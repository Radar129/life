
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, WifiOff, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DetectedSignal as BaseDetectedSignal } from '@/types/signals';

interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
  advertisedName?: string; 
}

type ScanStatus = "idle" | "scanning" | "error" | "unsupported";

const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
);

const VICTIM_STATUSES = ["Pending", "Located", "Assistance In Progress", "Rescued", "No Response"];

interface SOSScannerPanelProps {
  onSignalsDetected: (signals: DetectedSignal[]) => void;
  detectedSignals: DetectedSignal[];
  setDetectedSignals: React.Dispatch<React.SetStateAction<DetectedSignal[]>>;
}

export function SOSScannerPanel({ onSignalsDetected, detectedSignals, setDetectedSignals }: SOSScannerPanelProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseSignalName = (advertisedName: string | undefined): { victimName: string | undefined, lat: number | undefined, lon: number | undefined } => {
    if (advertisedName && advertisedName.startsWith("SOS_")) {
      const parts = advertisedName.split('_');
      if (parts.length === 4) {
        const victimName = parts[1].replace(/_/g, ' '); 
        const lat = parseFloat(parts[2]);
        const lon = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lon) && victimName) {
          return { victimName, lat, lon };
        }
      } else if (parts.length === 3) { 
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { victimName: "Unknown (via SOS)", lat, lon };
        }
      }
    }
    return { victimName: undefined, lat: undefined, lon: undefined };
  };
  
  const startScan = async () => {
    setStatus("scanning");
    setError(null);
    // Don't clear existing signals, allow accumulation from multiple scans
    // setDetectedSignals([]); 
    // onSignalsDetected([]); 

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth API is not supported by your browser.");
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot scan for signals.", variant: "destructive" });
      return;
    }

    toast({ title: "Scan Initiated", description: "Requesting Bluetooth device..." });

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, // For broader discovery, can be refined with filters
        // Example filter for a specific service (if victim device advertises one):
        // filters: [{ services: ['heart_rate'] }] 
        // optionalServices: ['battery_service'] // To potentially access more info after connection
      });

      setStatus("idle");
      toast({ title: "Device Selected", description: `Device: ${device.name || device.id}` });
      
      const parsed = parseSignalName(device.name);
      
      // Use a placeholder RSSI for real devices as it's not directly available from requestDevice
      // A more advanced implementation would use watchAdvertisements() if possible.
      const placeholderRssi = -65; 

      const newSignal: DetectedSignal = {
        id: device.id,
        advertisedName: device.name || "N/A",
        name: parsed.victimName || device.name || "Unknown Device", // Use parsed name if available, else device name
        lat: parsed.lat,
        lon: parsed.lon,
        rssi: placeholderRssi, 
        timestamp: Date.now(),
        status: "Pending",
      };

      setDetectedSignals(prevSignals => {
        // Avoid adding duplicates if scanning again for the same device
        const existingSignalIndex = prevSignals.findIndex(s => s.id === newSignal.id);
        let updatedSignals;
        if (existingSignalIndex > -1) {
          updatedSignals = [...prevSignals];
          updatedSignals[existingSignalIndex] = newSignal; // Update if found
        } else {
          updatedSignals = [...prevSignals, newSignal]; // Add if new
        }
        onSignalsDetected(updatedSignals);
        return updatedSignals;
      });


    } catch (err: any) {
      setStatus("error");
      if (err.name === 'NotFoundError' || err.name === 'NotAllowedError') {
        setError("Scan cancelled or no device selected. Bluetooth permissions may be required.");
        toast({ title: "Scan Cancelled", description: "No device was selected or permissions denied.", variant: "default" });
      } else {
        setError(`Bluetooth scan error: ${err.message}`);
        toast({ title: "Bluetooth Scan Error", description: err.message, variant: "destructive" });
      }
      console.error("Bluetooth scan error:", err);
    } finally {
      if (status === "scanning") { // If try block exited early before setting status to idle
        setStatus("idle");
      }
    }
  };


  const handleStatusChange = (signalId: string, newStatus: string) => {
    const updatedSignals = detectedSignals.map(signal =>
      signal.id === signalId ? { ...signal, status: newStatus } : signal
    );
    setDetectedSignals(updatedSignals);
    onSignalsDetected(updatedSignals); 
  };


  const getSignalStrengthIcon = (rssi: number) => {
    if (rssi > -60) return <SignalHigh className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />;
    if (rssi > -75) return <SignalMedium className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />;
    return <SignalLow className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
  };

  const getProximityText = (rssi: number) => {
    if (rssi > -60) return "Very Close";
    if (rssi > -75) return "Close";
    if (rssi > -90) return "Medium";
    return "Far";
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Bluetooth className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          SOS Signal Scanner
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Scan for nearby Bluetooth devices. If a device advertises a name like 'SOS_Name_Lat_Lon', it will be parsed. RSSI for real devices is a placeholder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={startScan} disabled={status === "scanning"} className="w-full sm:w-auto mb-4 sm:mb-6 bg-primary hover:bg-primary/90 text-sm">
          {status === "scanning" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {status === "scanning" ? "Scanning..." : "Start New Scan"}
        </Button>
        
        {status === "unsupported" && (
          <div className="text-destructive text-sm flex items-center gap-2 p-3 sm:p-4 bg-destructive/10 rounded-md">
            <WifiOff className="w-5 h-5 sm:w-6 sm:h-6" /> 
            <p>{error || "Web Bluetooth API not available."}</p>
          </div>
        )}
        {status === "error" && error && (
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
                        <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi} dBm{signal.rssi === -65 ? " - placeholder" : ""})</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {signal.advertisedName && signal.advertisedName !== signal.name ? `Advertised: ${signal.advertisedName}` : `ID: ${signal.id}`}
                      </p>
                  </div>
                  <div className="w-full sm:w-40 flex-shrink-0 mt-1 sm:mt-0">
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
              </ListItemWrapper>
            ))}
          </ul>
        ) : (
          status === "idle" && !error && ( 
            <p className="text-muted-foreground text-sm text-center py-4">No devices detected yet. Start a scan.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
