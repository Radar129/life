
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, MapPin, CircleDot, MessageSquareText, AlertTriangle as AlertTriangleForm, ListChecks, Trash2, Megaphone, Info, BookText, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { MassAlert, DetectedSignal, VictimBasicInfo, PersistedSOSState } from '@/types/signals';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, calculateDistance } from "@/lib/utils";


const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions';
const LOCAL_STORAGE_VICTIM_SOS_STATE_KEY = 'persistedR.A.D.A.R.SOSState';
const LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY = 'currentR.A.D.A.R.SOSSignal';
const DEFAULT_MAP_ZOOM_BOX_SIZE_DEGREES = 0.05;
const EARTH_RADIUS_KM = 6371;

interface NominatimSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

const massAlertSchema = z.object({
  adminRegionName: z.string().optional(),
  lat: z.coerce.number().min(-90, "Invalid Latitude (must be between -90 and 90)").max(90, "Invalid Latitude (must be between -90 and 90)"),
  lon: z.coerce.number().min(-180, "Invalid Longitude (must be between -180 and 180)").max(180, "Invalid Longitude (must be between -180 and 180)"),
  radius: z.coerce.number().min(1, "Radius must be at least 1 meter.").max(50000, "Radius cannot exceed 50km (50,000m)."),
  message: z.string().max(200, "Message too long (max 200 characters).").optional(),
});

type MassAlertFormValues = z.infer<typeof massAlertSchema>;

interface AreaAlertManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const fetchNominatimSuggestions = async (query: string): Promise<NominatimSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'R.A.D.A.R-App/1.0 (LifeApp@example.com)',
      },
    });
    if (!response.ok) {
      console.error('Nominatim API error:', response.statusText);
      return [];
    }
    const data = await response.json();
    return data as NominatimSuggestion[];
  } catch (error) {
    console.error('Failed to fetch Nominatim suggestions:', error);
    return [];
  }
};


