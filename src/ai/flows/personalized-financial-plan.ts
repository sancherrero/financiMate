'use server';

/**
 * @fileOverview Flujo para generar un plan financiero personalizado.
 * Actualizado para manejar intereses y amortización detallada de deudas.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedPlanInputSchema = z.object({
  totalIncomeNetMonthly: z.number(),
  totalFixedCostsMonthly: z.number(),
  totalVariableCostsMonthly: z.number(),
  emergencyFundAmount: z.number(),
  goalName: z.string(),
  goalTargetAmount: z.number(),
  goalUrgencyLevel: z.number().min(1).max(5),
  strategy: z.enum(['emergency_first', 'balanced', 'goal_first']),
  isExistingDebt: z.boolean().optional(),
  existingMonthlyPayment: z.number().optional(),
  tin: z.number().optional(),
  tae: z.number().optional(),
  remainingPrincipal: z.number().optional(),
  members: z.array(
    z.object({
      memberId: z.string(),
      incomeNetMonthly: z.number(),
    })
  ).optional(),
});
export type PersonalizedPlanInput = z.infer<typeof PersonalizedPlanInputSchema>;

const PersonalizedPlanOutputSchema = z.object({
  monthlySurplus: z.number(),
  priority: z.string(),
  monthlyContributionTotal: z.number(),
  estimatedMonthsToGoal: z.number(),
  recommendations: z.array(z.string()),
  milestones: z.array(z.object({
    month: z.number(),
    label: z.string(),
    description: z.string()
  })),
  split: z.array(
    z.object({
      memberId: z.string(),
      monthlyContribution: z.number(),
    })
  ).optional(),
  warnings: z.array(z.string()),
});
export type PersonalizedPlanOutput = z.infer<typeof PersonalizedPlanOutputSchema>;

export async function generatePersonalizedPlan(input: PersonalizedPlanInput): Promise<PersonalizedPlanOutput> {
  return personalizedFinancialPlanFlow(input);
}

const personalizedFinancialPlanPrompt = ai.definePrompt({
  name: 'personalizedFinancialPlanPrompt',
  input: {schema: PersonalizedPlanInputSchema},
  output: {schema: PersonalizedPlanOutputSchema},
  prompt: `Eres un asesor financiero experto. USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL.

Genera un plan detallado considerando la estrategia del usuario.

REGLA DE DEUDA CON INTERESES:
Si 'isExistingDebt' es true:
1. Si se proporciona 'tin' o 'tae', calcula que una parte de la cuota va a INTERESES y no reduce capital. 
2. El plazo ('estimatedMonthsToGoal') debe ser preciso: Capital Pendiente / (Aporte Extra + Parte de la Cuota que amortiza Capital).
3. Advierte si el interés es muy alto (por encima del 10% TAE).

Hitos (milestones):
- Define hitos basados en el tiempo y el progreso del ahorro/deuda.

Datos:
- Ingreso: {{totalIncomeNetMonthly}}
- Excedente: {{totalIncomeNetMonthly - totalFixedCostsMonthly - totalVariableCostsMonthly}}
- Meta: {{goalName}} ({{goalTargetAmount}}€)
- TIN: {{tin}}%, TAE: {{tae}}%
- Cuota Actual: {{existingMonthlyPayment}}€

Output en JSON:
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
