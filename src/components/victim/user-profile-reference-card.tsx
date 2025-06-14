
"use client";

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from 'lucide-react';
import type { VictimBasicInfo } from '@/types/signals';
import { Card, CardContent } from '@/components/ui/card';

export function UserProfileReferenceCard() {
  const [userInfo, setUserInfo] = useState<VictimBasicInfo | null>(null);

  const loadUserInfo = () => {
    if (typeof window !== 'undefined') {
      const savedInfo = localStorage.getItem('victimBasicInfo');
      if (savedInfo) {
        try {
          setUserInfo(JSON.parse(savedInfo) as VictimBasicInfo);
        } catch (e) {
          console.error("Failed to parse basic info for reference card", e);
          setUserInfo(null);
        }
      } else {
        setUserInfo(null);
      }
    }
  };

  useEffect(() => {
    loadUserInfo();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'victimBasicInfo') {
        loadUserInfo();
      }
    };
    
    window.addEventListener('victimInfoUpdated', loadUserInfo);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('victimInfoUpdated', loadUserInfo);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (!userInfo) {
    return (
        <Card className="w-full max-w-2xl mx-auto shadow-md">
            <CardContent className="flex items-center space-x-3 p-3">
                 <Avatar className="w-12 h-12 border-2 border-primary">
                    <AvatarFallback>
                        <User className="w-6 h-6" />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-center">
                    <p className="font-semibold text-sm text-foreground">User Profile</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Please set up your profile in the user details.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
  }

  const isInfoComplete = !!(
    userInfo.name && userInfo.name.trim() !== "" &&
    userInfo.age && userInfo.age.trim() !== "" &&
    userInfo.bloodGroup && userInfo.bloodGroup.trim() !== ""
  );

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-md">
      <CardContent className="flex items-center space-x-3 p-3">
        <Avatar className="w-12 h-12 border-2 border-primary">
          <AvatarImage 
            src={userInfo.profilePictureDataUrl || undefined} 
            alt={userInfo.name ? `${userInfo.name}'s profile picture` : 'User profile picture'}
          />
          <AvatarFallback>
            <User className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col justify-center">
            <p className="font-semibold text-sm text-foreground truncate max-w-[150px] sm:max-w-xs">
                {userInfo.name || 'User Profile'}
            </p>
            <p className="text-xs text-muted-foreground">
              Age: {userInfo.age || 'N/A'} | Blood Group: {userInfo.bloodGroup || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isInfoComplete
                ? 'Your basic information is up-to-date.'
                : 'Please complete your profile in the user details.'}
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
