
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
import { AlertTriangle, Megaphone } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AreaAlertManagerDialog } from '@/components/rescuer/area-alert-manager-dialog'; // Import the new dialog

export function FloatingSOSButton() {
  const router = useRouter();
  const pathname = usePathname();
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false); // State for the new manager dialog

  const handleOpenAlertManager = () => {
    setIsConfirmationDialogOpen(false); // Close confirmation dialog
    setIsManagerDialogOpen(true);     // Open manager dialog
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Floating SOS Button: Confirmed, opening Area Alert Manager." }));
  };

  const handleCancelConfirmation = () => {
    setIsConfirmationDialogOpen(false);
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Floating SOS Button: Area Alert Manager action cancelled." }));
  }

  // Button is only visible on the /rescuer page
  const isVisible = pathname === '/rescuer';

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <AlertDialog open={isConfirmationDialogOpen} onOpenChange={setIsConfirmationDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="lg"
            className="fixed bottom-24 right-6 sm:bottom-28 sm:right-8 z-50 rounded-full shadow-xl p-0 h-16 w-16 bg-destructive hover:bg-destructive/90 text-destructive-foreground flex flex-col items-center justify-center"
            aria-label="Area SOS Alert Manager Button"
            onClick={() => window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: "Floating SOS Button: Clicked to open Area Alert Manager confirmation." }))}
          >
            <AlertTriangle className="h-6 w-6" />
            <span className="text-xs font-bold mt-0.5">SOS</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Megaphone className="text-primary h-5 w-5" />
              Area SOS Alert Manager
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will open the Area SOS Alert Manager. Here you can define alert zones by location and radius. Alerts created can automatically activate SOS for users within the specified area.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirmation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleOpenAlertManager}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Open Alert Manager
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AreaAlertManagerDialog isOpen={isManagerDialogOpen} onOpenChange={setIsManagerDialogOpen} />
    </>
  );
}
