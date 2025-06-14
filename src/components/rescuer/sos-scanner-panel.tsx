
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, WifiOff, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
// import { RadarAnimation } from '@/components/rescuer/radar-animation'; // RadarAnimation import removed
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DetectedSignal as BaseDetectedSignal } from '@/types/signals';

interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
  advertisedName?: string; // To store the original SOS_Name_Lat_Lon string
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

  const parseSignalName = (advertisedName: string): { victimName: string | undefined, lat: number | undefined, lon: number | undefined } => {
    if (advertisedName && advertisedName.startsWith("SOS_")) {
      const parts = advertisedName.split('_');
      // Expecting SOS_Name_Lat_Lon, so 4 parts
      if (parts.length === 4) {
        const victimName = parts[1].replace(/_/g, ' '); // Restore spaces for display
        const lat = parseFloat(parts[2]);
        const lon = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lon) && victimName) {
          return { victimName, lat, lon };
        }
      } else if (parts.length === 3) { // Fallback for SOS_Lat_Lon if name is missing or structure is old
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { victimName: "Unknown", lat, lon };
        }
      }
    }
    return { victimName: undefined, lat: undefined, lon: undefined };
  };
  
  const startScan = async () => {
    setStatus("scanning");
    setError(null);
    setDetectedSignals([]); 
    onSignalsDetected([]); 

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth API is not supported by your browser.");
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot scan for signals.", variant: "destructive" });
      return;
    }

    toast({ title: "Scanning Started", description: "Looking for SOS signals (simulated)..." });

    const totalScanTime = 5000; 
    
    const scanTimeoutId = setTimeout(() => {
      if (Math.random() > 0.3) { 
        // Mock signals now include a name component
        const mockAdvertisedNames = [
          "SOS_AliceSmith_34.0522_-118.2437",
          "SOS_BobRay_34.0580_-118.2500",
          "Generic Bluetooth Device", // This one won't be parsed as SOS
          "SOS_Carol_34.0111_-118.1122",
        ];

        const newSignals: DetectedSignal[] = mockAdvertisedNames
          .map((advName, index) => {
            const parsed = parseSignalName(advName);
            if (parsed.victimName && parsed.lat !== undefined && parsed.lon !== undefined) {
              return {
                id: `device${index + 1}`,
                advertisedName: advName,
                name: parsed.victimName, // Parsed victim name
                lat: parsed.lat,
                lon: parsed.lon,
                rssi: -50 - Math.floor(Math.random() * 30), // Random RSSI
                timestamp: Date.now(),
                status: "Pending",
              };
            }
            return null; 
          })
          .filter((signal): signal is DetectedSignal => signal !== null); 

        finishScan(newSignals);
      } else {
        finishScan([]); 
      }
    }, totalScanTime);
  };

  const finishScan = (foundSignals: DetectedSignal[]) => {
    setStatus("idle");
    setDetectedSignals(foundSignals);
    onSignalsDetected(foundSignals);

    if (foundSignals.length === 0 && status !== "error" && status !== "unsupported") {
         toast({ title: "Scan Complete", description: "No SOS signals detected in this scan." });
    } else if (foundSignals.length > 0) {
        toast({ title: "Scan Complete", description: `${foundSignals.length} SOS signal(s) detected.` });
    }
  }

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
          Scan for nearby SOS signals (simulated) broadcast by victims. Signal format: SOS_Name_Lat_Lon.
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

        {/* RadarAnimation was here */}
        
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
                    <p className="font-semibold text-sm text-foreground">Victim: {signal.name}</p>
                    {signal.lat && signal.lon && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> LAT: {signal.lat}, LON: {signal.lon}
                      </p>
                    )}
                     <div className="flex items-center gap-1.5 text-xs mt-0.5">
                        {getSignalStrengthIcon(signal.rssi)}
                        <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi} dBm)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Raw Signal: {signal.advertisedName}</p>
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
            <p className="text-muted-foreground text-sm text-center py-4">No SOS signals detected yet. Start a scan.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}

    
