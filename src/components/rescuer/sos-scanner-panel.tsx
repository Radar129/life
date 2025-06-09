"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list'; // Assuming a simple list component or use divs
import { Bluetooth, Search, WifiOff, Loader2, SignalHigh, SignalMedium, SignalLow, MapPin } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface DetectedSignal {
  id: string;
  name: string;
  rssi: number;
  lat?: number;
  lon?: number;
  timestamp: number;
}

type ScanStatus = "idle" | "scanning" | "error" | "unsupported";

// Simple List & ListItem components (can be moved to ui if reused)
const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
);


export function SOSScannerPanel({ onSignalsDetected }: { onSignalsDetected: (signals: DetectedSignal[]) => void }) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
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
    setSignals([]);
    onSignalsDetected([]);
    setScanProgress(0);

    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth API is not supported by your browser.");
      toast({ title: "Bluetooth Error", description: "Web Bluetooth not supported. Cannot scan for signals.", variant: "destructive" });
      return;
    }

    toast({ title: "Scanning Started", description: "Looking for SOS signals... (Simulated)" });

    // Simulate scanning process
    const totalScanTime = 5000; // 5 seconds
    const intervalTime = 100;
    let currentTime = 0;

    const intervalId = setInterval(() => {
      currentTime += intervalTime;
      setScanProgress((currentTime / totalScanTime) * 100);
      if (currentTime >= totalScanTime) {
        clearInterval(intervalId);
        finishScan();
      }
    }, intervalTime);

    // Simulate finding devices
    // This would be navigator.bluetooth.requestLEScan() in a real scenario
    setTimeout(() => {
      const newSignals: DetectedSignal[] = [
        { id: "device1", name: "SOS_34.0522_-118.2437", rssi: -55, ...parseSignalName("SOS_34.0522_-118.2437"), timestamp: Date.now() },
        { id: "device2", name: "SOS_34.0580_-118.2500", rssi: -70, ...parseSignalName("SOS_34.0580_-118.2500"), timestamp: Date.now() },
        { id: "device3", name: "Generic Bluetooth Device", rssi: -85, timestamp: Date.now() }, // Non-SOS signal
      ];
      setSignals(newSignals.filter(s => s.name.startsWith("SOS_")));
      onSignalsDetected(newSignals.filter(s => s.name.startsWith("SOS_")));
    }, 2500); // Simulate finding devices halfway through the scan
  };

  const finishScan = () => {
    setStatus("idle");
    setScanProgress(100);
    setTimeout(() => setScanProgress(0), 1000); // Reset progress bar after a bit
    if (signals.length === 0 && status !== "error" && status !== "unsupported") {
         toast({ title: "Scan Complete", description: "No SOS signals detected in this simulated scan." });
    } else if (signals.length > 0) {
        toast({ title: "Scan Complete", description: `${signals.length} SOS signal(s) detected. (Simulated)` });
    }
  }

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
        {status === "error" && (
          <div className="text-destructive flex items-center gap-2 p-4 bg-destructive/10 rounded-md">
            <AlertTriangle className="w-6 h-6" /> 
            <p>{error || "An error occurred during scanning."}</p>
          </div>
        )}

        {signals.length > 0 ? (
          <ul className="space-y-2 border rounded-md max-h-60 overflow-y-auto">
            {signals.map((signal) => (
              <ListItemWrapper key={signal.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-foreground">{signal.name}</p>
                    {signal.lat && signal.lon && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> LAT: {signal.lat}, LON: {signal.lon}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {getSignalStrengthIcon(signal.rssi)}
                    <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi} dBm)</span>
                  </div>
                </div>
              </ListItemWrapper>
            ))}
          </ul>
        ) : (
          status !== "scanning" && status !== "unsupported" && status !== "error" && (
            <p className="text-muted-foreground text-center py-4">No SOS signals detected yet. Start a scan.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}
