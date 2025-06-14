
"use client";

import Link from 'next/link';
import { HeartPulse, UserCircle } from 'lucide-react'; // Removed ShieldCheck, Settings
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
import { useState, useEffect } from 'react';
import type { VictimBasicInfo } from '@/types/signals'; // Removed RescuerProfileInfo
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  useEffect(() => {
    loadVictimInfo(); 

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'victimBasicInfo') {
        loadVictimInfo();
      }
    };

    window.addEventListener('victimInfoUpdated', loadVictimInfo); 
    window.addEventListener('storage', handleStorageChange);

    const handleRouteChange = () => {
        loadVictimInfo();
    };
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('victimInfoUpdated', loadVictimInfo);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);


  return (
    <header className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b shadow-sm">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-headline font-bold text-primary hover:opacity-80 transition-opacity">
          <HeartPulse className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          <span className='font-headline'>R.A.D.A.R</span>
        </Link>
        
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
      </div>
    </header>
  );
}
