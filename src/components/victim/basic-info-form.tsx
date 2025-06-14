
"use client";

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserCircle, Pill, HeartPulse, ShieldAlert, Phone, MessageSquare, Save, NotebookPen, Users, CalendarIcon, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { VictimBasicInfo } from '@/types/signals';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInYears } from 'date-fns';

const bloodGroupOptions = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"
];

const genderOptions = [
  "Male", "Female"
];

const basicInfoSchema = z.object({
  name: z.string().optional(),
  dob: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  conditions: z.string().optional(),
  emergencyContact1Name: z.string().optional(),
  emergencyContact1Phone: z.string().optional(),
  emergencyContact2Name: z.string().optional(),
  emergencyContact2Phone: z.string().optional(),
  emergencyContact3Name: z.string().optional(),
  emergencyContact3Phone: z.string().optional(),
  customSOSMessage: z.string().max(160, "SOS message too long (max 160 chars)").optional(),
});

export function BasicInfoForm() {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);

  const form = useForm<VictimBasicInfo>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: "",
      dob: undefined,
      age: "",
      gender: "",
      bloodGroup: "",
      allergies: "",
      medications: "",
      conditions: "",
      emergencyContact1Name: "",
      emergencyContact1Phone: "",
      emergencyContact2Name: "",
      emergencyContact2Phone: "",
      emergencyContact3Name: "",
      emergencyContact3Phone: "",
      customSOSMessage: "Emergency! I need help. My location is being broadcast.",
    },
  });

  const onSubmit: SubmitHandler<VictimBasicInfo> = (data) => {
    console.log("Basic Info Submitted:", data);
    localStorage.setItem('victimBasicInfo', JSON.stringify(data));
    setIsSaved(true);
    toast({
      title: "Information Saved",
      description: "Your information has been saved locally on this device.",
    });
  };
  
  useEffect(() => {
    const savedInfo = localStorage.getItem('victimBasicInfo');
    if (savedInfo) {
      try {
        const parsedInfo = JSON.parse(savedInfo) as VictimBasicInfo;
        const formData = {
          ...parsedInfo,
          dob: parsedInfo.dob ? parsedInfo.dob : undefined,
        };
        form.reset(formData);
        setIsSaved(true); 
      } catch (e) {
        console.error("Failed to parse saved basic info", e);
        toast({ title: "Error", description: "Could not load previously saved information.", variant: "destructive"});
      }
    }
  }, [form, toast]);

  const handleDobChange = (date: Date | undefined) => {
    if (date) {
      form.setValue('dob', format(date, 'yyyy-MM-dd'));
      const age = differenceInYears(new Date(), date);
      form.setValue('age', age.toString());
    } else {
      form.setValue('dob', undefined);
      form.setValue('age', '');
    }
  };

  const handleCopyDetails = () => {
    const details = form.getValues();
    let detailsString = "User Information:\n";

    if (details.name) detailsString += `Name: ${details.name}\n`;
    if (details.dob) {
        try {
            detailsString += `Date of Birth: ${format(new Date(details.dob), "PPP")}\n`;
        } catch (e) {
             detailsString += `Date of Birth: ${details.dob}\n`; // fallback if dob is not a valid date string for format
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
    for (let i = 1; i <= 3; i++) {
        const contactName = details[`emergencyContact${i}Name` as keyof VictimBasicInfo];
        const contactPhone = details[`emergencyContact${i}Phone` as keyof VictimBasicInfo];
        if (contactName || contactPhone) {
            detailsString += `Contact ${i}: ${contactName || 'N/A'} - ${contactPhone || 'N/A'}\n`;
        }
    }
    
    if (details.customSOSMessage) detailsString += `\nCustom SOS Message: ${details.customSOSMessage}\n`;

    navigator.clipboard.writeText(detailsString.trim())
      .then(() => {
        toast({ title: "Details Copied", description: "Your information has been copied to the clipboard." });
      })
      .catch(err => {
        console.error("Failed to copy details: ", err);
        toast({ title: "Copy Failed", description: "Could not copy details to clipboard.", variant: "destructive" });
      });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
          <NotebookPen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          User Info & Emergency Details
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          This information is saved locally and can help rescuers. It will be sent automatically if you activate SOS.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-3 sm:pt-4">
            
            <p className="text-sm font-medium text-foreground">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="name" className="text-xs flex items-center gap-1"><UserCircle className="w-3 h-3"/>Name</FormLabel>
                    <FormControl>
                      <Input id="name" placeholder="e.g., Jane Doe" {...field} className="text-sm"/>
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
                    <FormLabel htmlFor="dob" className="text-xs">Date of Birth</FormLabel>
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
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined);
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
                    <FormLabel htmlFor="gender" className="text-xs flex items-center gap-1"><Users className="w-3 h-3"/>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
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
                    <FormLabel htmlFor="bloodGroup" className="text-xs flex items-center gap-1"><Pill className="w-3 h-3"/>Blood Group</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
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
            <p className="text-sm font-medium text-foreground">Medical Information</p>
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="allergies" className="text-xs flex items-center gap-1"><ShieldAlert className="w-3 h-3"/>Allergies</FormLabel>
                  <FormControl>
                    <Textarea id="allergies" placeholder="e.g., Penicillin, Peanuts" {...field} className="text-sm min-h-[60px]"/>
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
                  <FormLabel htmlFor="medications" className="text-xs flex items-center gap-1"><Pill className="w-3 h-3"/>Current Medications</FormLabel>
                  <FormControl>
                    <Textarea id="medications" placeholder="e.g., Insulin, Aspirin" {...field} className="text-sm min-h-[60px]"/>
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
                  <FormLabel htmlFor="conditions" className="text-xs flex items-center gap-1"><HeartPulse className="w-3 h-3"/>Medical Conditions</FormLabel>
                  <FormControl>
                    <Textarea id="conditions" placeholder="e.g., Diabetes, Asthma" {...field} className="text-sm min-h-[60px]"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-3"/>
            <p className="text-sm font-medium text-foreground">Emergency Contacts</p>
            {[1, 2, 3].map(index => (
              <div key={index} className="space-y-2 p-2 border rounded-md bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground">Contact {index}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name={`emergencyContact${index}Name` as keyof VictimBasicInfo}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor={`emergencyContact${index}Name`} className="text-xs">Name</FormLabel>
                      <FormControl>
                        <Input id={`emergencyContact${index}Name`} placeholder="Contact Name" {...field} className="text-sm"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`emergencyContact${index}Phone` as keyof VictimBasicInfo}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor={`emergencyContact${index}Phone`} className="text-xs flex items-center gap-1"><Phone className="w-3 h-3"/>Phone</FormLabel>
                      <FormControl>
                        <Input id={`emergencyContact${index}Phone`} placeholder="Phone Number" {...field} className="text-sm"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>
            ))}
            
            <Separator className="my-3"/>
            <p className="text-sm font-medium text-foreground">Custom SOS Message</p>
             <FormField
              control={form.control}
              name="customSOSMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="customSOSMessage" className="text-xs flex items-center gap-1"><MessageSquare className="w-3 h-3"/>SOS Message Template</FormLabel>
                  <FormControl>
                    <Textarea id="customSOSMessage" placeholder="Default: Emergency! I need help. My location is being broadcast." {...field} className="text-sm min-h-[80px]" maxLength={160}/>
                  </FormControl>
                  <FormMessage />
                   <p className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/160 characters</p>
                </FormItem>
              )}
            />

          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 p-4 border-t">
            <Button type="button" variant="secondary" size="sm" onClick={handleCopyDetails} className="text-sm w-full sm:w-auto order-last sm:order-first">
              <Copy className="mr-2 h-4 w-4"/> Copy Details
            </Button>
            <Button type="submit" variant={isSaved ? "outline" : "default"} size="sm" className="text-sm w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4"/> {isSaved ? "Update Information" : "Save Information"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
