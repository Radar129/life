// This is an autogenerated file from Firebase Studio.

'use server';

/**
 * @fileOverview An AI agent that provides advice to rescuers based on real-time scene information.
 *
 * - getRescuerAdvice - A function that takes scene information as input and returns suggested next best actions.
 * - RescuerAdviceInput - The input type for the getRescuerAdvice function.
 * - RescuerAdviceOutput - The return type for the getRescuerAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RescuerAdviceInputSchema = z.object({
  sceneInformation: z
    .string()
    .describe('Detailed information about the current rescue scene.'),
});
export type RescuerAdviceInput = z.infer<typeof RescuerAdviceInputSchema>;

const RescuerAdviceOutputSchema = z.object({
  suggestedActions: z
    .array(z.string())
    .describe('A list of suggested next best actions for the rescuer.'),
  reasoning: z
    .string()
    .describe('The AI’s reasoning behind the suggested actions.'),
});
export type RescuerAdviceOutput = z.infer<typeof RescuerAdviceOutputSchema>;

export async function getRescuerAdvice(input: RescuerAdviceInput): Promise<RescuerAdviceOutput> {
  return rescuerAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rescuerAdvicePrompt',
  input: {schema: RescuerAdviceInputSchema},
  output: {schema: RescuerAdviceOutputSchema},
  prompt: `You are an AI assistant providing guidance to rescuers in emergency situations.

  Based on the scene information provided, suggest the next best actions for the rescuer to take.
  Explain your reasoning for each suggestion.

  Scene Information:
  {{sceneInformation}}

  Format your response as a list of suggested actions and a brief explanation of the reasoning behind each action.
  `,
});

const rescuerAdviceFlow = ai.defineFlow(
  {
    name: 'rescuerAdviceFlow',
    inputSchema: RescuerAdviceInputSchema,
    outputSchema: RescuerAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
