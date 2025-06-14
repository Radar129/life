
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation'; // Import usePathname
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
import type { VictimBasicInfo } from '@/types/signals';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Standard emergency numbers (examples, should be adapted/verified for real-world use)
const STANDARD_EMERGENCY_SERVICES = [
  { name: "Police", number: "911", icon: Shield, category: "Official" },
  { name: "Ambulance", number: "911", icon: AmbulanceIconLucide, category: "Official" },
  { name: "Fire Department", number: "911", icon: Flame, category: "Official" },
  // Consider adding 112 or making these configurable based on region
];

export function EmergencyContactsDialer() {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<VictimBasicInfo | null>(null);
  const pathname = usePathname(); // Get the current pathname

  useEffect(() => {
    const loadUserInfo = () => {
      if (typeof window !== 'undefined') {
        const savedInfo = localStorage.getItem('victimBasicInfo');
        if (savedInfo) {
          try {
            setUserInfo(JSON.parse(savedInfo) as VictimBasicInfo);
          } catch (e) {
            console.error("Failed to parse basic info for emergency dialer", e);
            setUserInfo(null);
          }
        } else {
          setUserInfo(null);
        }
      }
    };

    loadUserInfo(); // Initial load

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

  const formatPhoneNumberForTelLink = (countryCode?: string, phone?: string): string | null => {
    if (!phone) return null;
    let cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits

    if (countryCode && countryCode !== "MANUAL_CODE" && countryCode.trim() !== "") {
        const cleanCountryCode = countryCode.replace(/\D/g, '');
        // Only add country code if phone number doesn't already start with it (or with + and code)
        if (!cleanPhone.startsWith(cleanCountryCode) && !cleanPhone.startsWith(`+${cleanCountryCode}`)) {
            cleanPhone = `${cleanCountryCode}${cleanPhone}`;
        }
    }
    
    // Ensure it starts with a '+' for international format if it seems like a full number
    if (!cleanPhone.startsWith('+') && cleanPhone.length > 7) { // Heuristic for numbers that likely need a +
        cleanPhone = `+${cleanPhone}`;
    } else if (!cleanPhone.startsWith('+') && countryCode && countryCode !== "MANUAL_CODE") {
        // If it's short and a country code was provided, assume it's local to that country code.
        cleanPhone = `+${cleanPhone}`; 
    }


    return cleanPhone;
  };

  const personalContacts: { name: string; number: string; icon: React.ElementType; category: string }[] = [];
  if (userInfo) {
    for (let i = 1; i <= 3; i++) {
      const nameKey = `emergencyContact${i}Name` as keyof VictimBasicInfo;
      const phoneKey = `emergencyContact${i}Phone` as keyof VictimBasicInfo;
      const countryCodeKey = `emergencyContact${i}CountryCode` as keyof VictimBasicInfo;

      const name = userInfo[nameKey];
      const phone = userInfo[phoneKey];
      // Use individual contact code, fallback to shared, fallback to undefined
      const contactSpecificCountryCode = userInfo[countryCodeKey];
      const effectiveCountryCode = contactSpecificCountryCode && contactSpecificCountryCode !== "MANUAL_CODE" ? contactSpecificCountryCode : (userInfo.sharedEmergencyContactCountryCode !== "MANUAL_CODE" ? userInfo.sharedEmergencyContactCountryCode : undefined) ;


      if (name && phone) {
        const telNumber = formatPhoneNumberForTelLink(effectiveCountryCode, phone);
        if (telNumber) {
          personalContacts.push({ name, number: telNumber, icon: User, category: "Personal" });
        }
      }
    }
  }

  const allContacts = [...personalContacts, ...STANDARD_EMERGENCY_SERVICES];

  // Determine if the dialer should be visible
  const isDialerVisible = pathname === '/victim' || pathname === '/rescuer';

  if (!isDialerVisible) {
    return null; // Don't render anything if not on the specified pages
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
            {allContacts.length === 0 && personalContacts.length === 0 && ( // Show if no personal contacts AND no standard (which shouldn't happen)
              <p className="text-sm text-muted-foreground text-center py-4">
                No personal contacts saved. Add them via your profile (User icon in header).
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
                          window.dispatchEvent(new CustomEvent('newAppLog', { detail: `Attempting to call ${contact.name}: ${contact.number}` }));
                          setIsOpen(false); // Close dialog on tap
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
                 <p className="text-sm text-muted-foreground text-center py-4">
                    No personal contacts saved. Add them via your profile (User icon in header). Standard emergency numbers are listed.
                </p>
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

