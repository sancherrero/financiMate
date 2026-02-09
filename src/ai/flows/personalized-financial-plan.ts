'use server';

/**
 * @fileOverview Flujo para generar un plan financiero personalizado con lógica de deudas y pagos equilibrados.
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
    fixedPayment: z.number(),
    extraContribution: z.number(),
    totalPayment: z.number(),
    remainingPrincipal: z.number(),
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

Genera un plan detallado donde los pagos mensuales sean EQUILIBRADOS. 

REGLA DE ORO DE EQUILIBRIO:
1. Calcula cuántos meses se necesitan según la capacidad máxima.
2. Divide el monto total ({{goalTargetAmount}}) entre esos meses para que todos los meses se pague lo mismo.
3. El pago mensual total equilibrado debe ser mayor o igual a la cuota actual ({{existingMonthlyPayment}}) pero menor o igual a la capacidad máxima (surplus + cuota actual).

DATOS:
- Sobrante Neto Extra (Household Surplus): {{householdSurplus}}
- Cuota Bancaria Actual: {{existingMonthlyPayment}}
- Meta/Deuda Total: {{goalTargetAmount}}
- Estrategia: {{strategy}}

Genera la tabla mensual detallada ('monthlyTable') y explica los pasos en 'mathSteps'.`,
});

export async function generatePersonalizedPlan(input: PersonalizedPlanInput): Promise<PersonalizedPlanOutput> {
  const sharedCosts = input.totalFixedCostsMonthly + input.totalVariableCostsMonthly;
  const individualCostsTotal = input.members?.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0), 0) || 0;
  const householdSurplus = input.totalIncomeNetMonthly - sharedCosts - individualCostsTotal;

  try {
    const {output} = await personalizedFinancialPlanPrompt({
      ...input,
      householdSurplus: householdSurplus,
    });
    return output!;
  } catch (error) {
    console.warn("AI fallback for balancing logic", error);
    
    let factor = 0.5;
    if (input.strategy === 'goal_first') factor = 0.95;
    if (input.strategy === 'emergency_first') factor = 0.2;

    const extraPossible = Math.max(0, Math.round(householdSurplus * factor));
    const maxMonthlyCapacity = extraPossible + (input.existingMonthlyPayment || 0);
    
    // Calculate months and balanced payment
    const months = maxMonthlyCapacity > 0 ? Math.ceil(input.goalTargetAmount / maxMonthlyCapacity) : 12;
    const balancedTotalPayment = Math.ceil(input.goalTargetAmount / months);
    const balancedExtraContribution = Math.max(0, balancedTotalPayment - (input.existingMonthlyPayment || 0));

    const monthlyTable = [];
    let currentPrincipal = input.goalTargetAmount;
    for (let i = 1; i <= months; i++) {
      const payment = Math.min(currentPrincipal, balancedTotalPayment);
      const extra = Math.max(0, payment - (input.existingMonthlyPayment || 0));
      currentPrincipal -= payment;
      monthlyTable.push({
        month: i,
        fixedPayment: input.existingMonthlyPayment || 0,
        extraContribution: Math.round(extra),
        totalPayment: Math.round(payment),
        remainingPrincipal: Math.max(0, Math.round(currentPrincipal))
      });
    }

    return {
      monthlySurplus: householdSurplus,
      priority: input.strategy,
      monthlyContributionExtra: balancedExtraContribution,
      estimatedMonthsToGoal: months,
      recommendations: ["Plan equilibrado generado para una carga constante."],
      milestones: [
        { month: 1, label: "Inicio de Amortización", description: `Pago inicial de €${balancedTotalPayment}` },
        { month: months, label: "Meta Alcanzada", description: "Deuda liquidada totalmente." }
      ],
      mathSteps: [
        { label: "Capacidad Máxima", operation: `${householdSurplus} (Surplus) + ${input.existingMonthlyPayment || 0} (Cuota)`, result: `€${maxMonthlyCapacity}/mes` },
        { label: "Cálculo de Plazo", operation: `${input.goalTargetAmount} / ${maxMonthlyCapacity}`, result: `${months} meses` },
        { label: "Pago Equilibrado", operation: `${input.goalTargetAmount} / ${months}`, result: `€${balancedTotalPayment}/mes` }
      ],
      monthlyTable,
      warnings: []
    };
  }
}
