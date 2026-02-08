'use server';

/**
 * @fileOverview A flow to generate a 'Plan B' if the initial financial plan is not viable.
 *
 * - generatePlanB - A function that handles the generation of Plan B.
 * - GeneratePlanBInput - The input type for the generatePlanB function.
 * - GeneratePlanBOutput - The return type for the generatePlanB function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePlanBInputSchema = z.object({
  monthlySurplus: z.number().describe('The user\'s monthly surplus.'),
  totalFixedCosts: z.number().describe('The user\'s total fixed monthly costs.'),
  totalVariableCosts: z.number().describe('The user\'s total variable monthly costs.'),
  targetAmount: z.number().describe('The target amount for the user\'s goal.'),
  targetDate: z.string().nullable().describe('The target date for the user\'s goal, if any.'),
  monthlyContributionPossible: z.number().describe('The maximum possible monthly contribution.'),
});
export type GeneratePlanBInput = z.infer<typeof GeneratePlanBInputSchema>;

const GeneratePlanBOutputSchema = z.object({
  planBDescription: z.string().describe('A description of the Plan B, including suggested actions.'),
});
export type GeneratePlanBOutput = z.infer<typeof GeneratePlanBOutputSchema>;

export async function generatePlanB(input: GeneratePlanBInput): Promise<GeneratePlanBOutput> {
  return generatePlanBFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePlanBPrompt',
  input: {schema: GeneratePlanBInputSchema},
  output: {schema: GeneratePlanBOutputSchema},
  prompt: `Based on the user's financial situation, their initial plan is not viable. Suggest a 'Plan B' that includes specific, actionable steps to either cut variable expenses or increase income.

Here is the information:
Monthly Surplus: {{{monthlySurplus}}}
Total Fixed Costs: {{{totalFixedCosts}}}
Total Variable Costs: {{{totalVariableCosts}}}
Target Amount: {{{targetAmount}}}
Target Date: {{{targetDate}}}
Maximum Possible Monthly Contribution: {{{monthlyContributionPossible}}}

Provide a concise description of the Plan B, focusing on realistic and achievable changes the user can make. Be specific and avoid vague suggestions.
`,
});

const generatePlanBFlow = ai.defineFlow(
  {
    name: 'generatePlanBFlow',
    inputSchema: GeneratePlanBInputSchema,
    outputSchema: GeneratePlanBOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
