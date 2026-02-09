'use server';

/**
 * @fileOverview Flujo para generar un plan financiero personalizado con lógica de deudas e intereses.
 * Incluye un mecanismo de respaldo (fallback) si la IA alcanza su límite de cuota.
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
    })
  ).optional(),
});
export type PersonalizedPlanInput = z.infer<typeof PersonalizedPlanInputSchema>;

const PersonalizedPlanPromptInputSchema = PersonalizedPlanInputSchema.extend({
  monthlySurplus: z.number(),
  householdSurplus: z.number(),
});

const PersonalizedPlanOutputSchema = z.object({
  monthlySurplus: z.number(),
  priority: z.string(),
  monthlyContributionExtra: z.number().describe('La cantidad EXTRA del sobrante mensual que se aporta a la meta.'),
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

const personalizedFinancialPlanPrompt = ai.definePrompt({
  name: 'personalizedFinancialPlanPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: PersonalizedPlanPromptInputSchema},
  output: {schema: PersonalizedPlanOutputSchema},
  prompt: `Eres un asesor financiero experto. USA EXCLUSIVAMENTE EL IDIOMA ESPAÑOL.

Genera un plan detallado considerando la estrategia del usuario y el método de reparto.

ANÁLISIS DE GASTOS Y NETO REAL:
- El 'householdSurplus' es lo que queda después de restar todos los gastos (fijos, variables, compartidos e individuales).
- IMPORTANTE: Si 'isExistingDebt' es true, la 'existingMonthlyPayment' YA ESTÁ restada de los gastos. Por tanto, el 'householdSurplus' es dinero ADICIONAL.

REGLA DE AMORTIZACIÓN:
Si es una deuda ('isExistingDebt': true):
1. El pago total mensual a la deuda será: existingMonthlyPayment + monthlyContributionExtra.
2. El plazo ('estimatedMonthsToGoal') se calcula como: goalTargetAmount / (pago total mensual). Ajusta por intereses si TIN/TAE es alto.

REGLA DE ESTRATEGIA:
- 'emergency_first': monthlyContributionExtra debe ser bajo (aprox 20% del surplus) hasta que el fondo de emergencia sea 3-6 veces los gastos.
- 'balanced': monthlyContributionExtra es aprox el 50% del surplus.
- 'goal_first': monthlyContributionExtra es aprox el 90-100% del surplus.

Datos:
- Ingreso Total: {{totalIncomeNetMonthly}}
- Sobrante Neto Extra (Household Surplus): {{householdSurplus}}
- Pago Actual de Deuda (si aplica): {{existingMonthlyPayment}}
- Meta: {{goalName}} ({{goalTargetAmount}}€)
- Estrategia: {{strategy}}

Output en JSON siguiendo estrictamente el esquema.
`,
});

export async function generatePersonalizedPlan(input: PersonalizedPlanInput): Promise<PersonalizedPlanOutput> {
  const sharedCosts = input.totalFixedCostsMonthly + input.totalVariableCostsMonthly;
  const individualCostsTotal = input.members?.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0), 0) || 0;
  
  const householdSurplus = input.totalIncomeNetMonthly - sharedCosts - individualCostsTotal;

  try {
    const {output} = await personalizedFinancialPlanPrompt({
      ...input,
      monthlySurplus: householdSurplus,
      householdSurplus: householdSurplus,
    });
    return output!;
  } catch (error) {
    console.warn("IA Quota exceeded or error, using local fallback logic.", error);
    
    // Mejor lógica de fallback matemática
    let contributionFactor = 0.5; // Balanced default
    if (input.strategy === 'goal_first') contributionFactor = 0.95;
    if (input.strategy === 'emergency_first') contributionFactor = 0.2;

    const monthlyContributionExtra = householdSurplus > 0 ? Math.round(householdSurplus * contributionFactor) : 0;
    
    // Si es deuda, sumamos el pago actual para calcular el plazo real
    const totalMonthlyApplied = monthlyContributionExtra + (input.existingMonthlyPayment || 0);
    const months = totalMonthlyApplied > 0 ? Math.ceil(input.goalTargetAmount / totalMonthlyApplied) : 24;

    const split = input.members?.map(m => {
      let contrib = 0;
      if (input.splitMethod === 'equal') {
        contrib = monthlyContributionExtra / (input.members?.length || 1);
      } else {
        contrib = (m.incomeNetMonthly / input.totalIncomeNetMonthly) * monthlyContributionExtra;
      }
      return { memberId: m.memberId, monthlyContribution: Math.round(contrib) };
    });

    return {
      monthlySurplus: householdSurplus,
      priority: input.strategy,
      monthlyContributionExtra,
      estimatedMonthsToGoal: months,
      recommendations: [
        "Revisa tus gastos hormiga mensuales para aumentar el ahorro.",
        "Automatiza esta transferencia a principio de mes.",
        "Considera renegociar las condiciones de tus servicios fijos."
      ],
      milestones: [
        { month: 1, label: "Arranque", description: "Primer mes de ahorro completado." },
        { month: Math.max(1, Math.ceil(months/2)), label: "Ecuador", description: "Has alcanzado la mitad de tu objetivo." },
        { month: months, label: "Meta", description: "¡Objetivo alcanzado!" }
      ],
      split,
      warnings: householdSurplus < 100 ? ["Tu margen de ahorro es muy bajo. Extrema la precaución."] : []
    };
  }
}
