
"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getRescuerAdvice, RescuerAdviceInput, RescuerAdviceOutput } from '@/ai/flows/rescuer-advice';
import { BotMessageSquare, Loader2, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

const rescuerAdviceSchema = z.object({
  sceneInformation: z.string().min(10, { message: "Please provide scene information (min 10 characters)." }).max(1500),
});

type RescuerAdviceFormValues = z.infer<typeof rescuerAdviceSchema>;

export function RescuerAdvicePanel() {
  const [advice, setAdvice] = useState<RescuerAdviceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RescuerAdviceFormValues>({
    resolver: zodResolver(rescuerAdviceSchema),
    defaultValues: {
      sceneInformation: "",
    },
  });

  const onSubmit: SubmitHandler<RescuerAdviceFormValues> = async (data) => {
    setIsLoading(true);
    setAdvice(null);
    setError(null);
    try {
      const input: RescuerAdviceInput = { sceneInformation: data.sceneInformation };
      const result = await getRescuerAdvice(input);
      setAdvice(result);
    } catch (e) {
      console.error("Error getting rescuer advice:", e);
      setError("Failed to get advice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <BotMessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          AI Rescuer Advice
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Describe the current scene, and the AI will suggest potential next actions.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="sceneInformation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="sceneInformation" className="text-sm">Current Scene Details</FormLabel>
                  <FormControl>
                    <Textarea
                      id="sceneInformation"
                      placeholder="Environment, victims, injuries, hazards, resources..."
                      className="min-h-[100px] text-sm"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end p-4 sm:p-6 border-t">
            <Button type="submit" disabled={isLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground text-sm" size="sm">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Get Advice
            </Button>
          </CardFooter>
        </form>
      </Form>

      {error && (
        <div className="p-4 sm:p-6 border-t">
          <Alert variant="destructive" className="text-sm">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {advice && (
        <div className="p-4 sm:p-6 border-t space-y-3">
          <h3 className="text-lg font-headline font-semibold text-primary">AI Generated Advice:</h3>
          
          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-semibold text-base mb-1.5">Suggested Actions:</h4>
            {advice.suggestedActions && advice.suggestedActions.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 pl-2 text-sm">
                {advice.suggestedActions.map((action, index) => (
                  <li key={index} className="text-foreground">{action}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No specific actions suggested for this scenario.</p>
            )}
          </div>

          <Separator />

          <div className="p-3 bg-muted/50 rounded-md">
            <h4 className="font-semibold text-base mb-1.5">Reasoning:</h4>
            <p className="text-foreground whitespace-pre-wrap text-sm">{advice.reasoning || "No reasoning provided."}</p>
          </div>
        </div>
      )}
    </Card>
  );
}


// Helper (dummy) AlertTriangle, if not importing from lucide-react for Alert component
const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
