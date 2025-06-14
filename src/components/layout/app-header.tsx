
"use client";

import Link from 'next/link';
import { HeartPulse, UserCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BasicInfoForm } from '@/components/victim/basic-info-form';
import { RescuerProfileForm } from '@/components/rescuer/rescuer-profile-form'; // Import RescuerProfileForm
import { useState, useEffect } from 'react';
import type { VictimBasicInfo, RescuerProfileInfo } from '@/types/signals'; // Import RescuerProfileInfo
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname } from 'next/navigation';

const getInitials = (name?: string): string => {
  if (!name) return '';
  const names = name.trim().split(/\s+/);
  if (names.length === 0 || names[0] === "") return '';
  if (names.length === 1) {
    return names[0].substring(0, Math.min(2, names[0].length)).toUpperCase();
  }
  return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
};

export function AppHeader() {
  const [victimInfo, setVictimInfo] = useState<VictimBasicInfo | null>(null);
  const [rescuerInfo, setRescuerInfo] = useState<RescuerProfileInfo | null>(null); // State for rescuer info
  const [isRescuerAuthenticated, setIsRescuerAuthenticated] = useState(false);
  const pathname = usePathname();

  const loadVictimInfo = () => {
    if (typeof window !== 'undefined') {
      const savedVictimInfo = localStorage.getItem('victimBasicInfo');
      if (savedVictimInfo) {
        try {
          setVictimInfo(JSON.parse(savedVictimInfo) as VictimBasicInfo);
        } catch (e) {
          console.error("Failed to parse victim basic info for header", e);
          setVictimInfo(null);
        }
      } else {
        setVictimInfo(null);
      }
    }
  };

  const loadRescuerInfo = () => { // Function to load rescuer info
    if (typeof window !== 'undefined') {
      const savedRescuerInfo = localStorage.getItem('rescuerProfileInfo');
      if (savedRescuerInfo) {
        try {
          setRescuerInfo(JSON.parse(savedRescuerInfo) as RescuerProfileInfo);
        } catch (e) {
          console.error("Failed to parse rescuer profile info for header", e);
          setRescuerInfo(null);
        }
      } else {
        setRescuerInfo(null);
      }
      const authStatus = localStorage.getItem('isRescuerAuthenticated');
      setIsRescuerAuthenticated(authStatus === 'true');
    }
  };

  useEffect(() => {
    loadVictimInfo();
    loadRescuerInfo(); // Load rescuer info on mount

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'victimBasicInfo') {
        loadVictimInfo();
      }
      if (event.key === 'rescuerProfileInfo' || event.key === 'isRescuerAuthenticated') {
        loadRescuerInfo();
      }
    };

    window.addEventListener('victimInfoUpdated', loadVictimInfo);
    window.addEventListener('rescuerInfoUpdated', loadRescuerInfo); // Listen for rescuer info updates
    window.addEventListener('storage', handleStorageChange);
    
    // Handle route changes for re-checking auth status if needed for rescuer
    const handleRouteChange = () => {
        loadVictimInfo(); // Potentially useful if victim info could change based on route (though not currently the case)
        loadRescuerInfo(); // Re-check rescuer auth status on route change
    };
    window.addEventListener('popstate', handleRouteChange); // For browser back/forward
     // Also listen to Next.js router events if direct navigation occurs without popstate
     // This might be an overkill depending on how navigation is structured.
     // For now, popstate and direct localStorage listeners should cover most cases.

    return () => {
      window.removeEventListener('victimInfoUpdated', loadVictimInfo);
      window.removeEventListener('rescuerInfoUpdated', loadRescuerInfo);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const showVictimProfileSection = pathname === '/victim';
  const showRescuerProfileSection = isRescuerAuthenticated && pathname === '/rescuer';

  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-headline font-bold text-primary hover:opacity-80 transition-opacity">
          <HeartPulse className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          <span className='font-headline'>R.A.D.A.R</span>
        </Link>
        
        {showVictimProfileSection && (
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="group flex items-center gap-2 rounded-full p-1 sm:pr-3 h-10 sm:h-auto focus-visible:ring-primary"
                aria-label={victimInfo?.name ? `User profile for ${victimInfo.name}` : "Open User Profile"}
              >
                <Avatar className="w-8 h-8 border-2 border-primary/30 group-hover:border-primary/70 transition-colors">
                  <AvatarImage 
                    src={victimInfo?.profilePictureDataUrl || undefined} 
                    alt={victimInfo?.name ? `${victimInfo.name}'s profile picture` : 'User profile picture'} 
                  />
                  <AvatarFallback>
                    {victimInfo?.name && getInitials(victimInfo.name) ? (
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        {getInitials(victimInfo.name)}
                      </span>
                    ) : (
                      <UserCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {victimInfo?.name && (
                  <span className="text-sm font-medium text-foreground hidden sm:inline truncate max-w-[150px] sm:max-w-[200px] group-hover:text-primary transition-colors">
                    Hello, {victimInfo.name.split(' ')[0]}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="lg:max-w-2xl p-0">
              <DialogHeader className="p-6 pb-4">
                <DialogTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                   User Info & Emergency Details
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  This information is saved locally and can help rescuers. It will be sent automatically if you activate SOS.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6">
                <BasicInfoForm />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showRescuerProfileSection && (
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="group flex items-center gap-2 rounded-full p-1 sm:pr-3 h-10 sm:h-auto focus-visible:ring-primary"
                aria-label={rescuerInfo?.name ? `Rescuer profile for ${rescuerInfo.name}` : "Open Rescuer Profile"}
              >
                <Avatar className="w-8 h-8 border-2 border-accent/30 group-hover:border-accent/70 transition-colors">
                  <AvatarImage 
                    src={rescuerInfo?.profilePictureDataUrl || undefined} 
                    alt={rescuerInfo?.name ? `${rescuerInfo.name}'s profile picture` : 'Rescuer profile picture'} 
                  />
                  <AvatarFallback>
                    {rescuerInfo?.name && getInitials(rescuerInfo.name) ? (
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-accent transition-colors">
                        {getInitials(rescuerInfo.name)}
                      </span>
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {rescuerInfo?.name && (
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px] group-hover:text-accent transition-colors">
                      {rescuerInfo.name.split(' ')[0]} (Rescuer)
                    </span>
                     {rescuerInfo?.teamId && (
                        <span className="text-xs text-muted-foreground truncate max-w-[120px] group-hover:text-accent transition-colors">
                            Team: {rescuerInfo.teamId}
                        </span>
                     )}
                  </div>
                )}
                {!rescuerInfo?.name && (
                    <span className="text-sm font-medium text-foreground hidden sm:inline group-hover:text-accent transition-colors">
                        Rescuer Profile
                    </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="lg:max-w-2xl p-0">
              <DialogHeader className="p-6 pb-4">
                <DialogTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                   Rescuer Profile & Contact
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Manage your rescuer identification and contact details. This information is stored locally.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 pb-6">
                <RescuerProfileForm />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </header>
  );
}
