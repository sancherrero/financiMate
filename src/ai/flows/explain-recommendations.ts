'use server';

/**
 * @fileOverview Explains the reasoning behind financial recommendations.
 * Corregido el error de conexión 404 con el modelo.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const ExplainRecommendationsInputSchema = z.object({
  recommendations: z.array(z.string()).describe('The recommendations to explain.'),
  monthlySurplus: z.number().describe('The monthly surplus of the user.'),
  emergencyFundAmount: z.number().describe('The current amount in the emergency fund.'),
  emergencyTarget: z.number().describe('The target amount for the emergency fund.'),
  goalName: z.string().describe('The name of the goal.'),
  goalTargetAmount: z.number().describe('The target amount for the goal.'),
  monthlyContributionTotal: z.number().describe('The total monthly contribution to the goal.'),
  estimatedMonthsToGoal: z.number().describe('The estimated months to reach the goal.'),
});
export type ExplainRecommendationsInput = z.infer<typeof ExplainRecommendationsInputSchema>;

const ExplainRecommendationsOutputSchema = z.object({
  explanations: z.array(z.string()).describe('The explanations for each recommendation in Spanish.'),
});
export type ExplainRecommendationsOutput = z.infer<typeof ExplainRecommendationsOutputSchema>;

export async function explainRecommendations(input: ExplainRecommendationsInput): Promise<ExplainRecommendationsOutput> {
  return explainRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainRecommendationsPrompt',
  model: googleAI.model('gemini-1.5-flash'),
  input: {schema: ExplainRecommendationsInputSchema},
  output: {schema: ExplainRecommendationsOutputSchema},
  prompt: `Eres un asesor financiero que explica el razonamiento detrás de las recomendaciones de un plan.
USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL.

Situación financiera:
- Sobrante mensual: {{monthlySurplus}}
- Fondo emergencia actual: {{emergencyFundAmount}}
- Objetivo fondo emergencia: {{emergencyTarget}}
- Meta: {{goalName}} ({{goalTargetAmount}} €)
- Aporte mensual: {{monthlyContributionTotal}}
- Meses estimados: {{estimatedMonthsToGoal}}

Recomendaciones a explicar:
{{#each recommendations}}- {{this}}\n{{/each}}

Explica el porqué de cada recomendación de forma clara, profesional y amable en ESPAÑOL.
`,
});

const explainRecommendationsFlow = ai.defineFlow(
  {
    name: 'explainRecommendationsFlow',
    inputSchema: ExplainRecommendationsInputSchema,
    outputSchema: ExplainRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
