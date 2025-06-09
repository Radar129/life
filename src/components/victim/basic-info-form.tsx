
"use client";

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserCircle, Pill, Users, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

const basicInfoSchema = z.object({
  name: z.string().optional(),
  age: z.string().optional(), // Keep as string for input, can parse if needed
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
});

type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

export function BasicInfoForm() {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);

  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: "",
      age: "",
      bloodGroup: "",
      emergencyContact: "",
    },
  });

  const onSubmit: SubmitHandler<BasicInfoFormValues> = (data) => {
    // In a real app, this data would be persisted or sent with SOS.
    // For this prototype, we'll just log it and show a toast.
    console.log("Basic Info Submitted:", data);
    localStorage.setItem('victimBasicInfo', JSON.stringify(data)); // Simulate saving
    setIsSaved(true);
    toast({
      title: "Information Saved (Locally)",
      description: "Your basic information has been saved on this device.",
    });
  };
  
  useEffect(() => {
    const savedInfo = localStorage.getItem('victimBasicInfo');
    if (savedInfo) {
      try {
        const parsedInfo = JSON.parse(savedInfo) as BasicInfoFormValues;
        form.reset(parsedInfo);
        setIsSaved(true);
      } catch (e) {
        console.error("Failed to parse saved basic info", e);
      }
    }
  }, [form]);


  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl mt-8">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <UserCircle className="w-7 h-7 text-primary" />
          Basic Emergency Information
        </CardTitle>
        <CardDescription>
          (Optional) Providing this information may help rescuers. It will be stored locally on your device.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name" className="flex items-center gap-2"><Users className="w-4 h-4"/>Name</FormLabel>
                  <FormControl>
                    <Input id="name" placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="age">Age</FormLabel>
                    <FormControl>
                      <Input id="age" placeholder="e.g., 30" {...field} />
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
                    <FormLabel htmlFor="bloodGroup" className="flex items-center gap-2"><Pill className="w-4 h-4"/>Blood Group</FormLabel>
                    <FormControl>
                      <Input id="bloodGroup" placeholder="e.g., O+" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="emergencyContact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="emergencyContact" className="flex items-center gap-2"><Phone className="w-4 h-4"/>Emergency Contact (Name/Number)</FormLabel>
                  <FormControl>
                    <Input id="emergencyContact" placeholder="e.g., John (Brother) / 555-1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end p-6 border-t">
            <Button type="submit" variant={isSaved ? "outline" : "default"}>
              {isSaved ? "Update Information" : "Save Information"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
