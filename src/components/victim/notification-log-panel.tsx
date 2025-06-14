
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks, Copy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
}

export function NotificationLogPanel() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);

  useEffect(() => {
    const handleNewLog = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (typeof customEvent.detail === 'string') {
        setLogs(prevLogs => [
          {
            id: logIdCounter.current++,
            timestamp: new Date(),
            message: customEvent.detail,
          },
          ...prevLogs,
        ]);
      }
    };

    window.addEventListener('newAppLog', handleNewLog);

    return () => {
      window.removeEventListener('newAppLog', handleNewLog);
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount.

  const handleCopyLog = () => {
    if (logs.length === 0) {
      toast({ title: "Log Empty", description: "There is no activity to copy.", variant: "default" });
      return;
    }

    // When copying, reverse the logs so the oldest is first in the copied text.
    let logString = "Notification & Activity Log:\n\n";
    [...logs].reverse().forEach(log => {
      logString += `${format(log.timestamp, 'PPpp')} - ${log.message}\n`;
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
          Tracks SOS activations, connectivity changes, and other important events. Timestamps are based on your device's local time.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        {logs.length > 0 ? (
          <ScrollArea className="h-48 sm:h-60 w-full rounded-md border p-2 sm:p-3 bg-muted/20">
            <ul className="space-y-2">
              {logs.map((log) => ( // Renders logs as they are in the array (newest first due to prepend)
                <li key={log.id} className="text-xs border-b border-dashed pb-1.5 last:border-b-0">
                  <p className="font-medium text-foreground">
                    <span className="text-primary">{format(log.timestamp, 'PPpp')}</span> - {log.message}
                  </p>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity logged yet.
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
