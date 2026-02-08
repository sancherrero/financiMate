'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a personalized financial plan.
 *
 * The flow takes user's financial data and goals as input and provides a plan for how much to contribute monthly,
 * prioritizing emergency funds vs. goals. The file exports:
 *
 * - `generatePersonalizedPlan` - A function that initiates the financial plan generation.
 * - `PersonalizedPlanInput` - The input type for the generatePersonalizedPlan function.
 * - `PersonalizedPlanOutput` - The return type for the generatePersonalizedPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const PersonalizedPlanInputSchema = z.object({
  totalIncomeNetMonthly: z.number().describe('Total net monthly income.'),
  totalFixedCostsMonthly: z.number().describe('Total monthly fixed costs.'),
  totalVariableCostsMonthly: z.number().describe('Total monthly variable costs.'),
  emergencyFundAmount: z.number().describe('Current emergency fund amount.'),
  goalName: z.string().describe('Name of the financial goal.'),
  goalTargetAmount: z.number().describe('Target amount for the financial goal.'),
  goalTargetDate: z.string().optional().describe('Optional target date for the financial goal (YYYY-MM-DD).'),
  goalUrgencyLevel: z.number().min(1).max(5).describe('Urgency level of the goal (1-5).'),
  splitMethod: z.enum(['equal', 'proportional_income']).describe('Method for splitting contributions in a group.'),
  members: z.array(
    z.object({
      memberId: z.string().describe('Unique member ID'),
      incomeNetMonthly: z.number().describe('Net monthly income for the member'),
    })
  ).optional().describe('Array of members with their income if it is a multi user household.'),
});
export type PersonalizedPlanInput = z.infer<typeof PersonalizedPlanInputSchema>;

// Define the output schema
const PersonalizedPlanOutputSchema = z.object({
  monthlySurplus: z.number().describe('Monthly surplus after deducting expenses.'),
  priority: z.string().describe('Priority: emergency_first or goal_first.'),
  monthlyContributionTotal: z.number().describe('Recommended total monthly contribution.'),
  estimatedMonthsToGoal: z.number().describe('Estimated months to achieve the goal.'),
  recommendations: z.array(z.string()).describe('Recommendations for the user in Spanish.'),
  milestones: z.array(z.object({
    month: z.number().describe('Month index from today.'),
    label: z.string().describe('Short label for the milestone in Spanish.'),
    description: z.string().describe('Short description of what happens at this milestone in Spanish.')
  })).describe('Key milestones in the financial journey.'),
  split: z.array(
    z.object({
      memberId: z.string().describe('Member ID'),
      monthlyContribution: z.number().describe('Recommended monthly contribution for the member.'),
    })
  ).optional().describe('Contribution split for each member.'),
  warnings: z.array(z.string()).describe('Warnings for the user in Spanish.'),
});
export type PersonalizedPlanOutput = z.infer<typeof PersonalizedPlanOutputSchema>;

// Define the main flow function
export async function generatePersonalizedPlan(input: PersonalizedPlanInput): Promise<PersonalizedPlanOutput> {
  return personalizedFinancialPlanFlow(input);
}

const personalizedFinancialPlanPrompt = ai.definePrompt({
  name: 'personalizedFinancialPlanPrompt',
  input: {schema: PersonalizedPlanInputSchema},
  output: {schema: PersonalizedPlanOutputSchema},
  prompt: `Eres un asesor financiero experto. USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL para todas las respuestas de texto.

Utiliza la información financiera y metas del usuario para generar un plan financiero personalizado.

Pasos a seguir:
1. Calcula el excedente mensual (ingresos totales - costes fijos - costes variables).
2. Determina la prioridad: construir un fondo de emergencia o contribuir a la meta. 
   - Si el fondo de emergencia actual es menor a 3 meses de gastos totales, prioriza 'emergency_first'.
   - Si es suficiente, prioriza 'goal_first'.
3. Calcula la contribución mensual recomendada.
4. Estima los meses para lograr la meta.
5. Genera una lista de HITOS (milestones) que incluyan al menos:
   - Cuándo se completa el fondo de emergencia (si aplica).
   - Cuándo se alcanza el 50% de la meta.
   - Cuándo se alcanza el 100% de la meta.
6. Para hogares multi-usuario, calcula el reparto según el método indicado.

IMPORTANTE: Toda la salida de texto (recommendations, warnings, milestones labels/descriptions) debe estar en ESPAÑOL.

Datos de entrada:
Total Income: {{{totalIncomeNetMonthly}}}
Fixed Costs: {{{totalFixedCostsMonthly}}}
Variable Costs: {{{totalVariableCostsMonthly}}}
Emergency Fund: {{{emergencyFundAmount}}}
Goal Name: {{{goalName}}}
Goal Amount: {{{goalTargetAmount}}}
Goal Target Date: {{{goalTargetDate}}}
Goal Urgency: {{{goalUrgencyLevel}}}
Split Method: {{{splitMethod}}}
{{#if members}}
Members:
  {{#each members}}
    Member ID: {{{memberId}}}, Income: {{{incomeNetMonthly}}}
  {{/each}}
{{/if}}

Output in JSON format:
{{outputSchema}}
`,
});

const personalizedFinancialPlanFlow = ai.defineFlow({
  name: 'personalizedFinancialPlanFlow',
  inputSchema: PersonalizedPlanInputSchema,
  outputSchema: PersonalizedPlanOutputSchema,
}, async (input) => {
  const {output} = await personalizedFinancialPlanPrompt(input);
  return output!;
});
