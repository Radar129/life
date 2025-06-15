
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserCircle, Pill, HeartPulse, ShieldAlert, Phone, Save, NotebookPen, Users, CalendarIcon, Copy, Globe, MessageSquare, Upload, X, User as UserIcon, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { VictimBasicInfo } from '@/types/signals';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInYears } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const bloodGroupOptions = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"
];

const genderOptions = [
  "Male", "Female"
];

const countryCodes = [
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "Canada", code: "+1 CA", flag: "🇨🇦" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Other/Manual", code: "MANUAL_CODE", flag: "🏳️" },
];


const basicInfoSchema = z.object({
  name: z.string().min(1, "Name is required."),
  dob: z.string().min(1, "Date of Birth is required."),
  age: z.string().optional(),
  gender: z.string().min(1, "Gender is required."),
  bloodGroup: z.string().min(1, "Blood Group is required."),
  profilePictureDataUrl: z.string().optional(),
  allergies: z.string().min(1, "Allergies are required. Enter 'None' if not applicable."),
  medications: z.string().min(1, "Medications are required. Enter 'None' if not applicable."),
  conditions: z.string().min(1, "Medical conditions are required. Enter 'None' if not applicable."),
  sharedEmergencyContactCountryCode: z.string().optional(),
  emergencyContact1Name: z.string().min(1, "Contact 1: Name is required."),
  emergencyContact1CountryCode: z.string().optional(),
  emergencyContact1Phone: z.string().min(1, "Contact 1: Phone number is required."),
  emergencyContact2Name: z.string().optional(),
  emergencyContact2CountryCode: z.string().optional(),
  emergencyContact2Phone: z.string().optional(),
  emergencyContact3Name: z.string().optional(),
  emergencyContact3CountryCode: z.string().optional(),
  emergencyContact3Phone: z.string().optional(),
  customSOSMessage: z.string().max(160, "SOS message too long (max 160 chars)").optional(),
});

