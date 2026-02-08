
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
  strategy: z.enum(['emergency_first', 'balanced', 'goal_first']).describe('User preference for priority: emergency_first, balanced, or goal_first.'),
  splitMethod: z.enum(['equal', 'proportional_income']).describe('Method for splitting contributions in a group.'),
  isExistingDebt: z.boolean().optional().describe('Whether the goal is an existing debt being paid.'),
  existingMonthlyPayment: z.number().optional().describe('The monthly installment already being paid for this debt.'),
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
  priority: z.string().describe('Priority: emergency_first, goal_first or balanced.'),
  monthlyContributionTotal: z.number().describe('Recommended total monthly contribution (extra over what is already being paid).'),
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

Utiliza la información financiera, metas y PREFERENCIA DE ESTRATEGIA del usuario para generar un plan financiero personalizado.

CONSIDERACIÓN ESPECIAL PARA DEUDAS:
Si el usuario indica que la meta es una DEUDA EXISTENTE ('isExistingDebt': true) y ya paga una cuota ('existingMonthlyPayment' > 0):
1. El saldo de la meta se reduce CADA MES automáticamente por el valor de 'existingMonthlyPayment'.
2. Cualquier 'monthlyContributionTotal' adicional que recomiendes se SUMARÁ a esa cuota para amortizar más rápido.
3. El cálculo de 'estimatedMonthsToGoal' debe tener en cuenta que el saldo baja por (cuota_actual + aporte_extra).
4. El excedente mensual ya tiene descontada la cuota actual, por lo que el aporte extra sale de ese excedente restante.

Pasos a seguir:
1. Calcula el excedente mensual (ingresos totales - costes fijos - costes variables).
2. Determina la prioridad basada en el campo 'strategy'.
3. Calcula la contribución mensual RECOMENDADA ADICIONAL y la línea de tiempo realista.
4. Genera HITOS (milestones) específicos.

IMPORTANTE: Toda la salida de texto debe estar en ESPAÑOL.

Datos de entrada:
Total Income: {{{totalIncomeNetMonthly}}}
Fixed Costs: {{{totalFixedCostsMonthly}}}
Variable Costs: {{{totalVariableCostsMonthly}}}
Emergency Fund: {{{emergencyFundAmount}}}
Goal Name: {{{goalName}}}
Goal Amount: {{{goalTargetAmount}}}
Strategy Preference: {{{strategy}}}
Is Debt: {{{isExistingDebt}}}
Current Monthly Payment: {{{existingMonthlyPayment}}}
Goal Urgency: {{{goalUrgencyLevel}}}

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
