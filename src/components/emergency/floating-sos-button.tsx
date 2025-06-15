
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Megaphone } from 'lucide-react'; // Added Megaphone
import { usePathname } from 'next/navigation';

export function FloatingSOSButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleActivateSOS = () => {
    router.push('/victim?sos=true');
    setIsDialogOpen(false); // Close dialog after action
    // Log event based on current page context before navigation
    const logEventName = pathname === '/rescuer' ? 'newRescuerAppLog' : 'newAppLog';
    window.dispatchEvent(new CustomEvent(logEventName, { detail: "Floating SOS button: Confirmed and activating SOS." }));
  };

  const handleCancelSOS = () => {
    setIsDialogOpen(false);
    const logEventName = pathname === '/rescuer' ? 'newRescuerAppLog' : 'newAppLog';
    window.dispatchEvent(new CustomEvent(logEventName, { detail: "Floating SOS button: Action cancelled." }));
  }

  // Button is only visible on the /rescuer page
  const isVisible = pathname === '/rescuer';

  if (!isVisible) {
    return null;
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="lg"
          className="fixed bottom-24 right-6 sm:bottom-28 sm:right-8 z-50 rounded-full shadow-xl p-0 h-16 w-16 bg-destructive hover:bg-destructive/90 text-destructive-foreground flex flex-col items-center justify-center"
          aria-label="SOS Button" // Consider updating if functionality changes
        >
          <AlertTriangle className="h-6 w-6" />
          <span className="text-xs font-bold mt-0.5">SOS</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Megaphone className="text-primary h-5 w-5" /> {/* Changed icon and color */}
            Area SOS Alert Manager {/* Changed title */}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {/* Description might need updating for consistency with the new title */}
            This will navigate you to User Mode and immediately activate the SOS distress signal, including location broadcasting and alerts. Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelSOS}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleActivateSOS}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            // Action button text might need updating
          >
            Activate SOS
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

