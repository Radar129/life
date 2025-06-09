"use client";

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Signal {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
}

interface MapDisplayPanelProps {
  signals: Signal[];
}

export function MapDisplayPanel({ signals }: MapDisplayPanelProps) {
  const [rescuerLocation, setRescuerLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    // Simulate fetching rescuer's GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRescuerLocation({
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lon: parseFloat(position.coords.longitude.toFixed(4)),
          });
        },
        () => {
          console.warn("Could not get rescuer location. Using default.");
          // Fallback or simulated location if permission denied or error
          setRescuerLocation({ lat: 34.0500, lon: -118.2500 }); 
        }
      );
    } else {
      // Fallback for browsers without geolocation
       setRescuerLocation({ lat: 34.0500, lon: -118.2500 });
    }
  }, []);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Map className="w-6 h-6 text-primary" />
          Incident Map
        </CardTitle>
        <CardDescription>
          Visual overview of detected SOS signals and your current location. (Map is illustrative)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-muted rounded-md overflow-hidden border">
          <Image 
            src="https://placehold.co/800x450.png" 
            alt="Map placeholder showing SOS signal locations" 
            layout="fill"
            objectFit="cover"
            data-ai-hint="map rescue"
          />
          {/* Overlay rescuer location */}
          {rescuerLocation && (
            <div 
              className="absolute flex flex-col items-center text-blue-600"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} // Example fixed position for rescuer
              title={`Your Location: LAT ${rescuerLocation.lat}, LON ${rescuerLocation.lon}`}
            >
              <MapPin className="w-8 h-8 fill-blue-600" />
              <span className="text-xs bg-white/70 px-1 rounded">You</span>
            </div>
          )}
          {/* Overlay victim signals - positions would be calculated based on lat/lon relative to map bounds */}
          {signals.map((signal, index) => {
            if (signal.lat && signal.lon) {
              // Super simplified positioning for placeholder.
              // Real implementation would convert lat/lon to pixel coords.
              const xOffset = (index % 3) * 20 - 20; // Spread them out a bit
              const yOffset = Math.floor(index / 3) * 20 - 20;
              return (
                 <div 
                  key={signal.id} 
                  className="absolute flex flex-col items-center text-red-500"
                  style={{ 
                    top: `${40 + yOffset}%`, 
                    left: `${30 + xOffset}%`,
                    transform: 'translate(-50%, -50%)' 
                  }}
                  title={`Victim: ${signal.name} (LAT ${signal.lat}, LON ${signal.lon})`}
                >
                  <MapPin className="w-6 h-6 fill-red-500" />
                  <span className="text-xs bg-white/70 px-1 rounded">SOS</span>
                </div>
              )
            }
            return null;
          })}
        </div>
        <div className="mt-4 space-y-1">
          {rescuerLocation && (
            <p className="text-sm text-muted-foreground">
              <span className='font-semibold text-foreground'>Your Location (Simulated):</span> LAT {rescuerLocation.lat}, LON {rescuerLocation.lon}
            </p>
          )}
          {signals.length > 0 ? (
            signals.map(s => s.lat && s.lon && (
              <p key={s.id} className="text-sm text-muted-foreground">
                <span className='font-semibold text-destructive'>SOS Signal:</span> {s.name} - LAT {s.lat}, LON {s.lon}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No geolocated SOS signals to display on map.</p>
          )}
           <p className="text-xs text-muted-foreground mt-2">
            Map is for illustrative purposes. Trilateration and precise victim locating from Bluetooth signals are advanced features.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
