
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, Search, WifiOff, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {DetectedSignal as BaseDetectedSignal} from '@/types/signals'; // Assuming types are defined


interface DetectedSignal extends BaseDetectedSignal {
  status?: string;
}


type ScanStatus = "idle" | "scanning" | "error" | "unsupported";

const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
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
  const [scanProgress, setScanProgress] = useState(0);
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
    setDetectedSignals([]); // Clear previous signals from local state
    onSignalsDetected([]); // Notify parent
    setScanProgress(0);

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth API is not supported by your browser.");
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot scan for signals.", variant: "destructive" });
      return;
    }

    toast({ title: "Scanning Started", description: "Looking for SOS signals... (Simulated)" });

    const totalScanTime = 5000;
    const intervalTime = 100;
    let currentTime = 0;

    const intervalId = setInterval(() => {
      currentTime += intervalTime;
      setScanProgress((currentTime / totalScanTime) * 100);
      if (currentTime >= totalScanTime) {
        clearInterval(intervalId);
        finishScan([]); // Pass empty array if no devices found during timeout
      }
    }, intervalTime);

    // Simulate finding devices
    setTimeout(() => {
      const newSignalsRaw: Omit<DetectedSignal, 'status'>[] = [
        { id: "device1", name: "SOS_34.0522_-118.2437", rssi: -55, ...parseSignalName("SOS_34.0522_-118.2437"), timestamp: Date.now() },
        { id: "device2", name: "SOS_34.0580_-118.2500", rssi: -70, ...parseSignalName("SOS_34.0580_-118.2500"), timestamp: Date.now() },
        { id: "device3", name: "Generic Bluetooth Device", rssi: -85, timestamp: Date.now() },
      ];
      const filteredSignals = newSignalsRaw
        .filter(s => s.name.startsWith("SOS_"))
        .map(s => ({ ...s, status: "Pending" })); // Add default status
      
      clearInterval(intervalId); // Stop progress interval as we found devices
      finishScan(filteredSignals);
    }, 2500);
  };

  const finishScan = (foundSignals: DetectedSignal[]) => {
    setStatus("idle");
    setScanProgress(100);
    setDetectedSignals(foundSignals);
    onSignalsDetected(foundSignals);
    setTimeout(() => setScanProgress(0), 1000);

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
    onSignalsDetected(updatedSignals); // Notify parent if it needs the full updated list
  };


  const getSignalStrengthIcon = (rssi: number) => {
    if (rssi > -60) return <SignalHigh className="w-5 h-5 text-green-500" />;
    if (rssi > -75) return <SignalMedium className="w-5 h-5 text-yellow-500" />;
    return <SignalLow className="w-5 h-5 text-red-500" />;
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
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Bluetooth className="w-6 h-6 text-primary" />
          SOS Signal Scanner
        </CardTitle>
        <CardDescription>
          Scan for nearby SOS signals broadcast by victims. (This is a simulation)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={startScan} disabled={status === "scanning"} className="w-full sm:w-auto mb-6 bg-primary hover:bg-primary/90">
          {status === "scanning" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {status === "scanning" ? "Scanning..." : "Start New Scan"}
        </Button>

        {status === "scanning" && <Progress value={scanProgress} className="mb-4 h-2" />}
        
        {status === "unsupported" && (
          <div className="text-destructive flex items-center gap-2 p-4 bg-destructive/10 rounded-md">
            <WifiOff className="w-6 h-6" /> 
            <p>{error || "Web Bluetooth API not available."}</p>
          </div>
        )}
        {status === "error" && error && (
          <div className="text-destructive flex items-center gap-2 p-4 bg-destructive/10 rounded-md">
            <AlertTriangleIcon className="w-6 h-6" /> 
            <p>{error}</p>
          </div>
        )}

        {detectedSignals.length > 0 ? (
          <ul className="space-y-1 border rounded-md max-h-72 overflow-y-auto">
            {detectedSignals.map((signal) => (
              <ListItemWrapper key={signal.id}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="flex-grow">
                    <p className="font-semibold text-foreground">{signal.name}</p>
                    {signal.lat && signal.lon && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> LAT: {signal.lat}, LON: {signal.lon}
                      </p>
                    )}
                     <div className="flex items-center gap-2 text-xs mt-1">
                        {getSignalStrengthIcon(signal.rssi)}
                        <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi} dBm)</span>
                      </div>
                  </div>
                  <div className="sm:w-48 flex-shrink-0">
                    <Select
                      value={signal.status || "Pending"}
                      onValueChange={(value) => handleStatusChange(signal.id, value)}
                    >
                      <SelectTrigger className="w-full text-xs h-9">
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
          status !== "scanning" && status !== "unsupported" && (!error || status === "error") && (
            <p className="text-muted-foreground text-center py-4">No SOS signals detected yet. Start a scan.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}

// Ensure AlertTriangleIcon is defined if not imported or used locally
// const AlertTriangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
//   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
// );
