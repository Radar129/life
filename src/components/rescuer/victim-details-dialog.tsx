
"use client";

import * as React from 'react';
import type { VictimBasicInfo } from '@/types/signals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Pill, HeartPulse, ShieldAlert, Phone, CalendarDays, MessageCircle } from 'lucide-react';
import { format } from 'date-fns'; // Ensure date-fns is installed

interface VictimDetailsDialogProps {
  victimInfo: VictimBasicInfo | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailItem = ({ label, value, icon, isTextArea }: { label: string; value?: string | null; icon?: React.ReactNode, isTextArea?: boolean }) => {
  if (value === undefined || value === null || value.trim() === "") return null;
  return (
    <div className="text-sm py-1.5 border-b border-border/50 last:border-b-0">
      <span className="font-semibold text-foreground flex items-center">
        {icon && React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 mr-2 text-primary shrink-0" })}
        {label}:
      </span>
      <p className={`text-muted-foreground ml-6 ${isTextArea ? 'whitespace-pre-wrap' : 'truncate'}`}>{value || 'N/A'}</p>
    </div>
  );
};

export function VictimDetailsDialog({ victimInfo, isOpen, onOpenChange }: VictimDetailsDialogProps) {
  if (!victimInfo) return null;

  const getInitials = (name?: string): string => {
    if (!name) return '';
    const names = name.trim().split(/\s+/);
    if (names.length === 0 || names[0] === "") return '';
    if (names.length === 1) {
      return names[0].substring(0, Math.min(2, names[0].length)).toUpperCase();
    }
    return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 max-h-[calc(100vh-4rem)] flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center space-x-3">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-primary">
              <AvatarImage src={victimInfo.profilePictureDataUrl || undefined} alt={victimInfo.name || "Victim"} />
              <AvatarFallback className="text-lg sm:text-xl">
                {victimInfo.name ? getInitials(victimInfo.name) : <User className="w-7 h-7 sm:w-8 sm:h-8" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="font-headline text-lg sm:text-xl">{victimInfo.name || 'Victim Details'}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Locally stored information for this R.A.D.A.R user.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-3 space-y-1.5 overflow-y-auto flex-grow">
          <h3 className="text-xs font-medium text-primary/80 uppercase tracking-wider mb-1">Personal Information</h3>
          <DetailItem label="Name" value={victimInfo.name} icon={<User />} />
          {victimInfo.dob && (
            <DetailItem 
              label="Date of Birth" 
              value={format(new Date(victimInfo.dob), 'PPP')} 
              icon={<CalendarDays />} 
            />
          )}
          <DetailItem label="Calculated Age" value={victimInfo.age} />
          <DetailItem label="Gender" value={victimInfo.gender} />
          <DetailItem label="Blood Group" value={victimInfo.bloodGroup} icon={<Pill />} />

          <h3 className="text-xs font-medium text-primary/80 uppercase tracking-wider mt-3 mb-1">Medical Information</h3>
          <DetailItem label="Allergies" value={victimInfo.allergies} icon={<ShieldAlert />} isTextArea />
          <DetailItem label="Current Medications" value={victimInfo.medications} icon={<Pill />} isTextArea />
          <DetailItem label="Medical Conditions" value={victimInfo.conditions} icon={<HeartPulse />} isTextArea />
          
          { (victimInfo.emergencyContact1Name || victimInfo.emergencyContact1Phone) &&
            <h3 className="text-xs font-medium text-primary/80 uppercase tracking-wider mt-3 mb-1">Emergency Contacts</h3>
          }
          {[1, 2, 3].map(index => {
            const name = victimInfo[`emergencyContact${index}Name` as keyof VictimBasicInfo];
            const phone = victimInfo[`emergencyContact${index}Phone` as keyof VictimBasicInfo];
            let countryCodeValue = victimInfo[`emergencyContact${index}CountryCode` as keyof VictimBasicInfo];

            // Use shared country code if individual is not set or is default (assuming default means "use shared")
            if (!countryCodeValue || countryCodeValue === victimInfo.sharedEmergencyContactCountryCode || countryCodeValue === "+1") { // Crude check for default or matching shared
                countryCodeValue = victimInfo.sharedEmergencyContactCountryCode;
            }
            
            const displayPhone = (countryCodeValue && countryCodeValue !== "MANUAL_CODE" ? countryCodeValue + " " : "") + phone;
            
            if (name || phone) {
              return <DetailItem key={index} label={`Contact ${index}`} value={`${name || 'N/A'} - ${phone ? displayPhone : 'N/A'}`} icon={<Phone />} />;
            }
            return null;
          })}
           {victimInfo.customSOSMessage && (
            <>
              <h3 className="text-xs font-medium text-primary/80 uppercase tracking-wider mt-3 mb-1">Custom SOS Message</h3>
              <DetailItem label="Message" value={victimInfo.customSOSMessage} icon={<MessageCircle />} isTextArea />
            </>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-end space-x-2 p-4 border-t bg-background">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
