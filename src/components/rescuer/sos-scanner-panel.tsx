
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

type ScanStatus = "idle" | "scanning" | "error" | "simulating";

const ListItemWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <li className={`p-2 sm:p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${className}`}>{children}</li>
);

const VICTIM_STATUSES = ["Pending", "Located", "Assistance In Progress", "Rescued", "No Response"];

// Mock data for simulation
const MOCK_SOS_SIGNALS: Omit<DetectedSignal, 'id' | 'timestamp' | 'status' | 'rssi'>[] = [
  { name: "Alice Smith", advertisedName: "SOS_AliceSmith_34.0522_-118.2437", lat: 34.0522, lon: -118.2437 },
  { name: "Bob Ray", advertisedName: "SOS_BobRay_34.0580_-118.2500", lat: 34.0580, lon: -118.2500 },
  { name: "Carol Day", advertisedName: "SOS_CarolDay_34.0111_-118.1122", lat: 34.0111, lon: -118.1122 },
  { name: "David Lee", advertisedName: "SOS_DavidLee_33.9988_-118.3000", lat: 33.9988, lon: -118.3000 },
];
let mockSignalCounter = 0;

interface SOSScannerPanelProps {
  onSignalsDetected: (signals: DetectedSignal[]) => void;
  detectedSignals: DetectedSignal[];
  setDetectedSignals: React.Dispatch<React.SetStateAction<DetectedSignal[]>>;
}

export function SOSScannerPanel({ onSignalsDetected, detectedSignals, setDetectedSignals }: SOSScannerPanelProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [error, setError] = useState<string | null>(null); // Kept for potential future real scan attempts
  const { toast } = useToast();

  const parseSignalName = (advertisedName: string | undefined): { victimName: string | undefined, lat: number | undefined, lon: number | undefined } => {
    if (advertisedName && advertisedName.startsWith("SOS_")) {
      const parts = advertisedName.split('_');
      if (parts.length === 4) { // SOS_Name_Lat_Lon
        const victimName = parts[1].replace(/_/g, ' '); 
        const lat = parseFloat(parts[2]);
        const lon = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lon) && victimName) {
          return { victimName, lat, lon };
        }
      } else if (parts.length === 3) { // SOS_Lat_Lon (name missing or couldn't be parsed)
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
    setStatus("simulating"); // Changed from "scanning" to "simulating"
    setError(null);
    
    // Simulate discovering a new signal
    toast({ title: "Scan Initiated (Simulation)", description: "Simulating discovery of nearby SOS signals..." });

    setTimeout(() => { // Simulate a delay for scanning
      const mockBaseSignal = MOCK_SOS_SIGNALS[mockSignalCounter % MOCK_SOS_SIGNALS.length];
      mockSignalCounter++;

      const parsed = parseSignalName(mockBaseSignal.advertisedName);
      const simulatedRssi = -50 - Math.floor(Math.random() * 30); // Random RSSI between -50 and -80

      const newSignal: DetectedSignal = {
        id: `sim_${Date.now()}_${mockBaseSignal.advertisedName}`, // Unique ID for simulated signal
        advertisedName: mockBaseSignal.advertisedName,
        name: parsed.victimName || mockBaseSignal.name || "Unknown Simulated Device",
        lat: parsed.lat,
        lon: parsed.lon,
        rssi: simulatedRssi, 
        timestamp: Date.now(),
        status: "Pending",
      };

      setDetectedSignals(prevSignals => {
        const existingSignalIndex = prevSignals.findIndex(s => s.advertisedName === newSignal.advertisedName);
        let updatedSignals;
        if (existingSignalIndex > -1) {
          // For simulation, let's update RSSI and timestamp if "found" again
          updatedSignals = prevSignals.map(s => 
            s.advertisedName === newSignal.advertisedName ? {...s, rssi: newSignal.rssi, timestamp: newSignal.timestamp} : s
          );
        } else {
          updatedSignals = [...prevSignals, newSignal];
        }
        onSignalsDetected(updatedSignals);
        toast({ title: "Simulated Signal Detected", description: `Found: ${newSignal.name}` });
        return updatedSignals;
      });
      setStatus("idle");
    }, 1500); // Simulate 1.5 second scan time
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
          SOS Signal Scanner (Simulation)
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Simulates scanning for nearby Bluetooth SOS signals. Device names like 'SOS_Name_Lat_Lon' are parsed. Actual Web Bluetooth scanning is limited in browsers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={startScan} disabled={status === "simulating"} className="w-full sm:w-auto mb-4 sm:mb-6 bg-primary hover:bg-primary/90 text-sm">
          {status === "simulating" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {status === "simulating" ? "Simulating Scan..." : "Start New Scan (Simulated)"}
        </Button>
        
        {error && ( // This block might be less relevant if we fully simulate, but kept for structure
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
                        <span>{getProximityText(signal.rssi)} (RSSI: {signal.rssi} dBm - simulated)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {signal.advertisedName && signal.advertisedName !== signal.name ? `Raw Signal: ${signal.advertisedName}` : `ID: ${signal.id}`}
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
            <p className="text-muted-foreground text-sm text-center py-4">No simulated signals detected yet. Start a scan.</p>
          )
        )}
         {status === "idle" && !navigator.bluetooth && (
            <div className="mt-4 text-orange-600 text-xs flex items-center gap-2 p-2 bg-orange-500/10 rounded-md">
                <WifiOff className="w-4 h-4" />
                <span>Note: Web Bluetooth API is not available in your browser. Scanning is fully simulated.</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

