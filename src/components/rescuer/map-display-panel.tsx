
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
          setRescuerLocation({ lat: 34.0500, lon: -118.2500 }); // Default/fallback location
        }
      );
    } else {
       // Fallback if geolocation is not supported
       setRescuerLocation({ lat: 34.0500, lon: -118.2500 });
    }
  }, []);

  const openGoogleMapsDirections = (victimLat: number, victimLon: number) => {
    if (rescuerLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Fallback if rescuer location is not available
      const url = `https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLon}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      console.warn("Rescuer location not available, opening victim location directly.");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Map className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Incident Map
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Visual overview of detected SOS signals and your current location. Click pins or buttons for directions.
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
            className="pointer-events-none"
          />
          {rescuerLocation && (
            <div
              className="absolute flex flex-col items-center text-blue-600"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              title={`Your Location: LAT ${rescuerLocation.lat}, LON ${rescuerLocation.lon}`}
            >
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 fill-blue-600" />
              <span className="text-xs bg-white/70 px-1 rounded">You</span>
            </div>
          )}
          {signals.map((signal, index) => {
            if (signal.lat && signal.lon) {
              // Basic distribution logic for pins on placeholder map
              const xOffset = (index % 3) * 20 - 20; // Spread pins horizontally
              const yOffset = Math.floor(index / 3) * 20 - 20; // Spread pins vertically

              return (
                 <div
                  key={signal.id}
                  role="button"
                  tabIndex={0}
                  className="absolute z-20 flex flex-col items-center text-red-500 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                  style={{
                    top: `${40 + yOffset}%`, 
                    left: `${30 + xOffset}%`, 
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={`Victim: ${signal.name} (LAT ${signal.lat}, LON ${signal.lon}) - Click for directions`}
                  onClick={() => {
                    console.log('SOS Pin clicked:', signal.name, signal.lat, signal.lon); // Diagnostic log
                    if (signal.lat && signal.lon) {
                     openGoogleMapsDirections(signal.lat, signal.lon);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault(); 
                      if (signal.lat && signal.lon) {
                        openGoogleMapsDirections(signal.lat, signal.lon);
                      }
                    }
                  }}
                >
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 fill-red-500" />
                  <span className="text-xs bg-white/70 px-1 rounded">SOS</span>
                </div>
              )
            }
            return null;
          })}
        </div>
        <div className="mt-3 sm:mt-4 space-y-1.5">
          {rescuerLocation && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className='font-semibold text-foreground'>Your Location:</span> LAT {rescuerLocation.lat}, LON {rescuerLocation.lon}
            </p>
          )}
          {signals.length > 0 ? (
            signals.filter(s => s.lat && s.lon).length > 0 ? (
              signals.map(s => s.lat && s.lon && (
                <div key={s.id} className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground border-b pb-1 mb-1">
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
                      className="ml-2 text-xs h-7 sm:h-8"
                    >
                      <Navigation className="mr-1 h-3 w-3" />
                      Directions
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No geolocated SOS signals to display on map.</p>
            )
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">No SOS signals detected to display on map.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
