
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserCircle, Shield, Phone, Save, Copy, Upload, X, User as UserIcon, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { RescuerProfileInfo } from '@/types/signals';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const rescuerProfileSchema = z.object({
  name: z.string().min(1, "Name is required."),
  teamId: z.string().min(1, "Team ID is required."),
  contactPhone: z.string().min(1, "Contact phone is required."),
  profilePictureDataUrl: z.string().optional(),
});

export function RescuerProfileForm() {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultFormValuesRef = useRef<RescuerProfileInfo>({
    name: "",
    teamId: "",
    contactPhone: "",
    profilePictureDataUrl: "",
  });

  const form = useForm<RescuerProfileInfo>({
    resolver: zodResolver(rescuerProfileSchema),
    defaultValues: defaultFormValuesRef.current,
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<RescuerProfileInfo> = async (data) => {
    console.log("Rescuer Profile Submitted:", data);
    localStorage.setItem('rescuerProfileInfo', JSON.stringify(data));
    setIsSaved(true);
    form.reset(data, { keepValues: true, keepDirty: false, keepIsSubmitted: false });
    toast({
      title: "Profile Saved",
      description: "Your rescuer profile has been saved locally.",
    });
    window.dispatchEvent(new CustomEvent('rescuerInfoUpdated'));
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Rescuer Profile: Profile saved/updated for ${data.name || 'N/A'}.` }));
  };

  useEffect(() => {
    const savedInfo = localStorage.getItem('rescuerProfileInfo');
    if (savedInfo) {
      try {
        const parsedInfo = JSON.parse(savedInfo) as RescuerProfileInfo;
        form.reset({
          ...defaultFormValuesRef.current,
          ...parsedInfo,
          profilePictureDataUrl: parsedInfo.profilePictureDataUrl || "",
        });
        setIsSaved(true);
      } catch (e) {
        console.error("Failed to parse saved rescuer profile info", e);
        form.reset(defaultFormValuesRef.current);
        setIsSaved(false);
        toast({ title: "Error", description: "Could not load previously saved rescuer profile.", variant: "destructive"});
      }
    } else {
        form.reset(defaultFormValuesRef.current);
        setIsSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.reset, toast]);

  const handleFieldChange = (fieldUpdateFn: () => void) => {
    fieldUpdateFn();
    setIsSaved(false);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('profilePictureDataUrl', reader.result as string, { shouldValidate: true, shouldDirty: true });
        setIsSaved(false);
         window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Rescuer Profile: Photo changed.` }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    form.setValue('profilePictureDataUrl', '', { shouldValidate: true, shouldDirty: true });
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    setIsSaved(false);
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Rescuer Profile: Photo removed.` }));
  };

  const handleCopyDetails = () => {
    const details = form.getValues();
    let detailsString = "Rescuer Profile Information:\n";
    if (details.name) detailsString += `Name: ${details.name}\n`;
    if (details.teamId) detailsString += `Team ID: ${details.teamId}\n`;
    if (details.contactPhone) detailsString += `Contact Phone: ${details.contactPhone}\n`;
    if (details.profilePictureDataUrl) detailsString += `Profile Picture: Set\n`;

    navigator.clipboard.writeText(detailsString.trim())
      .then(() => {
        toast({ title: "Details Copied", description: "Rescuer profile information copied to clipboard." });
        window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Rescuer Profile: Details copied to clipboard.` }));
      })
      .catch(err => {
        console.error("Failed to copy rescuer details: ", err);
        toast({ title: "Copy Failed", description: "Could not copy details.", variant: "destructive" });
      });
  };

  const handleClearForm = () => {
    form.reset(defaultFormValuesRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    localStorage.removeItem('rescuerProfileInfo');
    setIsSaved(false);
    toast({
      title: "Profile Cleared",
      description: "Rescuer profile information has been removed.",
    });
    window.dispatchEvent(new CustomEvent('rescuerInfoUpdated'));
    window.dispatchEvent(new CustomEvent('newRescuerAppLog', { detail: `Rescuer Profile: Profile cleared.` }));
  };

  const { isSubmitting, isValid, isDirty } = form.formState;

  const getButtonText = () => {
    if (isSubmitting) return "Saving...";
    if (isSaved && !isDirty) return "Update Profile";
    return "Save Profile";
  };

   const getButtonVariant = (): "default" | "outline" => {
    if (isSubmitting) return "default";
    if (isSaved && !isDirty) return "outline";
    return "default";
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="space-y-4 flex-grow overflow-y-auto max-h-[calc(100vh-20rem)] sm:max-h-[calc(100vh-16rem)] p-1 pr-3">

          <div className="flex flex-col items-center space-y-2 my-3">
            <Avatar className="w-24 h-24 border-2 border-primary shadow-md">
              <AvatarImage src={form.watch('profilePictureDataUrl') || undefined} alt={form.watch('name') || 'Rescuer Profile'} />
              <AvatarFallback>
                <UserIcon className="w-12 h-12 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="text-xs">
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Change Photo
              </Button>
              {form.watch('profilePictureDataUrl') && (
                <Button type="button" onClick={handleRemovePhoto} variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Remove
                </Button>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
          </div>

          <p className="text-sm font-medium text-foreground">Rescuer Information</p>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="rescuerName" className="text-xs flex items-center gap-1"><UserCircle className="w-3 h-3"/>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="rescuerName" placeholder="e.g., Chris Redfield" {...field} className="text-sm" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="teamId"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="teamId" className="text-xs flex items-center gap-1"><Shield className="w-3 h-3"/>Team ID <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="teamId" placeholder="e.g., AlphaTeam-007" {...field} className="text-sm" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="contactPhone" className="text-xs flex items-center gap-1"><Phone className="w-3 h-3"/>Contact Phone <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input id="contactPhone" type="tel" placeholder="e.g., +1-555-0100" {...field} className="text-sm" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-4 border-t mt-auto">
          <Button
            type="submit"
            variant={getButtonVariant()}
            size="sm"
            className="text-sm w-full sm:w-auto order-1 sm:order-3"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
            ) : (
              <Save className="mr-2 h-4 w-4"/>
            )}
            {getButtonText()}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearForm}
            className="text-sm w-full sm:w-auto text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive-foreground order-2 sm:order-2"
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4"/> Clear Profile
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopyDetails}
            className="text-sm w-full sm:w-auto order-3 sm:order-1"
            disabled={isSubmitting}
          >
            <Copy className="mr-2 h-4 w-4"/> Copy Details
          </Button>
        </div>
      </form>
    </Form>
  );
}
