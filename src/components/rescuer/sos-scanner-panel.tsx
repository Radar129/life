
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, WifiOff, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { RadarAnimation } from '@/components/rescuer/radar-animation'; // Import the new radar animation
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {DetectedSignal as BaseDetectedSignal} from '@/types/signals';


interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
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
  // const [scanProgress, setScanProgress] = useState(0); // Kept for potential future use, but radar replaces visual progress
  const { toast } = useToast();

  const parseSignalName = (name: string): { lat: number | undefined, lon: number | undefined } => {
    if (name.startsWith("SOS_")) {
      const parts = name.split('_');
      if (parts.length === 3) {
        const lat = parseFloat(parts[1]);
        const lon = parseFloat(parts[2]);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { lat, lon };
        }
      }
    }
    return { lat: undefined, lon: undefined };
  };
  
  const startScan = async () => {
    setStatus("scanning");
    setError(null);
    setDetectedSignals([]); 
    onSignalsDetected([]); 
    // setScanProgress(0);

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth API is not supported by your browser.");
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot scan for signals.", variant: "destructive" });
      return;
    }

    toast({ title: "Scanning Started", description: "Looking for SOS signals... (Simulated)" });

    // Simulate scan duration
    const totalScanTime = 5000; 
    // let currentTime = 0;
    // const intervalTime = 100;


    // const intervalId = setInterval(() => {
    //   currentTime += intervalTime;
    //   setScanProgress((currentTime / totalScanTime) * 100);
    //   if (currentTime >= totalScanTime) {
    //     clearInterval(intervalId);
    //     // finishScan([]); // Pass empty array if no devices found during timeout - handled by main timeout
    //   }
    // }, intervalTime);

    // Simulate finding devices after some time, or timeout
    const scanTimeoutId = setTimeout(() => {
      // clearInterval(intervalId); // Stop progress if it was running

      // Decide if signals are found or not for simulation
      if (Math.random() > 0.3) { // 70% chance to find signals
        const newSignalsRaw: Omit<DetectedSignal, 'status'>[] = [
          { id: "device1", name: "SOS_34.0522_-118.2437", rssi: -55, ...parseSignalName("SOS_34.0522_-118.2437"), timestamp: Date.now() },
          { id: "device2", name: "SOS_34.0580_-118.2500", rssi: -70, ...parseSignalName("SOS_34.0580_-118.2500"), timestamp: Date.now() },
          { id: "device3", name: "Generic Bluetooth Device", rssi: -85, timestamp: Date.now() },
        ];
        const filteredSignals = newSignalsRaw
          .filter(s => s.name.startsWith("SOS_"))
          .map(s => ({ ...s, status: "Pending" }));
        finishScan(filteredSignals);
      } else {
        finishScan([]); // No signals found
      }
    }, totalScanTime);

    // It's good practice to clear timeouts if the component unmounts or scan is restarted
    // This would typically be in a useEffect cleanup, but for simplicity here,
    // if startScan could be called multiple times rapidly, old timeouts should be cleared.
    // However, the button is disabled during scan, so this is less of an issue.
  };

  const finishScan = (foundSignals: DetectedSignal[]) => {
    setStatus("idle");
    // setScanProgress(100);
    setDetectedSignals(foundSignals);
    onSignalsDetected(foundSignals);
    // setTimeout(() => setScanProgress(0), 1000);

    if (foundSignals.length === 0 && status !== "error" && status !== "unsupported") {
         toast({ title: "Scan Complete", description: "No SOS signals detected in this simulated scan." });
    } else if (foundSignals.length > 0) {
        toast({ title: "Scan Complete", description: `${foundSignals.length} SOS signal(s) detected. (Simulated)` });
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
          Scan for nearby SOS signals broadcast by victims. (This is a simulation)
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

        {status === "scanning" && <RadarAnimation />}
        
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
                    <p className="font-semibold text-sm text-foreground">{signal.name}</p>
                    {signal.lat && signal.lon && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> LAT: {signal.lat}, LON: {signal.lon}
                      </p>
                    )}
                     <div className="flex items-center gap-1.5 text-xs mt-0.5">
                        {getSignalStrengthIcon(signal.rssi)}
                        <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi} dBm)</span>
                      </div>
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
