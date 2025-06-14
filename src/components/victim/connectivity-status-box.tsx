
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Bluetooth, Router as HotspotIcon, MapPin, LocateFixed, Battery, BatteryCharging, PowerOff, Clock, ShieldQuestion, Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator'; // Added import

interface ConnectivityState {
  signalStrength: number; // 0-4 bars
  bluetoothOn: boolean;
  wifiConnected: boolean;
  wifiNetworkName?: string;
  hotspotOn: boolean;
  gpsCoords?: { lat: number; lon: number };
  locationServicesOn: boolean;
  batteryLevel?: number; // 0-100
  batteryCharging?: boolean;
  lastLocationUpdate?: Date;
}

export function ConnectivityStatusBox() {
  const [status, setStatus] = useState<ConnectivityState>({
    signalStrength: 3, // Mocked
    bluetoothOn: true, // Mocked
    wifiConnected: true, // Mocked
    wifiNetworkName: "HomeNet_5G", // Mocked
    hotspotOn: false, // Mocked
    locationServicesOn: false, // Will be updated
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStatus(prev => ({
            ...prev,
            gpsCoords: {
              lat: parseFloat(position.coords.latitude.toFixed(4)),
              lon: parseFloat(position.coords.longitude.toFixed(4)),
            },
            locationServicesOn: true,
            lastLocationUpdate: new Date(),
          }));
        },
        (err) => {
          console.warn("Geolocation error:", err.message);
          setError("Location access denied or unavailable. Some features may be limited.");
          setStatus(prev => ({ ...prev, locationServicesOn: false, gpsCoords: undefined, lastLocationUpdate: new Date() }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setStatus(prev => ({ ...prev, locationServicesOn: false, gpsCoords: undefined, lastLocationUpdate: new Date() }));
      setError("Geolocation is not supported by this browser.");
    }

    // Fetch Battery Status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryStatus = () => {
          setStatus(prev => ({
            ...prev,
            batteryLevel: Math.floor(battery.level * 100),
            batteryCharging: battery.charging,
          }));
        };
        updateBatteryStatus();
        battery.addEventListener('chargingchange', updateBatteryStatus);
        battery.addEventListener('levelchange', updateBatteryStatus);
        return () => {
          battery.removeEventListener('chargingchange', updateBatteryStatus);
          battery.removeEventListener('levelchange', updateBatteryStatus);
        };
      }).catch((err: any) => {
        console.warn("Battery API error:", err.message);
        setStatus(prev => ({...prev, batteryLevel: undefined, batteryCharging: undefined}));
      });
    } else {
         setStatus(prev => ({...prev, batteryLevel: 75, batteryCharging: Math.random() > 0.5})); // Mock if API not available
    }
    
    // Simulate other connectivity updates
    const intervalId = setInterval(() => {
        setStatus(prev => ({
            ...prev,
            signalStrength: Math.floor(Math.random() * 5), // 0-4
            // bluetoothOn: Math.random() > 0.3, // More likely on
            // wifiConnected: Math.random() > 0.5,
            // wifiNetworkName: prev.wifiConnected ? (Math.random() > 0.5 ? "CafeWifi" : "PublicHotspot") : undefined,
            // hotspotOn: Math.random() > 0.8, // Less likely on
        }));
    }, 15000); // Update every 15 seconds

    return () => clearInterval(intervalId);

  }, []);

  const getSignalIcon = (strength: number) => {
    if (strength >= 4) return <SignalHigh className="w-4 h-4 text-green-500" />;
    if (strength >= 3) return <Signal className="w-4 h-4 text-yellow-500" />;
    if (strength >= 1) return <SignalMedium className="w-4 h-4 text-orange-500" />;
    return <SignalLow className="w-4 h-4 text-destructive" />;
  };
  
  const formatTimeAgo = (date?: Date): string => {
    if (!date) return "N/A";
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
          <ShieldQuestion className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Device Connectivity Status
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Real-time overview of your device's critical systems. (Some values are simulated)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-3 sm:pt-4 text-sm">
        {error && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatusItem icon={getSignalIcon(status.signalStrength)} label="Signal" value={`${status.signalStrength}/4 bars`} />
          <StatusItem icon={<Bluetooth className={`w-4 h-4 ${status.bluetoothOn ? 'text-blue-500' : 'text-muted-foreground'}`} />} label="Bluetooth" value={status.bluetoothOn ? "ON" : "OFF"} />
          <StatusItem icon={<Wifi className={`w-4 h-4 ${status.wifiConnected ? 'text-green-500' : 'text-muted-foreground'}`} />} label="Wi-Fi" value={status.wifiConnected ? (status.wifiNetworkName || "Connected") : "OFF"} />
          <StatusItem icon={<HotspotIcon className={`w-4 h-4 ${status.hotspotOn ? 'text-orange-500' : 'text-muted-foreground'}`} />} label="Hotspot" value={status.hotspotOn ? "ON" : "OFF"} />
          <StatusItem icon={<LocateFixed className={`w-4 h-4 ${status.locationServicesOn ? 'text-green-500' : 'text-destructive'}`} />} label="Location Svcs" value={status.locationServicesOn ? "ON" : "OFF"} />
           {status.batteryLevel !== undefined ? (
            <StatusItem 
              icon={status.batteryCharging ? <BatteryCharging className="w-4 h-4 text-green-500" /> : <Battery className="w-4 h-4 text-primary" />} 
              label="Battery" 
              value={`${status.batteryLevel}% ${status.batteryCharging ? '(Charging)' : ''}`}
            >
              <Progress value={status.batteryLevel} className="h-1.5 mt-0.5" />
            </StatusItem>
          ) : (
            <StatusItem icon={<PowerOff className="w-4 h-4 text-muted-foreground" />} label="Battery" value="N/A" />
          )}
        </div>
        
        <Separator className="my-2" />
        
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground">GPS Coordinates:</span>
                <span className="text-muted-foreground">
                {status.gpsCoords ? `LAT ${status.gpsCoords.lat}, LON ${status.gpsCoords.lon}` : "Unavailable"}
                </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="font-medium text-foreground">Last Location Update:</span>
                <span className="text-muted-foreground">{formatTimeAgo(status.lastLocationUpdate)}</span>
            </div>
        </div>
        <p className="text-xs text-muted-foreground pt-2 text-center">Connectivity data helps rescuers find you faster.</p>
      </CardContent>
    </Card>
  );
}

const StatusItem = ({ icon, label, value, children }: { icon: React.ReactNode, label: string, value: string, children?: React.ReactNode }) => (
  <div className="p-2 bg-muted/30 rounded-md text-xs">
    <div className="flex items-center gap-1.5 mb-0.5">
      {icon}
      <span className="font-medium text-foreground">{label}:</span>
    </div>
    <p className="text-muted-foreground ml-[calc(1rem+0.375rem)] break-words">{value}</p> {/* 1rem for icon, 0.375rem for gap */}
    {children && <div className="ml-[calc(1rem+0.375rem)]">{children}</div>}
  </div>
);
