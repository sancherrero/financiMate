'use server';

/**
 * @fileOverview Explains the reasoning behind financial recommendations.
 *
 * - explainRecommendations - A function that explains the recommendations of the financial plan.
 * - ExplainRecommendationsInput - The input type for the explainRecommendations function.
 * - ExplainRecommendationsOutput - The return type for the explainRecommendations function.
 */

import {ai} from '@/ai/genkit';
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
  explanations: z.array(z.string()).describe('The explanations for each recommendation.'),
});
export type ExplainRecommendationsOutput = z.infer<typeof ExplainRecommendationsOutputSchema>;

export async function explainRecommendations(input: ExplainRecommendationsInput): Promise<ExplainRecommendationsOutput> {
  return explainRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainRecommendationsPrompt',
  input: {schema: ExplainRecommendationsInputSchema},
  output: {schema: ExplainRecommendationsOutputSchema},
  prompt: `You are a financial advisor explaining the reasoning behind the recommendations in a financial plan.

  Here's the user's financial situation:
  - Monthly Surplus: {{monthlySurplus}}
  - Emergency Fund Amount: {{emergencyFundAmount}}
  - Emergency Target: {{emergencyTarget}}
  - Goal Name: {{goalName}}
  - Goal Target Amount: {{goalTargetAmount}}
  - Monthly Contribution Total: {{monthlyContributionTotal}}
  - Estimated Months To Goal: {{estimatedMonthsToGoal}}

  Here are the recommendations:
  {{#each recommendations}}- {{this}}\n{{/each}}

  Explain the reasoning behind each recommendation in a clear and concise manner. Be friendly and professional, but avoid being overly verbose.
  Format the output as a numbered list of explanations, corresponding to the recommendations.
  Ensure that you provide one explanation for each recommendation in the input.
  Ensure that each recommendation provided is accounted for.

  Output:
  {
    "explanations": [
      "Explanation 1",
      "Explanation 2",
      "Explanation 3",
      ...
    ]
  }

  Make sure the response is valid JSON.
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