export function BasicInfoForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultFormValuesRef = useRef<VictimBasicInfo>({
    name: "",
    dob: undefined,
    age: "",
    gender: "",
    bloodGroup: "",
    profilePictureDataUrl: "",
    allergies: "",
    medications: "",
    conditions: "",
    sharedEmergencyContactCountryCode: "+1",
    emergencyContact1Name: "",
    emergencyContact1CountryCode: "+1",
    emergencyContact1Phone: "",
    emergencyContact2Name: "",
    emergencyContact2CountryCode: "+1",
    emergencyContact2Phone: "",
    emergencyContact3Name: "",
    emergencyContact3CountryCode: "+1",
    emergencyContact3Phone: "",
    customSOSMessage: "Emergency! I need help. My location is being broadcast.",
  });

  const form = useForm<VictimBasicInfo>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: defaultFormValuesRef.current,
    mode: 'onChange',
  });

  const onSubmit: SubmitHandler<VictimBasicInfo> = async (data) => {
    console.log("Basic Info Submitted:", data);
    localStorage.setItem('victimBasicInfo', JSON.stringify(data));
    setIsSaved(true);
    form.reset(data, { keepValues: true, keepDirty: false, keepIsSubmitted: false });
    toast({
      title: "Information Saved",
      description: "Your information has been saved locally on this device.",
    });
    window.dispatchEvent(new CustomEvent('victimInfoUpdated'));
    setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "User information saved locally." })), 0);
    router.push('/'); // Redirect to homepage
  };

  useEffect(() => {
    const savedInfo = localStorage.getItem('victimBasicInfo');
    if (savedInfo) {
      try {
        const parsedInfo = JSON.parse(savedInfo) as VictimBasicInfo;
        const formData = {
          ...defaultFormValuesRef.current,
          ...parsedInfo,
          dob: parsedInfo.dob ? parsedInfo.dob : undefined,
          profilePictureDataUrl: parsedInfo.profilePictureDataUrl || "",
        };
        form.reset(formData);

        const effectiveSharedCode = form.getValues('sharedEmergencyContactCountryCode') || defaultFormValuesRef.current.sharedEmergencyContactCountryCode;
        form.setValue('emergencyContact1CountryCode', form.getValues('emergencyContact1CountryCode') || effectiveSharedCode);
        form.setValue('emergencyContact2CountryCode', form.getValues('emergencyContact2CountryCode') || effectiveSharedCode);
        form.setValue('emergencyContact3CountryCode', form.getValues('emergencyContact3CountryCode') || effectiveSharedCode);

        setIsSaved(true);
      } catch (e) {
        console.error("Failed to parse saved basic info", e);
        form.reset(defaultFormValuesRef.current);
        setIsSaved(false);
        toast({ title: "Error", description: "Could not load previously saved information.", variant: "destructive"});
      }
    } else {
        form.reset(defaultFormValuesRef.current);
        const defaultSharedCode = defaultFormValuesRef.current.sharedEmergencyContactCountryCode;
        form.setValue('emergencyContact1CountryCode', defaultSharedCode);
        form.setValue('emergencyContact2CountryCode', defaultSharedCode);
        form.setValue('emergencyContact3CountryCode', defaultSharedCode);
        setIsSaved(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.reset, form.setValue, toast]);

  const handleFieldChange = (fieldUpdateFn: () => void) => {
    fieldUpdateFn();
    setIsSaved(false);
  };


  const handleDobChange = (date: Date | undefined) => {
    setIsSaved(false);
    if (date) {
      form.setValue('dob', format(date, 'yyyy-MM-dd'), { shouldValidate: true, shouldDirty: true });
      const age = differenceInYears(new Date(), date);
      form.setValue('age', age.toString(), { shouldValidate: true, shouldDirty: true });
    } else {
      form.setValue('dob', undefined, { shouldValidate: true, shouldDirty: true });
      form.setValue('age', '', { shouldValidate: true, shouldDirty: true });
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('profilePictureDataUrl', reader.result as string, { shouldValidate: true, shouldDirty: true });
        setIsSaved(false);
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
  };

  const handleCopyDetails = () => {
    const details = form.getValues();
    let detailsString = "User Information:\n";

    if (details.name) detailsString += `Name: ${details.name}\n`;
    if (details.profilePictureDataUrl) detailsString += `Profile Picture: Set\n`;
    if (details.dob) {
        try {
            detailsString += `Date of Birth: ${format(new Date(details.dob), "PPP")}\n`;
        } catch (e) {
             detailsString += `Date of Birth: ${details.dob}\n`;
        }
    }
    if (details.age) detailsString += `Age: ${details.age}\n`;
    if (details.gender) detailsString += `Gender: ${details.gender}\n`;
    if (details.bloodGroup) detailsString += `Blood Group: ${details.bloodGroup}\n`;

    detailsString += "\nMedical Information:\n";
    if (details.allergies) detailsString += `Allergies: ${details.allergies}\n`;
    if (details.medications) detailsString += `Medications: ${details.medications}\n`;
    if (details.conditions) detailsString += `Conditions: ${details.conditions}\n`;

    detailsString += "\nEmergency Contacts:\n";
    const sharedCountryCodeValue = details.sharedEmergencyContactCountryCode;

    for (let i = 1; i <= 3; i++) {
        const contactName = details[`emergencyContact${i}Name` as keyof VictimBasicInfo];
        let contactCountryCode = details[`emergencyContact${i}CountryCode` as keyof VictimBasicInfo];
        const contactPhone = details[`emergencyContact${i}Phone` as keyof VictimBasicInfo];

        let finalCountryCode = contactCountryCode !== "MANUAL_CODE" && contactCountryCode ? contactCountryCode : sharedCountryCodeValue;
        if (finalCountryCode === "MANUAL_CODE") finalCountryCode = "";

        if (contactName || contactPhone) {
            detailsString += `Contact ${i}: ${contactName || 'N/A'} - ${finalCountryCode || ''}${contactPhone || 'N/A'}\n`;
        }
    }

    if (details.customSOSMessage) detailsString += `\nCustom SOS Message: ${details.customSOSMessage}\n`;

    navigator.clipboard.writeText(detailsString.trim())
      .then(() => {
        toast({ title: "Details Copied", description: "Your information has been copied to the clipboard." });
        setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "User details copied to clipboard." })), 0);
      })
      .catch(err => {
        console.error("Failed to copy details: ", err);
        toast({ title: "Copy Failed", description: "Could not copy details to clipboard.", variant: "destructive" });
      });
  };

  const handleClearForm = () => {
    form.reset(defaultFormValuesRef.current);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    localStorage.removeItem('victimBasicInfo');
    setIsSaved(false);
    toast({
      title: "Information Cleared",
      description: "All your personal and emergency details have been removed from this device.",
    });
    window.dispatchEvent(new CustomEvent('victimInfoUpdated'));
    setTimeout(() => window.dispatchEvent(new CustomEvent('newAppLog', { detail: "User information cleared from device." })), 0);
  };

  const { isSubmitting, isValid, isDirty } = form.formState;

  const getButtonText = () => {
    if (isSubmitting) return "Saving...";
    if (isSaved && !isDirty) return "Update Information";
    return "Save Information";
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
              <AvatarImage src={form.watch('profilePictureDataUrl') || undefined} alt={form.watch('name') || 'User Profile'} />
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

          <p className="text-sm font-medium text-foreground">Personal Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name" className="text-xs flex items-center gap-1"><UserCircle className="w-3 h-3"/>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input id="name" placeholder="e.g., Jane Doe" {...field} className="text-sm" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel htmlFor="dob" className="text-xs flex items-center gap-1"><CalendarIcon className="w-3 h-3"/>Date of Birth <span className="text-destructive">*</span></FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          id="dob"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                           handleDobChange(date);
                        }}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="age" className="text-xs">Calculated Age</FormLabel>
                  <FormControl>
                    <Input id="age" placeholder="Age" {...field} className="text-sm bg-muted/50" disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="gender" className="text-xs flex items-center gap-1"><Users className="w-3 h-3"/>Gender <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(value) => handleFieldChange(() => field.onChange(value))} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger id="gender" className="text-sm">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {genderOptions.map((option) => (
                        <SelectItem key={option} value={option} className="text-sm">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bloodGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="bloodGroup" className="text-xs flex items-center gap-1"><Pill className="w-3 h-3"/>Blood Group <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={(value) => handleFieldChange(() => field.onChange(value))} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger id="bloodGroup" className="text-sm">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bloodGroupOptions.map((group) => (
                        <SelectItem key={group} value={group} className="text-sm">
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-3"/>
          <p className="text-sm font-medium text-foreground">Medical Information (Enter 'None' if not applicable)</p>
          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="allergies" className="text-xs flex items-center gap-1"><ShieldAlert className="w-3 h-3"/>Allergies <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea id="allergies" placeholder="e.g., Penicillin, Peanuts, or None" {...field} className="text-sm min-h-[60px]" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="medications"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="medications" className="text-xs flex items-center gap-1"><Pill className="w-3 h-3"/>Current Medications <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea id="medications" placeholder="e.g., Insulin, Aspirin, or None" {...field} className="text-sm min-h-[60px]" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="conditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="conditions" className="text-xs flex items-center gap-1"><HeartPulse className="w-3 h-3"/>Medical Conditions <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea id="conditions" placeholder="e.g., Diabetes, Asthma, or None" {...field} className="text-sm min-h-[60px]" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator className="my-3"/>
          <p className="text-sm font-medium text-foreground">Emergency Contacts</p>
           <FormField
            control={form.control}
            name="sharedEmergencyContactCountryCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="sharedEmergencyContactCountryCode" className="text-xs flex items-center gap-1"><Globe className="w-3 h-3"/>Country for Contacts</FormLabel>
                <Select
                  onValueChange={(value) => {
                    handleFieldChange(() => field.onChange(value));
                    const contact1Code = form.getValues('emergencyContact1CountryCode');
                    const contact2Code = form.getValues('emergencyContact2CountryCode');
                    const contact3Code = form.getValues('emergencyContact3CountryCode');

                    if (!contact1Code || contact1Code === form.watch('sharedEmergencyContactCountryCode') || contact1Code === defaultFormValuesRef.current.emergencyContact1CountryCode ) {
                         form.setValue('emergencyContact1CountryCode', value, {shouldDirty: true});
                    }
                    if (!contact2Code || contact2Code === form.watch('sharedEmergencyContactCountryCode') || contact2Code === defaultFormValuesRef.current.emergencyContact2CountryCode) {
                        form.setValue('emergencyContact2CountryCode', value, {shouldDirty: true});
                    }
                    if (!contact3Code || contact3Code === form.watch('sharedEmergencyContactCountryCode') || contact3Code === defaultFormValuesRef.current.emergencyContact3CountryCode) {
                         form.setValue('emergencyContact3CountryCode', value, {shouldDirty: true});
                    }
                  }}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger id="sharedEmergencyContactCountryCode" className="text-sm">
                       <SelectValue placeholder="Select Country">
                        {(() => {
                          const selectedCode = field.value;
                          const country = countryCodes.find(c => c.code === selectedCode);
                          return country ? (
                            <span className="flex items-center line-clamp-none">
                              <span className="mr-2 text-base">{country.flag}</span>
                              {country.name} ({country.code === "MANUAL_CODE" ? "Manual" : country.code})
                            </span>
                          ) : "Select Country";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {countryCodes.map((country) => (
                      <SelectItem key={country.name} value={country.code} className="text-sm">
                        <span className="mr-2 text-base">{country.flag}</span>
                        {country.name} ({country.code === "MANUAL_CODE" ? "Manual" : country.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {[1, 2, 3].map(contactIndex => (
            <div key={contactIndex} className="space-y-2 p-2 border rounded-md bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground">Contact {contactIndex} {contactIndex === 1 && <span className="text-destructive">*</span>}</p>
              <FormField
                control={form.control}
                name={`emergencyContact${contactIndex}Name` as keyof VictimBasicInfo}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`emergencyContact${contactIndex}Name`} className="text-xs">Name {contactIndex === 1 && <span className="text-destructive">*</span>}</FormLabel>
                    <FormControl>
                      <Input id={`emergencyContact${contactIndex}Name`} placeholder="Contact Name" {...field} className="text-sm" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`emergencyContact${contactIndex}Phone` as keyof VictimBasicInfo}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor={`emergencyContact${contactIndex}Phone`} className="text-xs flex items-center gap-1"><Phone className="w-3 h-3"/>Phone Number {contactIndex === 1 && <span className="text-destructive">*</span>}</FormLabel>
                    <FormControl>
                      <Input id={`emergencyContact${contactIndex}Phone`} placeholder="Phone Number" {...field} className="text-sm" onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}

          <Separator className="my-3"/>
          <p className="text-sm font-medium text-foreground">Custom SOS Message</p>
           <FormField
            control={form.control}
            name="customSOSMessage"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea id="customSOSMessage" placeholder="Default: Emergency! I need help. My location is being broadcast." {...field} className="text-sm min-h-[80px]" maxLength={160} onChange={(e) => handleFieldChange(() => field.onChange(e))}/>
                </FormControl>
                <FormMessage />
                 <p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/160 characters</p>
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
            <Trash2 className="mr-2 h-4 w-4"/> Clear All
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

    
