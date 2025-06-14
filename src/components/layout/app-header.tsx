
"use client";

import Link from 'next/link';
import { HeartPulse, UserCircle } from 'lucide-react';
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
import type { VictimBasicInfo } from '@/types/signals';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  const [userInfo, setUserInfo] = useState<VictimBasicInfo | null>(null);

  const loadUserInfo = () => {
    if (typeof window !== 'undefined') {
      const savedInfo = localStorage.getItem('victimBasicInfo');
      if (savedInfo) {
        try {
          setUserInfo(JSON.parse(savedInfo) as VictimBasicInfo);
        } catch (e) {
          console.error("Failed to parse basic info for header", e);
          setUserInfo(null);
        }
      } else {
        setUserInfo(null);
      }
    }
  };

  useEffect(() => {
    loadUserInfo(); // Initial load

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'victimBasicInfo') {
        loadUserInfo();
      }
    };

    // Listen for custom event dispatched when victim info is updated
    window.addEventListener('victimInfoUpdated', loadUserInfo);
    // Listen for direct localStorage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('victimInfoUpdated', loadUserInfo);
      window.removeEventListener('storage', handleStorageChange);
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
              aria-label="Open User Profile"
            >
              <Avatar className="w-8 h-8 border-2 border-primary/30 group-hover:border-primary/70 transition-colors">
                <AvatarImage src={userInfo?.profilePictureDataUrl || undefined} alt={userInfo?.name || 'User profile'} />
                <AvatarFallback>
                  <UserCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </AvatarFallback>
              </Avatar>
              {userInfo?.name && (
                <span className="text-sm font-medium text-foreground hidden sm:inline truncate max-w-[100px] group-hover:text-primary transition-colors">
                  {userInfo.name}
                </span>
              )}
              {!userInfo?.name && <span className="sr-only">User Profile</span>}
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
