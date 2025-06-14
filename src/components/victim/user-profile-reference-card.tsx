
"use client";

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from 'lucide-react';
import type { VictimBasicInfo } from '@/types/signals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function UserProfileReferenceCard() {
  const [userInfo, setUserInfo] = useState<VictimBasicInfo | null>(null);

  const loadUserInfo = () => {
    const savedInfo = localStorage.getItem('victimBasicInfo');
    if (savedInfo) {
      try {
        setUserInfo(JSON.parse(savedInfo) as VictimBasicInfo);
      } catch (e) {
        console.error("Failed to parse basic info for reference card", e);
        setUserInfo(null); // Clear if parsing fails
      }
    } else {
      setUserInfo(null); // Clear if no info found
    }
  };

  useEffect(() => {
    loadUserInfo(); // Initial load

    // Listen for custom event dispatched when victim info is updated
    window.addEventListener('victimInfoUpdated', loadUserInfo);
    // Listen for direct localStorage changes from other tabs/windows
    window.addEventListener('storage', loadUserInfo);


    return () => {
      window.removeEventListener('victimInfoUpdated', loadUserInfo);
      window.removeEventListener('storage', loadUserInfo);
    };
  }, []);


  if (!userInfo) {
    // Optional: Can render a placeholder or nothing if no info is available or needed
    return null; 
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-md">
      {/* Removed CardHeader for a more compact look, title can be implicit */}
      <CardContent className="flex items-center space-x-3 p-3">
        <Avatar className="w-12 h-12 border-2 border-primary">
          <AvatarImage src={userInfo.profilePictureDataUrl || ''} alt={userInfo.name || 'User'} />
          <AvatarFallback>
            <User className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col justify-center">
            <p className="font-semibold text-sm text-foreground truncate max-w-[150px] sm:max-w-xs">
                {userInfo.name || 'User Profile'}
            </p>
            <p className="text-xs text-muted-foreground">
                {/* Example: Display age or blood group if available */}
                {/* {userInfo.age && `Age: ${userInfo.age}`} {userInfo.bloodGroup && `(${userInfo.bloodGroup})`} */}
                Basic info is up-to-date.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
