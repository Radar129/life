
"use client";

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, MapPin, Navigation } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

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
          setRescuerLocation({ lat: 34.0500, lon: -118.2500 }); 
        }
      );
    } else {
       setRescuerLocation({ lat: 34.0500, lon: -118.2500 });
    }
  }, []);

  const openGoogleMapsDirections = (victimLat: number, victimLon: number) => {
    if (rescuerLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback if rescuer location is not available (should be rare due to useEffect)
      const url = `https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLon}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      console.warn("Rescuer location not available, opening victim location directly.");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Map className="w-6 h-6 text-primary" />
          Incident Map
        </CardTitle>
        <CardDescription>
          Visual overview of detected SOS signals and your current location. Click pins or buttons for directions. (Map is illustrative)
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
          {rescuerLocation && (
            <div 
              className="absolute flex flex-col items-center text-blue-600"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              title={`Your Location: LAT ${rescuerLocation.lat}, LON ${rescuerLocation.lon}`}
            >
              <MapPin className="w-8 h-8 fill-blue-600" />
              <span className="text-xs bg-white/70 px-1 rounded">You</span>
            </div>
          )}
          {signals.map((signal, index) => {
            if (signal.lat && signal.lon) {
              const xOffset = (index % 3) * 20 - 20; 
              const yOffset = Math.floor(index / 3) * 20 - 20;
              return (
                 <div 
                  key={signal.id} 
                  className="absolute flex flex-col items-center text-red-500 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ 
                    top: `${40 + yOffset}%`, 
                    left: `${30 + xOffset}%`,
                    transform: 'translate(-50%, -50%)' 
                  }}
                  title={`Victim: ${signal.name} (LAT ${signal.lat}, LON ${signal.lon}) - Click for directions`}
                  onClick={() => openGoogleMapsDirections(signal.lat!, signal.lon!)}
                >
                  <MapPin className="w-6 h-6 fill-red-500" />
                  <span className="text-xs bg-white/70 px-1 rounded">SOS</span>
                </div>
              )
            }
            return null;
          })}
        </div>
        <div className="mt-4 space-y-2">
          {rescuerLocation && (
            <p className="text-sm text-muted-foreground">
              <span className='font-semibold text-foreground'>Your Location (Simulated):</span> LAT {rescuerLocation.lat}, LON {rescuerLocation.lon}
            </p>
          )}
          {signals.length > 0 ? (
            signals.map(s => s.lat && s.lon && (
              <div key={s.id} className="flex items-center justify-between text-sm text-muted-foreground border-b pb-1 mb-1">
                <div>
                  <span className='font-semibold text-destructive'>SOS Signal:</span> {s.name}
                  <br />
                  <span className="text-xs">LAT {s.lat}, LON {s.lon}</span>
                </div>
                {rescuerLocation && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => openGoogleMapsDirections(s.lat!, s.lon!)}
                    className="ml-2"
                  >
                    <Navigation className="mr-1 h-3 w-3" />
                    Directions
                  </Button>
                )}
              </div>
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
