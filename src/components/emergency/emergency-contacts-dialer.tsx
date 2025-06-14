
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PhoneCall, User, Shield, Flame, Ambulance as AmbulanceIconLucide } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { VictimBasicInfo, RescuerProfileInfo } from '@/types/signals';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STANDARD_EMERGENCY_SERVICES = [
  { name: "Police", number: "911", icon: Shield, category: "Official" },
  { name: "Ambulance", number: "911", icon: AmbulanceIconLucide, category: "Official" },
  { name: "Fire Department", number: "911", icon: Flame, category: "Official" },
];

export function EmergencyContactsDialer() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const [contactsSourceType, setContactsSourceType] = useState<'victim' | 'rescuer' | null>(null);
  const [victimProfile, setVictimProfile] = useState<VictimBasicInfo | null>(null);
  const [rescuerProfile, setRescuerProfile] = useState<RescuerProfileInfo | null>(null);

  useEffect(() => {
    const loadProfiles = () => {
      if (typeof window !== 'undefined') {
        if (pathname === '/victim') {
          const savedVictimInfo = localStorage.getItem('victimBasicInfo');
          if (savedVictimInfo) {
            try {
              setVictimProfile(JSON.parse(savedVictimInfo) as VictimBasicInfo);
              setContactsSourceType('victim');
            } catch (e) {
              console.error("Failed to parse victim info for dialer", e);
              setVictimProfile(null);
            }
          } else {
            setVictimProfile(null);
          }
          setRescuerProfile(null); 
        } else if (pathname === '/rescuer') {
          const savedRescuerInfo = localStorage.getItem('rescuerProfileInfo');
          if (savedRescuerInfo) {
            try {
              setRescuerProfile(JSON.parse(savedRescuerInfo) as RescuerProfileInfo);
              setContactsSourceType('rescuer');
            } catch (e) {
              console.error("Failed to parse rescuer info for dialer", e);
              setRescuerProfile(null);
            }
          } else {
            setRescuerProfile(null);
          }
          setVictimProfile(null);
        } else {
          setVictimProfile(null);
          setRescuerProfile(null);
          setContactsSourceType(null);
        }
      }
    };

    loadProfiles();

    const handleVictimInfoUpdate = () => { if (pathname === '/victim') loadProfiles(); };
    const handleRescuerInfoUpdate = () => { if (pathname === '/rescuer') loadProfiles(); };
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'victimBasicInfo' && pathname === '/victim') {
        loadProfiles();
      }
      if (event.key === 'rescuerProfileInfo' && pathname === '/rescuer') {
        loadProfiles();
      }
    };
    
    window.addEventListener('victimInfoUpdated', handleVictimInfoUpdate);
    window.addEventListener('rescuerInfoUpdated', handleRescuerInfoUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('victimInfoUpdated', handleVictimInfoUpdate);
      window.removeEventListener('rescuerInfoUpdated', handleRescuerInfoUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);

  const formatPhoneNumberForTelLink = (countryCode?: string, phone?: string): string | null => {
    if (!phone) return null;
    let cleanPhone = phone.replace(/\D/g, ''); 

    if (countryCode && countryCode !== "MANUAL_CODE" && countryCode.trim() !== "") {
        const cleanCountryCode = countryCode.replace(/\D/g, '');
        if (!cleanPhone.startsWith(cleanCountryCode) && !cleanPhone.startsWith(`+${cleanCountryCode}`)) {
            cleanPhone = `${cleanCountryCode}${cleanPhone}`;
        }
    }
    
    if (!cleanPhone.startsWith('+') && cleanPhone.length > 7) { 
        cleanPhone = `+${cleanPhone}`;
    } else if (!cleanPhone.startsWith('+') && countryCode && countryCode !== "MANUAL_CODE") {
        cleanPhone = `+${cleanPhone}`; 
    }
    return cleanPhone;
  };

  const personalContacts: { name: string; number: string; icon: React.ElementType; category: string }[] = [];

  if (contactsSourceType === 'victim' && victimProfile) {
    for (let i = 1; i <= 3; i++) {
      const nameKey = `emergencyContact${i}Name` as keyof VictimBasicInfo;
      const phoneKey = `emergencyContact${i}Phone` as keyof VictimBasicInfo;
      const countryCodeKey = `emergencyContact${i}CountryCode` as keyof VictimBasicInfo;

      const name = victimProfile[nameKey];
      const phone = victimProfile[phoneKey];
      const contactSpecificCountryCode = victimProfile[countryCodeKey];
      const effectiveCountryCode = contactSpecificCountryCode && contactSpecificCountryCode !== "MANUAL_CODE" ? contactSpecificCountryCode : (victimProfile.sharedEmergencyContactCountryCode !== "MANUAL_CODE" ? victimProfile.sharedEmergencyContactCountryCode : undefined);

      if (name && phone) {
        const telNumber = formatPhoneNumberForTelLink(effectiveCountryCode, phone);
        if (telNumber) {
          personalContacts.push({ name, number: telNumber, icon: User, category: "Personal" });
        }
      }
    }
  } else if (contactsSourceType === 'rescuer' && rescuerProfile) {
    if (rescuerProfile.contactPhone) {
      const telNumber = formatPhoneNumberForTelLink(undefined, rescuerProfile.contactPhone);
      if (telNumber) {
        personalContacts.push({
          name: rescuerProfile.name || "My Phone",
          number: telNumber,
          icon: User, 
          category: "Personal", 
        });
      }
    }
  }

  const allContacts = [...personalContacts, ...STANDARD_EMERGENCY_SERVICES];
  const isDialerVisible = pathname === '/victim' || pathname === '/rescuer';

  if (!isDialerVisible) {
    return null;
  }

  let emptyMessage = "No contacts available.";
  if (contactsSourceType === 'victim') {
    emptyMessage = "No personal contacts saved. Add them via your profile (User icon in header).";
  } else if (contactsSourceType === 'rescuer') {
    emptyMessage = "Rescuer contact not found. Add it via your Rescuer Profile (Shield icon in header).";
  }


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="lg"
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 rounded-full shadow-xl p-0 h-16 w-16 bg-accent hover:bg-accent/90 text-accent-foreground flex items-center justify-center"
            aria-label="Emergency Contacts"
          >
            <PhoneCall className="h-7 w-7" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-headline flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-primary" /> Emergency Numbers
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Tap to call. Numbers are based on saved info and standard services. Always verify local emergency numbers for your area.
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 pb-4 max-h-[60vh] overflow-y-auto">
            {personalContacts.length === 0 && contactsSourceType !== null && (
              <p className="text-sm text-muted-foreground text-center py-4 border-b mb-3">
                {emptyMessage}
                {STANDARD_EMERGENCY_SERVICES.length > 0 && " Standard services are listed below."}
              </p>
            )}
            {allContacts.length > 0 ? (
              <ul className="space-y-3">
                {allContacts.map((contact, index) => (
                  <li key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <a
                      href={`tel:${contact.number}`}
                      className="flex items-center space-x-3 p-2 -m-2 rounded-md hover:bg-muted transition-colors group"
                      onClick={() => {
                          const logEventName = contactsSourceType === 'rescuer' ? 'newRescuerAppLog' : 'newAppLog';
                          window.dispatchEvent(new CustomEvent(logEventName, { detail: `Attempting to call ${contact.name}: ${contact.number}` }));
                          setIsOpen(false);
                      }}
                    >
                      <Avatar className="w-10 h-10 border">
                        <AvatarFallback className={contact.category === "Official" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}>
                          <contact.icon className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary">{contact.name}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-primary">{contact.number}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-primary pointer-events-none">
                        Call
                      </Button>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
                 <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
            )}
          </div>
          <DialogFooter className="p-4 pt-2 border-t">
            <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

