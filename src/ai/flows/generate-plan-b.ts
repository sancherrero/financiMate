
'use server';

/**
 * @fileOverview A flow to generate a 'Plan B' if the initial financial plan is not viable.
 * Corregido el error de conexión 404 con el modelo.
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
  planBDescription: z.string().describe('A description of the Plan B in Spanish.'),
});
export type GeneratePlanBOutput = z.infer<typeof GeneratePlanBOutputSchema>;

export async function generatePlanB(input: GeneratePlanBInput): Promise<GeneratePlanBOutput> {
  return generatePlanBFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePlanBPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: GeneratePlanBInputSchema},
  output: {schema: GeneratePlanBOutputSchema},
  prompt: `Basado en la situación financiera del usuario, su plan inicial no es viable. Sugiere un 'Plan B' en ESPAÑOL.

Incluye pasos específicos y accionables para recortar gastos variables o aumentar ingresos.

Información:
Sobrante Mensual: {{{monthlySurplus}}}
Costes Fijos: {{{totalFixedCosts}}}
Costes Variables: {{{totalVariableCosts}}}
Objetivo Meta: {{{targetAmount}}}
Contribución Máxima Posible: {{{monthlyContributionPossible}}}

Proporciona una descripción concisa en ESPAÑOL con cambios realistas.
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
