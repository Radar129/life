
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Dummy log entries for now
const dummyLogs = [
  { id: 1, timestamp: new Date(Date.now() - 5 * 60000), message: "SOS Activated. Location: 34.05N, 118.24W." },
  { id: 2, timestamp: new Date(Date.now() - 4 * 60000), message: "Connectivity Change: Wi-Fi disconnected." },
  { id: 3, timestamp: new Date(Date.now() - 3 * 60000), message: "Battery Alert: Low (15%)." },
  { id: 4, timestamp: new Date(Date.now() - 2 * 60000), message: "Emergency contact 'John Doe' notified (simulated)." },
  { id: 5, timestamp: new Date(Date.now() - 1 * 60000), message: "SOS Signal Rebroadcast." },
];


export function NotificationLogPanel() {
  // In a real app, logs would be fetched from localStorage or a state management solution
  const logs = dummyLogs; // Using dummy logs for prototype

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
          <ListChecks className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Notification & Activity Log
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Tracks SOS activations, connectivity changes, and other important events. (Currently displaying placeholder data)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        {logs.length > 0 ? (
          <ScrollArea className="h-48 sm:h-60 w-full rounded-md border p-2 sm:p-3 bg-muted/20">
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="text-xs border-b border-dashed pb-1.5 last:border-b-0">
                  <p className="font-medium text-foreground">
                    <span className="text-primary">{log.timestamp.toLocaleTimeString()}</span> - {log.message}
                  </p>
                  <p className="text-muted-foreground text-[0.7rem] pl-1">
                    {log.timestamp.toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No activity logged yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
