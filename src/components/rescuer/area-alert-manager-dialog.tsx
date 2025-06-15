
"use client";

import { useState, useEffect } from 'react';
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, MapPin, CircleDot, MessageSquareText, AlertTriangle as AlertTriangleForm, ListChecks, Trash2, Megaphone, Info, BookText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { MassAlert } from '@/types/signals';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions';
const DEFAULT_MAP_ZOOM_BOX_SIZE_DEGREES = 0.05; 
const EARTH_RADIUS_KM = 6371;


const massAlertSchema = z.object({
  lat: z.coerce.number().min(-90, "Invalid Latitude (must be between -90 and 90)").max(90, "Invalid Latitude (must be between -90 and 90)"),
  lon: z.coerce.number().min(-180, "Invalid Longitude (must be between -180 and 180)").max(180, "Invalid Longitude (must be between -180 and 180)"),
  radius: z.coerce.number().min(1, "Radius must be at least 1 meter.").max(50000, "Radius cannot exceed 50km (50,000m)."),
  message: z.string().max(200, "Message too long (max 200 characters).").optional(),
  adminRegionName: z.string().max(100, "Region name too long (max 100 characters).").optional(),
});

type MassAlertFormValues = z.infer<typeof massAlertSchema>;

interface AreaAlertManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AreaAlertManagerDialog({ isOpen, onOpenChange }: AreaAlertManagerDialogProps) {
  const { toast } = useToast();
  const [activeMassAlerts, setActiveMassAlerts] = useState<MassAlert[]>([]);
  const [mapUrl, setMapUrl] = useState<string>('https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik');

  const form = useForm<MassAlertFormValues>({
    resolver: zodResolver(massAlertSchema),
    defaultValues: {
      lat: undefined,
      lon: undefined,
      radius: 1000, 
      message: "",
      adminRegionName: "",
    },
  });
  const { isSubmitting } = form.formState; 
  const watchedLat = form.watch('lat');
  const watchedLon = form.watch('lon');
  const watchedRadius = form.watch('radius');

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
      lat: data.lat,
      lon: data.lon,
      radius: data.radius,
      message: data.message || undefined,
      adminRegionName: data.adminRegionName || undefined,
      timestamp: Date.now(),
    };

    try {
      const currentAlerts = [...activeMassAlerts];
      currentAlerts.unshift(newAlert); 
      localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(currentAlerts));
      setActiveMassAlerts(currentAlerts.sort((a, b) => b.timestamp - a.timestamp));
      toast({
        title: "Area Alert Created",
        description: `Alert active for LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m. ${data.adminRegionName ? 'Region: ' + data.adminRegionName : ''}`,
      });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Created alert ID ${newAlert.id} for LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m. ${data.adminRegionName ? 'Region: ' + data.adminRegionName : ''} Message: "${data.message || 'None'}"` }));
      form.reset({ lat: undefined, lon: undefined, radius: 1000, message: "", adminRegionName: ""}); 
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
    toast({ title: "Area Alert Stopped", description: `Alert ID ${alertId} has been deactivated.` });
    if (alertToStop) {
         window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Stopped alert ID ${alertId} (LAT ${alertToStop.lat}, LON ${alertToStop.lon}, Radius ${alertToStop.radius}m).` }));
    } else {
         window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert Manager: Stopped alert ID ${alertId}.` }));
    }
    window.dispatchEvent(new CustomEvent('massAlertsUpdated'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 h-[90vh] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 border-b sticky top-0 bg-background z-10">
          <DialogTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Area SOS Alert Manager
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Define geographical zones by manually entering GPS coordinates (Latitude, Longitude) and a radius. The map will adjust its view to the specified area and display a marker at the center point. Specifying an "Administrative Region" is for informational context for other rescuers; actual alerting uses coordinates/radius. Alerts are stored locally.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateAlert)} className="space-y-3 border p-3 sm:p-4 rounded-md bg-card shadow">
              <h3 className="text-base font-medium text-foreground mb-2">Create New Area Alert</h3>
              
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
              <p className="text-xs text-muted-foreground mt-1">e.g., Urban: 500-1000m, Rural: 5000-10000m+.</p>
              </FormItem>)} />

              <FormField control={form.control} name="adminRegionName" render={({ field }) => (<FormItem><FormLabel htmlFor="adminRegionName" className="text-xs flex items-center gap-1"><BookText className="w-3 h-3"/>Administrative Region (Optional)</FormLabel><FormControl><Input id="adminRegionName" placeholder="e.g., Los Angeles County, Downtown District" {...field} className="text-sm h-9" /></FormControl><FormMessage /><p className="text-xs text-muted-foreground mt-1">For informational context (e.g., city, state).</p></FormItem>)} />
              
              <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel htmlFor="message" className="text-xs flex items-center gap-1"><MessageSquareText className="w-3 h-3"/>Alert Message (Optional)</FormLabel><FormControl><Textarea id="message" placeholder="e.g., Evacuate area due to fire." {...field} className="text-sm min-h-[50px]" /></FormControl><FormMessage /><p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/200</p></FormItem>)} />
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
                          <p className="font-medium text-foreground">LAT: {alert.lat}, LON: {alert.lon}, Radius: {alert.radius}m</p>
                          {alert.adminRegionName && <p className="text-muted-foreground">Region: {alert.adminRegionName}</p>}
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
        <DialogFooter className="p-4 sticky bottom-0 flex flex-row items-center justify-end space-x-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    

    





    





