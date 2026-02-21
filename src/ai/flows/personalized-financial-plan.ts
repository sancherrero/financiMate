'use server';

/**
 * @fileOverview Flujo para generar un plan financiero con realismo bancario (Método Francés).
 * Incluye lógica de amortización anticipada y desglose por miembros del hogar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedPlanInputSchema = z.object({
  totalIncomeNetMonthly: z.number(),
  totalFixedCostsMonthly: z.number(),
  totalVariableCostsMonthly: z.number(),
  totalMinLeisureCosts: z.number(),
  emergencyFundAmount: z.number(),
  goalName: z.string(),
  goalTargetAmount: z.number(),
  goalUrgencyLevel: z.number().min(1).max(5),
  strategy: z.enum(['emergency_first', 'balanced', 'goal_first']),
  splitMethod: z.enum(['equal', 'proportional_income']).optional(),
  isExistingDebt: z.boolean().optional(),
  existingMonthlyPayment: z.number().optional(),
  tin: z.number().optional(),
  tae: z.number().optional(),
  remainingPrincipal: z.number().optional(),
  assignedTo: z.string().optional(),
  expenseMode: z.enum(['shared', 'individual']).optional(),
  members: z.array(
    z.object({
      memberId: z.string(),
      incomeNetMonthly: z.number(),
      individualFixedCosts: z.number().optional(),
      individualVariableCosts: z.number().optional(),
      individualMinLeisureCosts: z.number().optional(),
    })
  ).optional(),
});
export type PersonalizedPlanInput = z.infer<typeof PersonalizedPlanInputSchema>;

const PersonalizedPlanPromptInputSchema = PersonalizedPlanInputSchema.extend({
  householdSurplus: z.number(),
});

const PersonalizedPlanOutputSchema = z.object({
  monthlySurplus: z.number(),
  priority: z.string(),
  monthlyContributionExtra: z.number(),
  estimatedMonthsToGoal: z.number(),
  recommendations: z.array(z.string()),
  milestones: z.array(z.object({
    month: z.number(),
    label: z.string(),
    description: z.string()
  })),
  mathSteps: z.array(z.object({
    label: z.string(),
    operation: z.string(),
    result: z.string()
  })),
  monthlyTable: z.array(z.object({
    month: z.number(),
    interestPaid: z.number(),
    commissionPaid: z.number(),
    regularPrincipalPaid: z.number(),
    extraPrincipalPaid: z.number(),
    totalPaid: z.number(),
    remainingPrincipal: z.number(),
    savingsInterestEarned: z.number(),
    cumulativeEmergencyFund: z.number(),
  })),
  split: z.array(
    z.object({
      memberId: z.string(),
      monthlyContribution: z.number(),
    })
  ).optional(),
  splitReasoning: z.string().optional(),
  warnings: z.array(z.string()),
});
export type PersonalizedPlanOutput = z.infer<typeof PersonalizedPlanOutputSchema>;

const personalizedFinancialPlanPrompt = ai.definePrompt({
  name: 'personalizedFinancialPlanPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: PersonalizedPlanPromptInputSchema},
  output: {schema: PersonalizedPlanOutputSchema},
  prompt: `Eres un asesor financiero experto en banca española. USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL.

Genera un plan de amortización basado en el MÉTODO FRANCÉS pero con AMORTIZACIÓN ANTICIPADA MENSUAL.

REGLAS DE CÁLCULO BANCARIO:
1. Interés Mensual = Capital Vivo * (TIN / 12 / 100).
2. De la cuota actual ({{existingMonthlyPayment}} €), resta el Interés Mensual para obtener el 'Principal Ordinario'.
3. El 'Aporte Extra' del usuario va DIRECTO a capital vivo (reducción de principal).
4. El nuevo Capital Vivo = Capital Anterior - Principal Ordinario - Aporte Extra.

REGLA DE REPARTO EN PAREJA/GRUPO (Si aplica):
- Si el método es 'proportional_income', divide el Aporte Extra total entre los miembros según el porcentaje de sus ingresos respecto al total.
- Si es 'equal', divide el Aporte Extra a partes iguales.

DATOS:
- Capital Vivo Inicial: {{goalTargetAmount}} €
- Cuota Bancaria Actual: {{existingMonthlyPayment}} €
- TIN: {{tin}}%
- Sobrante Neto Disponible: {{householdSurplus}} €
- Estrategia: {{strategy}}
- Miembros: {{#each members}}{{memberId}}: {{incomeNetMonthly}}€{{/each}}
- Método Reparto: {{splitMethod}}

Genera la tabla mensual detallada, los pasos matemáticos y el desglose de aportes individuales.`,
});

export async function generatePersonalizedPlan(input: PersonalizedPlanInput): Promise<PersonalizedPlanOutput> {
  const sharedCosts = input.totalFixedCostsMonthly + input.totalVariableCostsMonthly + input.totalMinLeisureCosts;
  const individualCostsTotal = input.members?.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0) + (m.individualMinLeisureCosts || 0), 0) || 0;
  const householdSurplus = input.totalIncomeNetMonthly - sharedCosts - individualCostsTotal;

  const {output} = await personalizedFinancialPlanPrompt({
    ...input,
    householdSurplus: householdSurplus,
  });
  return output!;
}
