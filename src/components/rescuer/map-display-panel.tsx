
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Navigation, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { DetectedSignal, MassAlert } from '@/types/signals'; // Added MassAlert
import { format } from 'date-fns';

interface MapDisplayPanelProps {
  signals: DetectedSignal[];
}

const DEFAULT_LAT = 34.0522;
const DEFAULT_LON = -118.2437;
const DEFAULT_ZOOM_BOX_SIZE = 0.1;
const EARTH_RADIUS_METERS = 6371000;
const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions';

// Helper to convert radius in meters to approximate latitude/longitude degree offsets
const getDegreeOffsets = (radiusMeters: number, centerLat: number) => {
  const latRadians = centerLat * (Math.PI / 180);
  const latOffsetDegrees = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const lonOffsetDegrees = (radiusMeters / (EARTH_RADIUS_METERS * Math.cos(latRadians))) * (180 / Math.PI);
  return { latOffsetDegrees, lonOffsetDegrees };
};

export function MapDisplayPanel({ signals }: MapDisplayPanelProps) {
  const [rescuerLocation, setRescuerLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [activeMassAlerts, setActiveMassAlerts] = useState<MassAlert[]>([]);
  const [mapUrl, setMapUrl] = useState<string>('');

  const loadMassAlerts = useCallback(() => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      if (storedAlertsRaw) {
        const parsedAlerts = JSON.parse(storedAlertsRaw) as MassAlert[];
        setActiveMassAlerts(parsedAlerts.sort((a,b) => b.timestamp - a.timestamp));
      } else {
        setActiveMassAlerts([]);
      }
    } catch (error) {
      console.error("MapDisplay: Failed to load mass alerts:", error);
      setActiveMassAlerts([]);
    }
  }, []);

  useEffect(() => {
    loadMassAlerts();
    window.addEventListener('massAlertsUpdated', loadMassAlerts);
    return () => {
      window.removeEventListener('massAlertsUpdated', loadMassAlerts);
    };
  }, [loadMassAlerts]);


  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: parseFloat(position.coords.latitude.toFixed(4)),
            lon: parseFloat(position.coords.longitude.toFixed(4)),
          };
          setRescuerLocation(newLoc);
           window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Map Display: Rescuer location obtained: LAT ${newLoc.lat}, LON ${newLoc.lon}` }));
        },
        () => {
          console.warn("MapDisplay: Could not get rescuer location.");
          window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Map Display: Could not get rescuer location." }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
       console.warn("MapDisplay: Geolocation is not supported by this browser.");
       window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Map Display: Geolocation not supported by browser." }));
    }
  }, []);

  useEffect(() => {
    let allLats: number[] = [];
    let allLons: number[] = [];
    let markerParams: string[] = [];

    if (rescuerLocation) {
      allLats.push(rescuerLocation.lat);
      allLons.push(rescuerLocation.lon);
      markerParams.push(`marker=${rescuerLocation.lat},${rescuerLocation.lon}`);
    }

    signals.forEach(s => {
      if (s.lat !== undefined && s.lon !== undefined) {
        allLats.push(s.lat);
        allLons.push(s.lon);
        markerParams.push(`marker=${s.lat},${s.lon}`);
      }
    });
    
    activeMassAlerts.forEach(alert => {
      // Add alert center for bounding box calculation
      allLats.push(alert.lat);
      allLons.push(alert.lon);
      // markerParams.push(`marker=${alert.lat},${alert.lon}`); // Optional: mark alert centers too

      // Add alert boundaries for bounding box calculation
      const { latOffsetDegrees, lonOffsetDegrees } = getDegreeOffsets(alert.radius, alert.lat);
      allLats.push(alert.lat - latOffsetDegrees, alert.lat + latOffsetDegrees);
      allLons.push(alert.lon - lonOffsetDegrees, alert.lon + lonOffsetDegrees);
    });

    let bboxStr: string;

    if (allLats.length > 0 && allLons.length > 0) {
      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLon = Math.min(...allLons);
      const maxLon = Math.max(...allLons);

      const latRange = maxLat - minLat;
      const lonRange = maxLon - minLon;
      
      // Add padding: 20% of range, or default if range is zero
      const latPadding = latRange * 0.2 || DEFAULT_ZOOM_BOX_SIZE / 2;
      const lonPadding = lonRange * 0.2 || DEFAULT_ZOOM_BOX_SIZE / 2;

      const finalMinLon = (minLon - lonPadding).toFixed(5);
      const finalMinLat = (minLat - latPadding).toFixed(5);
      const finalMaxLon = (maxLon + lonPadding).toFixed(5);
      const finalMaxLat = (maxLat + latPadding).toFixed(5);
      
      bboxStr = `${finalMinLon},${finalMinLat},${finalMaxLon},${finalMaxLat}`;

    } else {
      // Default view if no points
      const defaultMinLon = (DEFAULT_LON - DEFAULT_ZOOM_BOX_SIZE).toFixed(5);
      const defaultMinLat = (DEFAULT_LAT - DEFAULT_ZOOM_BOX_SIZE).toFixed(5);
      const defaultMaxLon = (DEFAULT_LON + DEFAULT_ZOOM_BOX_SIZE).toFixed(5);
      const defaultMaxLat = (DEFAULT_LAT + DEFAULT_ZOOM_BOX_SIZE).toFixed(5);
      bboxStr = `${defaultMinLon},${defaultMinLat},${defaultMaxLon},${defaultMaxLat}`;
    }
    
    const markersQuery = markerParams.join('&');
    const baseUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bboxStr}&layer=mapnik`;
    
    setMapUrl(markersQuery ? `${baseUrl}&${markersQuery}` : baseUrl);

  }, [signals, rescuerLocation, activeMassAlerts]);

  const openGoogleMapsDirections = (victimLat: number, victimLon: number, victimName?: string) => {
    if (rescuerLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${rescuerLocation.lat},${rescuerLocation.lon}&destination=${victimLat},${victimLon}&travelmode=driving`;
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Map Display: Opening Google Maps directions for ${victimName || 'victim'} from ${rescuerLocation.lat},${rescuerLocation.lon} to ${victimLat},${victimLon}.` }));
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${victimLat},${victimLon}`;
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Map Display: Opening Google Maps for ${victimName || 'victim'} at ${victimLat},${victimLon} (rescuer location unavailable).` }));
      window.open(url, '_blank', 'noopener,noreferrer');
      console.warn("MapDisplay: Rescuer location not available, opening victim location directly.");
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
          Live map of rescuer, victims, and active alert areas. Markers for rescuer/victims are blue. Alert areas are framed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-muted rounded-md overflow-hidden border">
          {mapUrl ? (
            <iframe
              key={mapUrl} // Re-render iframe when URL changes
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
              <p className="text-muted-foreground">Loading map data...</p>
            </div>
          )}
        </div>
        <div className="mt-3 sm:mt-4 space-y-2">
          {rescuerLocation && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className='font-semibold text-foreground'>Your Location (Blue Pin):</span> LAT {rescuerLocation.lat}, LON {rescuerLocation.lon} (Approx.)
            </p>
          )}

          {signals.length > 0 && signals.filter(s => s.lat && s.lon).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Victim Signals (Blue Pins):</h4>
              {signals.map(s => s.lat && s.lon && (
                <div key={s.id} className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground border-b pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                  <div>
                    <span className='font-semibold text-destructive'>Victim: {s.name}</span>
                    <br />
                    <span className="text-xs">LAT {s.lat}, LON {s.lon} (Signal: {s.advertisedName || 'N/A'})</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openGoogleMapsDirections(s.lat!, s.lon!, s.name)}
                    className="ml-2 text-xs h-7 sm:h-8"
                  >
                    <Navigation className="mr-1 h-3 w-3" />
                    Directions
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {activeMassAlerts.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <h4 className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-orange-500"/>
                Active Area Alerts (Framed on Map):
              </h4>
              {activeMassAlerts.map(alert => (
                <div key={alert.id} className="text-xs text-muted-foreground border-b pb-1 mb-1 last:border-b-0 last:pb-0 last:mb-0">
                  <p><span className="font-medium text-foreground">Center:</span> LAT {alert.lat}, LON {alert.lon}</p>
                  <p><span className="font-medium text-foreground">Radius:</span> {alert.radius}m</p>
                  {alert.message && <p><span className="font-medium text-foreground">Message:</span> "{alert.message}"</p>}
                  <p><span className="font-medium text-foreground">Created:</span> {format(new Date(alert.timestamp), 'PPp')}</p>
                </div>
              ))}
            </div>
          )}

          {(signals.filter(s => s.lat && s.lon).length === 0 && activeMassAlerts.length === 0) && (
             <p className="text-xs sm:text-sm text-muted-foreground">No geolocated SOS signals or active area alerts to display on map.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
    