export function AreaAlertManagerDialog({ isOpen, onOpenChange }: AreaAlertManagerDialogProps) {
  const { toast } = useToast();
  const [activeMassAlerts, setActiveMassAlerts] = useState<MassAlert[]>([]);
  const [mapUrl, setMapUrl] = useState<string>('https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik');
  
  const [regionSearchTerm, setRegionSearchTerm] = useState('');
  const [regionSuggestions, setRegionSuggestions] = useState<NominatimSuggestion[]>([]);
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);


  const form = useForm<MassAlertFormValues>({
    resolver: zodResolver(massAlertSchema),
    defaultValues: {
      adminRegionName: "",
      lat: undefined,
      lon: undefined,
      radius: 1000,
      message: "",
    },
  });
  const { isSubmitting } = form.formState;
  const watchedLat = form.watch('lat');
  const watchedLon = form.watch('lon');
  const watchedRadius = form.watch('radius');

  useEffect(() => {
    const handler = setTimeout(() => {
      if (regionSearchTerm.length > 1) {
        fetchNominatimSuggestions(regionSearchTerm).then(setRegionSuggestions);
      } else {
        setRegionSuggestions([]);
      }
    }, 500); 

    return () => {
      clearTimeout(handler);
    };
  }, [regionSearchTerm]);

  const loadActiveMassAlerts = () => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      if (storedAlertsRaw) {
        const storedAlerts = JSON.parse(storedAlertsRaw) as MassAlert[];
        setActiveMassAlerts(storedAlerts.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setActiveMassAlerts([]);
      }
    } catch (error) {
      console.error("Failed to load mass alerts from localStorage:", error);
      setActiveMassAlerts([]);
      toast({ title: "Error Loading Alerts", description: "Could not load existing area alerts.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActiveMassAlerts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const lat = watchedLat;
    const lon = watchedLon;
    const radiusMeters = watchedRadius;

    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
      let bboxArray: [number, number, number, number];

      if (typeof radiusMeters === 'number' && radiusMeters > 0 && !isNaN(radiusMeters)) {
        const latRadians = lat * (Math.PI / 180);
        const radiusKm = radiusMeters / 1000;

        const latOffsetDegrees = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
        const lonOffsetDegrees = (radiusKm / (EARTH_RADIUS_KM * Math.cos(latRadians))) * (180 / Math.PI);

        const paddingFactor = 1.2;

        bboxArray = [
          lon - lonOffsetDegrees * paddingFactor,
          lat - latOffsetDegrees * paddingFactor,
          lon + lonOffsetDegrees * paddingFactor,
          lat + latOffsetDegrees * paddingFactor,
        ];
      } else {
        bboxArray = [
          lon - DEFAULT_MAP_ZOOM_BOX_SIZE_DEGREES / 2,
          lat - DEFAULT_MAP_ZOOM_BOX_SIZE_DEGREES / 2,
          lon + DEFAULT_MAP_ZOOM_BOX_SIZE_DEGREES / 2,
          lat + DEFAULT_MAP_ZOOM_BOX_SIZE_DEGREES / 2,
        ];
      }

      const bbox = bboxArray.map(coord => parseFloat(coord.toFixed(5))).join(',');
      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`);
    } else {
      setMapUrl('https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik');
    }
  }, [watchedLat, watchedLon, watchedRadius]);


  const handleCreateAlert: SubmitHandler<MassAlertFormValues> = async (data) => {
    const newAlert: MassAlert = {
      id: `massalert_${Date.now()}`,
      adminRegionName: data.adminRegionName || undefined,
      lat: data.lat,
      lon: data.lon,
      radius: data.radius,
      message: data.message || undefined,
      timestamp: Date.now(),
    };

    try {
        const position = await new Promise<{ coords: GeolocationCoordinates }>((resolve, reject) => 
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
        );
        const rescuerLat = parseFloat(position.coords.latitude.toFixed(4));
        const rescuerLon = parseFloat(position.coords.longitude.toFixed(4));

        const distance = calculateDistance(rescuerLat, rescuerLon, newAlert.lat, newAlert.lon);

        if (distance <= newAlert.radius) {
            const existingVictimSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
            let isAlreadyActive = false;
            if (existingVictimSOSStateRaw) {
                const existingState = JSON.parse(existingVictimSOSStateRaw) as PersistedSOSState;
                if (existingState.isActive) {
                    isAlreadyActive = true;
                }
            }

            if (!isAlreadyActive) {
                const victimBasicInfoRaw = localStorage.getItem('victimBasicInfo');
                let victimName = "RescuerDevice"; 
                let baseCustomSosMessage = "Emergency! Rescuer device in self-created alert zone.";

                if (victimBasicInfoRaw) {
                    try {
                        const parsedInfo = JSON.parse(victimBasicInfoRaw) as VictimBasicInfo;
                        if (parsedInfo.name) victimName = parsedInfo.name.replace(/\s+/g, '_').substring(0, 20);
                    } catch (e) { /* use defaults */ }
                }
                
                const advertisedName = `SOS_${victimName}_${rescuerLat}_${rescuerLon}`;
                const effectiveSosMessage = newAlert.message || baseCustomSosMessage;

                const signalDataForSharedStorage: DetectedSignal = {
                    id: 'local_sos_signal', 
                    advertisedName: advertisedName,
                    name: victimName.replace(/_/g, ' '),
                    lat: rescuerLat,
                    lon: rescuerLon,
                    rssi: -55, 
                    timestamp: Date.now(),
                    status: 'Active (Local)', 
                };
                localStorage.setItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY, JSON.stringify(signalDataForSharedStorage));

                const victimSOSState: PersistedSOSState = {
                    isActive: true,
                    location: { lat: rescuerLat, lon: rescuerLon },
                    victimNameForSignal: victimName,
                    advertisedName,
                    customSosMessage: effectiveSosMessage, 
                    activationTimestamp: Date.now(),
                    activationSource: "central",
                    triggeringCentralAlertId: newAlert.id,
                };
                localStorage.setItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY, JSON.stringify(victimSOSState));

                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Rescuer's own device is within the newly created alert. Activating local SOS as ${advertisedName}. Alert Msg: "${effectiveSosMessage}"` }));
                    window.dispatchEvent(new CustomEvent('localSOSStateChangedByExternal'));
                }, 0);
                toast({
                    title: "Local SOS Activated",
                    description: `Your device is within the area alert. Message: "${effectiveSosMessage}"`,
                    variant: "default" 
                });
            } else {
                 window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Rescuer's device is within new alert zone, but SOS is already active.` }));
            }
        }
    } catch (geoErr) {
        console.warn("Could not get rescuer location for self-activation check:", geoErr);
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Could not get current location to check if rescuer is in the new alert zone. Error: ${ (geoErr as Error).message }` }));
    }

    try {
      const currentAlerts = [...activeMassAlerts];
      currentAlerts.unshift(newAlert); 
      localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(currentAlerts));
      setActiveMassAlerts(currentAlerts.sort((a, b) => b.timestamp - a.timestamp)); 
      toast({
        title: "Area Alert Created",
        description: `Alert active for ${data.adminRegionName ? data.adminRegionName + ' - ' : ''}LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m.`,
      });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Created alert ID ${newAlert.id} for ${data.adminRegionName ? data.adminRegionName + ' - ' : ''}LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m. Message: "${data.message || 'None'}"` }));
      form.reset({ adminRegionName: "", lat: undefined, lon: undefined, radius: 1000, message: ""});
      setRegionSearchTerm(""); 
      setRegionSuggestions([]); 
      window.dispatchEvent(new CustomEvent('massAlertsUpdated')); 
    } catch (e) {
      toast({ title: "Error Creating Alert", description: "Could not save the area alert. LocalStorage might be full.", variant: "destructive" });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Error creating alert - LocalStorage issue.` }));
    }
  };

  const handleStopAlert = (alertId: string) => {
    const alertToStop = activeMassAlerts.find(a => a.id === alertId);
    const updatedAlerts = activeMassAlerts.filter(alert => alert.id !== alertId);
    localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(updatedAlerts));
    setActiveMassAlerts(updatedAlerts);

    if (alertToStop) {
      toast({ title: "Area Alert Stopped", description: `Alert for ${alertToStop.adminRegionName || `ID ${alertToStop.id}`} has been deactivated.` });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Stopped alert ID ${alertId} (${alertToStop.adminRegionName ? alertToStop.adminRegionName + ' - ' : ''}LAT ${alertToStop.lat}, LON ${alertToStop.lon}, Radius ${alertToStop.radius}m).` }));

      const persistedSOSStateRaw = localStorage.getItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
      if (persistedSOSStateRaw) {
        try {
          const persistedSOSState = JSON.parse(persistedSOSStateRaw) as PersistedSOSState;
          if (
            persistedSOSState.isActive &&
            persistedSOSState.activationSource === 'central' &&
            persistedSOSState.triggeringCentralAlertId === alertId
          ) {
            localStorage.removeItem(LOCAL_STORAGE_VICTIM_SOS_STATE_KEY);
            localStorage.removeItem(LOCAL_STORAGE_SHARED_SOS_SIGNAL_KEY);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('localSOSStateChangedByExternal'));
                window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Local SOS on rescuer device deactivated because triggering alert ID ${alertId} was stopped.` }));
            },0);
            toast({ title: "Local SOS Deactivated", description: "Your device's SOS was stopped as its triggering area alert ended.", variant: "default" });
          }
        } catch (e) {
          console.error("Error processing persisted SOS state during alert stop:", e);
           window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Error processing persisted SOS state for alert stop ID ${alertId}. Error: ${(e as Error).message}` }));
        }
      }
    } else {
      toast({ title: "Area Alert Stopped", description: `Alert ID ${alertId} has been deactivated.` });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Stopped alert ID ${alertId} (alert details not found in current list).` }));
    }
    window.dispatchEvent(new CustomEvent('massAlertsUpdated'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Area SOS Alert Manager
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Define geographical zones. Alerts can trigger SOS for users (including this device) within the zone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateAlert)} className="space-y-3 border p-3 sm:p-4 rounded-md bg-card shadow">
              <h3 className="text-base font-medium text-foreground mb-2">Create New Area Alert</h3>
              
              <FormField
                control={form.control}
                name="adminRegionName"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel htmlFor="adminRegionName-input" className="text-xs flex items-center gap-1">
                      <BookText className="w-3 h-3"/>Administrative Region
                    </FormLabel>
                    <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                           <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={regionPopoverOpen}
                            className="w-full justify-between text-sm h-9 font-normal"
                          >
                            <span className="truncate max-w-[calc(100%-2rem)]">
                              {field.value || regionSearchTerm || "Type any administrative region..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput
                            id="adminRegionName-input"
                            placeholder="Type any administrative region..."
                            value={regionSearchTerm}
                            onValueChange={setRegionSearchTerm}
                            className="h-9"
                          />
                          <CommandList>
                            {regionSuggestions.length > 0 ? (
                              regionSuggestions.map((suggestion) => (
                                <CommandItem
                                  key={suggestion.place_id}
                                  value={suggestion.display_name}
                                  onSelect={(currentValue) => {
                                    const valToSet = currentValue === regionSearchTerm.toLowerCase() ? regionSearchTerm : currentValue;
                                    form.setValue("adminRegionName", valToSet , { shouldValidate: true, shouldDirty: true });
                                    setRegionSearchTerm(valToSet);
                                    setRegionSuggestions([]);
                                    setRegionPopoverOpen(false);
                                    if (suggestion.lat && suggestion.lon && (!form.getValues('lat') || !form.getValues('lon'))) {
                                        form.setValue('lat', parseFloat(suggestion.lat), {shouldDirty: true});
                                        form.setValue('lon', parseFloat(suggestion.lon), {shouldDirty: true});
                                        toast({title: "Coordinates Updated", description: `Lat/Lon updated from region selection: ${suggestion.display_name.substring(0, 50)}...`});
                                    }
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", (field.value === suggestion.display_name || regionSearchTerm === suggestion.display_name) ? "opacity-100" : "opacity-0")}/>
                                  {suggestion.display_name}
                                </CommandItem>
                              ))
                            ) : (
                              regionSearchTerm.length > 1 && <CommandEmpty>No region found.</CommandEmpty>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs text-muted-foreground mt-1">
                     Enter region for context. Suggestions by OpenStreetMap. Auto-fills Lat/Lon if empty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField control={form.control} name="lat" render={({ field }) => (<FormItem><FormLabel htmlFor="lat" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>Latitude <span className="text-destructive">*</span></FormLabel><FormControl><Input id="lat" type="number" step="any" placeholder="e.g., 34.0522" {...field} className="text-sm h-9" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="lon" render={({ field }) => (<FormItem><FormLabel htmlFor="lon" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>Longitude <span className="text-destructive">*</span></FormLabel><FormControl><Input id="lon" type="number" step="any" placeholder="e.g., -118.2437" {...field} className="text-sm h-9" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>

              <div className="my-3 border rounded-md overflow-hidden aspect-video bg-muted">
                <iframe
                  key={mapUrl}
                  width="100%"
                  height="100%"
                  src={mapUrl}
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Alert Location Preview"
                ></iframe>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 -mt-2 mb-2">
                <Info className="w-3.5 h-3.5"/> Map shows the entered center point and adjusts view to the approximate area. Interactive selection/radius drawing not supported.
              </p>

              <FormField control={form.control} name="radius" render={({ field }) => (<FormItem><FormLabel htmlFor="radius" className="text-xs flex items-center gap-1"><CircleDot className="w-3 h-3"/>Radius (meters) <span className="text-destructive">*</span></FormLabel><FormControl><Input id="radius" type="number" placeholder="e.g., 1000 (for 1km)" {...field} className="text-sm h-9" value={field.value ?? ''}/></FormControl><FormMessage />
              <FormDescription className="text-xs text-muted-foreground mt-1">e.g., Urban: 500-1000m, Rural: 5000-10000m+.</FormDescription>
              </FormItem>)} />

              <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel htmlFor="message" className="text-xs flex items-center gap-1"><MessageSquareText className="w-3 h-3"/>Alert Message</FormLabel><FormControl><Textarea id="message" placeholder="e.g., Evacuate area due to fire." {...field} className="text-sm min-h-[50px]" /></FormControl><FormMessage /><p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/200</p></FormItem>)} />
              <Button type="submit" disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm w-full h-9">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangleForm className="mr-2 h-4 w-4" />} Create Area Alert
              </Button>
            </form>
          </Form>

          {activeMassAlerts.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-base font-medium text-primary flex items-center gap-2"><ListChecks className="w-4 h-4" /> Active Area Alerts ({activeMassAlerts.length})</h3>
              <ScrollArea className="h-40 sm:h-48 w-full rounded-md border">
                <ul className="p-2 space-y-2">
                  {activeMassAlerts.map(alert => (
                    <li key={alert.id} className="p-2 border-b last:border-b-0 bg-muted/20 rounded-md text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">
                            {alert.adminRegionName ? `${alert.adminRegionName} - ` : ''}
                            LAT: {alert.lat}, LON: {alert.lon}, Radius: {alert.radius}m
                          </p>
                          {alert.message && <p className="text-muted-foreground italic mt-0.5">Message: "{alert.message}"</p>}
                          <p className="text-muted-foreground text-xs mt-0.5">Created: {format(new Date(alert.timestamp), 'PPpp')}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleStopAlert(alert.id)} className="text-destructive hover:text-destructive h-7 px-2">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Stop
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
           {activeMassAlerts.length === 0 && (
             <p className="text-sm text-muted-foreground text-center py-4">No active area alerts.</p>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

