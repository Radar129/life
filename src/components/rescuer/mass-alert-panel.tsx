
"use client";

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Megaphone, MapPin, CircleDot, MessageSquareText, AlertTriangle, Trash2, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { MassAlert } from '@/types/signals';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const MASS_ALERT_DEFINITIONS_KEY = 'massAlertDefinitions';

const massAlertSchema = z.object({
  lat: z.coerce.number().min(-90, "Invalid Latitude").max(90, "Invalid Latitude"),
  lon: z.coerce.number().min(-180, "Invalid Longitude").max(180, "Invalid Longitude"),
  radius: z.coerce.number().min(1, "Radius must be at least 1 meter").max(50000, "Radius cannot exceed 50km"), // Max 50km
  message: z.string().max(200, "Message too long (max 200 chars)").optional(),
});

type MassAlertFormValues = z.infer<typeof massAlertSchema>;

export function MassAlertPanel() {
  const [activeAlerts, setActiveAlerts] = useState<MassAlert[]>([]);
  const { toast } = useToast();

  const form = useForm<MassAlertFormValues>({
    resolver: zodResolver(massAlertSchema),
    defaultValues: {
      lat: undefined,
      lon: undefined,
      radius: 1000, // Default 1km
      message: "",
    },
  });

  useEffect(() => {
    loadActiveAlerts();
    // Listen for storage changes to update if another tab modifies alerts
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === MASS_ALERT_DEFINITIONS_KEY) {
      loadActiveAlerts();
    }
  };

  const loadActiveAlerts = () => {
    try {
      const storedAlertsRaw = localStorage.getItem(MASS_ALERT_DEFINITIONS_KEY);
      if (storedAlertsRaw) {
        const storedAlerts = JSON.parse(storedAlertsRaw) as MassAlert[];
        setActiveAlerts(storedAlerts.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setActiveAlerts([]);
      }
    } catch (error) {
      console.error("Failed to load mass alerts from localStorage:", error);
      setActiveAlerts([]);
    }
  };

  const onSubmit: SubmitHandler<MassAlertFormValues> = async (data) => {
    const newAlert: MassAlert = {
      id: `massalert_${Date.now()}`,
      lat: data.lat,
      lon: data.lon,
      radius: data.radius,
      message: data.message || undefined,
      timestamp: Date.now(),
    };

    try {
      const currentAlerts = [...activeAlerts];
      currentAlerts.unshift(newAlert); // Add to the beginning for chronological display (newest first)
      localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(currentAlerts));
      setActiveAlerts(currentAlerts.sort((a, b) => b.timestamp - a.timestamp));
      toast({
        title: "Area Alert Created",
        description: `Alert active for LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m.`,
      });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Created for LAT ${data.lat}, LON ${data.lon}, Radius ${data.radius}m. ID: ${newAlert.id}` }));
      form.reset(); // Reset form after successful submission
    } catch (e) {
      toast({
        title: "Error Creating Alert",
        description: "Could not save the area alert. LocalStorage might be full or unavailable.",
        variant: "destructive",
      });
      window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Error creating alert - LocalStorage issue.` }));
    }
  };

  const handleStopAlert = (alertId: string) => {
    const alertToStop = activeAlerts.find(a => a.id === alertId);
    const updatedAlerts = activeAlerts.filter(alert => alert.id !== alertId);
    localStorage.setItem(MASS_ALERT_DEFINITIONS_KEY, JSON.stringify(updatedAlerts));
    setActiveAlerts(updatedAlerts);
    toast({
      title: "Area Alert Stopped",
      description: `Alert ID ${alertId} has been deactivated.`,
    });
    if (alertToStop) {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Stopped alert ID ${alertId} (LAT ${alertToStop.lat}, LON ${alertToStop.lon}, Radius ${alertToStop.radius}m).` }));
    } else {
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Mass Alert: Stopped alert ID ${alertId}.` }));
    }
  };
  
  const { isSubmitting } = form.formState;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Area SOS Alert Manager
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Define an area to centrally activate SOS for all R.A.D.A.R users within it. Alerts are stored locally.
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="lat" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>Latitude <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input id="lat" type="number" step="any" placeholder="e.g., 34.0522" {...field} className="text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="lon" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3"/>Longitude <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input id="lon" type="number" step="any" placeholder="e.g., -118.2437" {...field} className="text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="radius"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="radius" className="text-xs flex items-center gap-1"><CircleDot className="w-3 h-3"/>Radius (meters) <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input id="radius" type="number" placeholder="e.g., 1000 (for 1km)" {...field} className="text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="message" className="text-xs flex items-center gap-1"><MessageSquareText className="w-3 h-3"/>Alert Message (Optional)</FormLabel>
                  <FormControl><Textarea id="message" placeholder="e.g., Evacuate area due to fire." {...field} className="text-sm min-h-[60px]" /></FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/200</p>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t p-4">
            <Button type="submit" disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
              Create Area Alert
            </Button>
          </CardFooter>
        </form>
      </Form>

      {activeAlerts.length > 0 && (
        <div className="border-t p-4 space-y-3">
          <h3 className="text-base font-headline font-semibold text-primary flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Active Area Alerts ({activeAlerts.length})
          </h3>
          <ScrollArea className="h-40 w-full rounded-md border">
            <ul className="p-2 space-y-2">
              {activeAlerts.map(alert => (
                <li key={alert.id} className="p-2 border-b last:border-b-0 bg-muted/20 rounded-md text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-foreground">LAT: {alert.lat}, LON: {alert.lon}, Radius: {alert.radius}m</p>
                      {alert.message && <p className="text-muted-foreground italic mt-0.5">"{alert.message}"</p>}
                      <p className="text-muted-foreground text-xs mt-0.5">Created: {format(new Date(alert.timestamp), 'PPpp')}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleStopAlert(alert.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Stop
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
