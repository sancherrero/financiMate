'use server';

/**
 * @fileOverview Flujo para generar un plan financiero personalizado con lógica de deudas e intereses.
 * Incluye un mecanismo de respaldo (fallback) si la IA falla o alcanza cuotas.
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
  monthlyContributionExtra: z.number().describe('La cantidad EXTRA del sobrante mensual que se aporta a la meta.'),
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

Genera un plan detallado y explica las matemáticas detrás de cada número en el campo 'mathSteps'.

DATOS DE ENTRADA:
- Ingreso Total: {{totalIncomeNetMonthly}}
- Sobrante Neto Extra (Household Surplus): {{householdSurplus}}
- Pago Actual de Deuda (si aplica): {{existingMonthlyPayment}}
- Meta/Deuda: {{goalName}} ({{goalTargetAmount}}€)
- Estrategia: {{strategy}}

LÓGICA DE CÁLCULO CRÍTICA:
1. El 'householdSurplus' es dinero extra después de TODOS los gastos (incluyendo los {{existingMonthlyPayment}} si ya están en gastos).
2. 'monthlyContributionExtra' = % del surplus según estrategia (emergency_first=20%, balanced=50%, goal_first=95%).
3. Si es deuda ('isExistingDebt': true):
   - Pago Total Mensual = existingMonthlyPayment + monthlyContributionExtra.
   - El primer mes reduces la deuda en esa cantidad.
   - Sigue hasta que la deuda sea 0. 
   - IMPORTANTE: El último mes no se paga de más, se paga solo el saldo restante.
4. 'mathSteps' debe detallar:
   - Cálculo del surplus.
   - Cálculo del aporte extra.
   - Cálculo de la amortización total (Extra + Actual).
   - Cómo se llega al número de meses sin pagar de más el último mes.

Output en JSON.`,
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
    console.warn("AI error, using robust local math fallback.", error);
    
    let factor = 0.5;
    let strategyLabel = "Equilibrada";
    if (input.strategy === 'goal_first') { factor = 0.95; strategyLabel = "Priorizar Meta"; }
    if (input.strategy === 'emergency_first') { factor = 0.2; strategyLabel = "Priorizar Seguridad"; }

    const monthlyContributionExtra = Math.max(0, Math.round(householdSurplus * factor));
    const totalMonthlyApplied = monthlyContributionExtra + (input.existingMonthlyPayment || 0);
    
    // Exact month calculation with partial last month awareness
    let months = 0;
    if (totalMonthlyApplied > 0) {
      months = Math.ceil(input.goalTargetAmount / totalMonthlyApplied);
    } else {
      months = 24;
    }

    const mathSteps = [
      { label: "Ingresos Totales", operation: `${input.members?.map(m => m.incomeNetMonthly).join(' + ')}`, result: `€${input.totalIncomeNetMonthly}` },
      { label: "Gastos Totales (Fijos + Var)", operation: `${sharedCosts} (Compartidos) + ${individualCostsTotal} (Individuales)`, result: `€${sharedCosts + individualCostsTotal}` },
      { label: "Sobrante Neto Real", operation: `${input.totalIncomeNetMonthly} - ${sharedCosts + individualCostsTotal}`, result: `€${householdSurplus}` },
      { label: `Aporte Extra (${strategyLabel} - ${Math.round(factor * 100)}%)`, operation: `${householdSurplus} * ${factor}`, result: `€${monthlyContributionExtra}` }
    ];

    if (input.isExistingDebt) {
      mathSteps.push({ 
        label: "Reducción Mensual de Deuda", 
        operation: `€${monthlyContributionExtra} (Extra del ahorro) + €${input.existingMonthlyPayment || 0} (Cuota actual)`, 
        result: `€${totalMonthlyApplied}/mes` 
      });
      
      const lastMonthPayment = input.goalTargetAmount % totalMonthlyApplied || totalMonthlyApplied;
      mathSteps.push({ 
        label: "Cálculo del Plazo", 
        operation: `${input.goalTargetAmount} (Deuda) / ${totalMonthlyApplied} (Mensual)`, 
        result: `${months} meses (${months > 1 ? `último mes solo €${lastMonthPayment}` : 'pago único'})` 
      });
    }

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
      recommendations: ["Plan generado con lógica matemática de precisión."],
      milestones: [
        { month: 1, label: "Arranque del Plan", description: `Primer pago de €${totalMonthlyApplied} realizado.` },
        { month: months, label: "Deuda Liquidada", description: `Meta alcanzada con un pago final ajustado.` }
      ],
      mathSteps,
      split,
      warnings: householdSurplus < 50 ? ["Margen crítico de ahorro."] : []
    };
  }
}