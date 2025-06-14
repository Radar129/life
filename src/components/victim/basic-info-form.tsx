
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
import { UserCircle, Pill, HeartPulse, ShieldAlert, Phone, MessageSquare, Save, NotebookPen, Users } from 'lucide-react'; // Added Users icon
import { useToast } from '@/hooks/use-toast';
import type { VictimBasicInfo } from '@/types/signals';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const bloodGroupOptions = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"
];

const genderOptions = [
  "Male", "Female", "Non-binary", "Other", "Prefer not to say"
];

const basicInfoSchema = z.object({
  name: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(), // Added gender to schema
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
      age: "",
      gender: "", // Added gender default value
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
        form.reset(parsedInfo);
        setIsSaved(true); 
      } catch (e) {
        console.error("Failed to parse saved basic info", e);
        toast({ title: "Error", description: "Could not load previously saved information.", variant: "destructive"});
      }
    }
  }, [form, toast]);


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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> {/* Changed sm:grid-cols-3 to sm:grid-cols-2 */}
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
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="age" className="text-xs">Age</FormLabel>
                    <FormControl>
                      <Input id="age" placeholder="e.g., 30" {...field} className="text-sm"/>
                    </FormControl>
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
          <CardFooter className="flex justify-end p-4 border-t">
            <Button type="submit" variant={isSaved ? "outline" : "default"} size="sm" className="text-sm">
              <Save className="mr-2 h-4 w-4"/> {isSaved ? "Update Information" : "Save Information"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

