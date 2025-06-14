
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
}

export function NotificationLogPanel() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isClientLoaded, setIsClientLoaded] = useState(false);

  useEffect(() => {
    // Generate logs on the client side after mount to avoid hydration mismatch
    const generatedLogs: LogEntry[] = [
      { id: 1, timestamp: new Date(Date.now() - 5 * 60000), message: "SOS Activated. Location: 34.05N, 118.24W." },
      { id: 2, timestamp: new Date(Date.now() - 4 * 60000), message: "Connectivity Change: Wi-Fi disconnected." },
      { id: 3, timestamp: new Date(Date.now() - 3 * 60000), message: "Battery Alert: Low (15%)." },
      { id: 4, timestamp: new Date(Date.now() - 2 * 60000), message: "Emergency contact 'John Doe' notified." },
      { id: 5, timestamp: new Date(Date.now() - 1 * 60000), message: "SOS Signal Rebroadcast." },
    ];
    setLogs(generatedLogs);
    setIsClientLoaded(true); // Signal that client-side specific logic has run
  }, []);


  const handleCopyLog = () => {
    if (logs.length === 0) {
      toast({ title: "Log Empty", description: "There is no activity to copy.", variant: "default" });
      return;
    }

    let logString = "Notification & Activity Log:\n\n";
    logs.forEach(log => {
      logString += `${log.timestamp.toLocaleString()} - ${log.message}\n`;
    });

    navigator.clipboard.writeText(logString.trim())
      .then(() => {
        toast({ title: "Log Copied", description: "The activity log has been copied to the clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy log: ", err);
        toast({ title: "Copy Failed", description: "Could not copy the log to clipboard.", variant: "destructive" });
      });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
          <ListChecks className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Notification & Activity Log
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Tracks SOS activations, connectivity changes, and other important events.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        {isClientLoaded && logs.length > 0 ? (
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
          <p className="text-sm text-muted-foreground text-center py-4">
            {!isClientLoaded ? '(Loading logs...)' : 'No activity logged yet.'}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end p-4 border-t">
        <Button onClick={handleCopyLog} variant="outline" size="sm" className="text-sm">
          <Copy className="mr-2 h-4 w-4" /> Copy Log
        </Button>
      </CardFooter>
    </Card>
  );
}

