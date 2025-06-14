
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks, Copy, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface LogEntry {
  id: number;
  timestamp: Date; // Stored as Date object in state
  message: string;
}

interface StoredLogEntry {
  id: number;
  timestamp: string; // Stored as ISO string in localStorage
  message: string;
}

const LOCAL_STORAGE_LOGS_KEY = 'appActivityLogs';

export function NotificationLogPanel() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);


  // Load logs from localStorage on initial mount
  useEffect(() => {
    try {
      const storedLogsRaw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (storedLogsRaw) {
        const storedLogs = JSON.parse(storedLogsRaw) as StoredLogEntry[];
        const loadedLogs: LogEntry[] = storedLogs.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
        setLogs(loadedLogs);
        if (loadedLogs.length > 0) {
          // Set counter to be higher than the max ID found, to avoid collisions
          logIdCounter.current = Math.max(...loadedLogs.map(log => log.id)) + 1;
        }
      }
    } catch (error) {
      console.error("Failed to load logs from localStorage:", error);
      // Optionally clear corrupted storage
      // localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
    }
  }, []);

  useEffect(() => {
    const handleNewLog = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (typeof customEvent.detail === 'string') {
        const newLogEntry: LogEntry = {
          id: logIdCounter.current++,
          timestamp: new Date(),
          message: customEvent.detail,
        };

        setLogs(prevLogs => {
          const updatedLogs = [newLogEntry, ...prevLogs];
          try {
            const logsToStore: StoredLogEntry[] = updatedLogs.map(log => ({
              ...log,
              timestamp: log.timestamp.toISOString(),
            }));
            localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logsToStore));
          } catch (error) {
            console.error("Failed to save logs to localStorage:", error);
            toast({ title: "Log Error", description: "Could not save new log entry to local storage.", variant: "destructive"});
          }
          return updatedLogs;
        });
      }
    };

    window.addEventListener('newAppLog', handleNewLog);

    return () => {
      window.removeEventListener('newAppLog', handleNewLog);
    };
  }, [toast]); // Include toast in dependencies if used within this effect for error handling

  const handleCopyLog = () => {
    if (logs.length === 0) {
      toast({ title: "Log Empty", description: "There is no activity to copy.", variant: "default" });
      return;
    }

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

  const handleClearLog = () => {
    setLogs([]);
    logIdCounter.current = 0;
    try {
      localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
      toast({ title: "Log Cleared", description: "The activity log has been cleared from local storage." });
    } catch (error) {
      console.error("Failed to clear logs from localStorage:", error);
      toast({ title: "Clear Log Error", description: "Could not clear logs from local storage.", variant: "destructive"});
    }
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
          <ListChecks className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Notification & Activity Log
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Tracks SOS activations, connectivity changes, and other important events. Timestamps are based on your device's local time. Logs are stored locally.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-4">
        {logs.length > 0 ? (
          <ScrollArea ref={scrollAreaRef} className="h-48 sm:h-60 w-full rounded-md border p-2 sm:p-3 bg-muted/20">
            <ul className="space-y-2">
              {logs.map((log) => (
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
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 p-4 border-t">
        <Button onClick={handleClearLog} variant="destructive" size="sm" className="text-sm w-full sm:w-auto order-2 sm:order-1">
          <Trash2 className="mr-2 h-4 w-4" /> Clear Log
        </Button>
        <Button onClick={handleCopyLog} variant="outline" size="sm" className="text-sm w-full sm:w-auto order-1 sm:order-2">
          <Copy className="mr-2 h-4 w-4" /> Copy Log
        </Button>
      </CardFooter>
    </Card>
  );
}
