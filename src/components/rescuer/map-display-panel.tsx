
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Navigation } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Signal {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  advertisedName?: string;
}

interface MapDisplayPanelProps {
  signals: Signal[];
}

// Default coordinates (e.g., Los Angeles) for when no specific location is available
const DEFAULT_LAT = 34.0522;
const DEFAULT_LON = -118.2437;
const DEFAULT_ZOOM_BOX_SIZE = 0.1; // For bounding box when only one point or default is shown

export function MapDisplayPanel({ signals }: MapDisplayPanelProps) {
  const [rescuerLocation, setRescuerLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [mapUrl, setMapUrl] = useState<string>('');

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
          console.warn("Could not get rescuer location. Using default for map centering if needed.");
          // Rescuer location remains null, map will center based on victims or default
        }
      );
    } else {
       console.warn("Geolocation is not supported by this browser.");
    }
  }, []);

  useEffect(() => {
    const firstVictimWithLocation = signals.find(s => s.lat !== undefined && s.lon !== undefined);

    let bbox: [number, number, number, number] | null = null; // minLon, minLat, maxLon, maxLat
    let markerLat: number | null = null;
    let markerLon: number | null = null;

    if (firstVictimWithLocation && firstVictimWithLocation.lat && firstVictimWithLocation.lon) {
      markerLat = firstVictimWithLocation.lat;
      markerLon = firstVictimWithLocation.lon;

      if (rescuerLocation) {
        const lats = [firstVictimWithLocation.lat, rescuerLocation.lat];
        const lons = [firstVictimWithLocation.lon, rescuerLocation.lon];
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        // Add some padding to the bounding box
        const latPadding = (maxLat - minLat) * 0.2 || DEFAULT_ZOOM_BOX_SIZE / 2;
        const lonPadding = (maxLon - minLon) * 0.2 || DEFAULT_ZOOM_BOX_SIZE / 2;
        bbox = [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding];
      } else {
        // Only victim location
        bbox = [
          firstVictimWithLocation.lon - DEFAULT_ZOOM_BOX_SIZE / 2,
          firstVictimWithLocation.lat - DEFAULT_ZOOM_BOX_SIZE / 2,
          firstVictimWithLocation.lon + DEFAULT_ZOOM_BOX_SIZE / 2,
          firstVictimWithLocation.lat + DEFAULT_ZOOM_BOX_SIZE / 2,
        ];
      }
    } else if (rescuerLocation) {
      // Only rescuer location
      bbox = [
        rescuerLocation.lon - DEFAULT_ZOOM_BOX_SIZE / 2,
        rescuerLocation.lat - DEFAULT_ZOOM_BOX_SIZE / 2,
        rescuerLocation.lon + DEFAULT_ZOOM_BOX_SIZE / 2,
        rescuerLocation.lat + DEFAULT_ZOOM_BOX_SIZE / 2,
      ];
    } else {
      // Default view
      bbox = [
        DEFAULT_LON - DEFAULT_ZOOM_BOX_SIZE,
        DEFAULT_LAT - DEFAULT_ZOOM_BOX_SIZE,
        DEFAULT_LON + DEFAULT_ZOOM_BOX_SIZE,
        DEFAULT_LAT + DEFAULT_ZOOM_BOX_SIZE,
      ];
    }
    
    let url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.join(',')}&layer=mapnik`;
    if (markerLat !== null && markerLon !== null) {
      url += `&marker=${markerLat},${markerLon}`;
    }
    setMapUrl(url);

  }, [signals, rescuerLocation]);

  const openGoogleMapsDirections = (victimLat: number, victimLon: number) => {
    if (rescuerLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
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
          Live map view of detected SOS signals. Click signal details below for directions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-muted rounded-md overflow-hidden border">
          {mapUrl ? (
            <iframe
              width="100%"
              height="100%"
              src={mapUrl}
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Incident Map"
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          )}
        </div>
        <div className="mt-3 sm:mt-4 space-y-1.5">
          {rescuerLocation && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className='font-semibold text-foreground'>Your Location:</span> LAT {rescuerLocation.lat}, LON {rescuerLocation.lon} (Approx.)
            </p>
          )}
          {signals.length > 0 ? (
            signals.filter(s => s.lat && s.lon).length > 0 ? (
              signals.map(s => s.lat && s.lon && (
                <div key={s.id} className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground border-b pb-1 mb-1">
                  <div>
                    <span className='font-semibold text-destructive'>Victim:</span> {s.name}
                    <br />
                    <span className="text-xs">LAT {s.lat}, LON {s.lon} (Signal: {s.advertisedName || 'N/A'})</span>
                  </div>
                  { (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openGoogleMapsDirections(s.lat!, s.lon!)}
                      className="ml-2 text-xs h-7 sm:h-8"
                      disabled={!s.lat || !s.lon}
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
    
