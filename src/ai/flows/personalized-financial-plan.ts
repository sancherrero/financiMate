'use server';

/**
 * @fileOverview Flujo para generar un plan financiero personalizado.
 * Actualizado para manejar gastos individuales, asignación de deudas y reparto.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedPlanInputSchema = z.object({
  totalIncomeNetMonthly: z.number(),
  totalFixedCostsMonthly: z.number(), // Shared household
  totalVariableCostsMonthly: z.number(), // Shared household
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
  assignedTo: z.string().optional(), // 'shared' or memberId
  expenseMode: z.enum(['shared', 'individual']).optional(),
  members: z.array(
    z.object({
      memberId: z.string(),
      incomeNetMonthly: z.number(),
      individualFixedCosts: z.number().optional(),
      individualVariableCosts: z.number().optional(),
    })
  ).optional(),
});
export type PersonalizedPlanInput = z.infer<typeof PersonalizedPlanInputSchema>;

// Internal schema for the prompt to include calculated values
const PersonalizedPlanPromptInputSchema = PersonalizedPlanInputSchema.extend({
  monthlySurplus: z.number(),
  householdSurplus: z.number(), // Overall surplus after ALL costs
});

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
  input: {schema: PersonalizedPlanPromptInputSchema},
  output: {schema: PersonalizedPlanOutputSchema},
  prompt: `Eres un asesor financiero experto. USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL.

Genera un plan detallado considerando la estrategia del usuario y el método de reparto.

ANÁLISIS DE GASTOS Y NETO REAL:
- El 'householdSurplus' es lo que queda después de restar todos los gastos (fijos, variables, compartidos e individuales).
- Si hay gastos individuales por miembro, tenlos en cuenta para entender la capacidad de ahorro real de cada persona.

REGLA DE DEUDA CON INTERESES Y ASIGNACIÓN:
Si 'isExistingDebt' es true:
1. 'assignedTo' indica si la deuda es de una persona específica o compartida.
2. Si es de una persona específica, su capacidad de ahorro se ve reducida por la cuota mensual de esa deuda.
3. El plazo ('estimatedMonthsToGoal') debe ser preciso: Capital Pendiente / (Aporte Extra + Parte de la Cuota que amortiza Capital).

REGLA DE REPARTO (Split):
Si hay 'members' y un 'splitMethod':
- 'equal': El aporte extra se divide a partes iguales.
- 'proportional_income': El aporte extra se divide proporcionalmente al ingreso neto individual.
Calcula el 'monthlyContribution' exacto para cada 'memberId'.

Hitos (milestones):
- Define hitos basados en el tiempo y progreso.

Datos:
- Ingreso Total: {{totalIncomeNetMonthly}}
- Sobrante Total (Household Surplus): {{householdSurplus}}
- Meta: {{goalName}} ({{goalTargetAmount}}€)
- Estrategia: {{strategy}}
- Método Reparto: {{splitMethod}}
- Asignación Meta: {{assignedTo}}

Output en JSON:
{{outputSchema}}
`,
});

const personalizedFinancialPlanFlow = ai.defineFlow({
  name: 'personalizedFinancialPlanFlow',
  inputSchema: PersonalizedPlanInputSchema,
  outputSchema: PersonalizedPlanOutputSchema,
}, async (input) => {
  // Calculate total costs
  const sharedCosts = input.totalFixedCostsMonthly + input.totalVariableCostsMonthly;
  const individualCostsTotal = input.members?.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0), 0) || 0;
  
  const householdSurplus = input.totalIncomeNetMonthly - sharedCosts - individualCostsTotal;
  
  const {output} = await personalizedFinancialPlanPrompt({
    ...input,
    monthlySurplus: householdSurplus,
    householdSurplus: householdSurplus,
  });
  return output!;
});
