'use server';

/**
 * @fileOverview Flujo para generar un plan financiero con realismo bancario (Método Francés).
 * Incluye lógica de amortización anticipada y desglose por miembros del hogar.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MonthlyPaymentDetail } from '@/lib/types';

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
    interestPaid: z.number(),
    regularPrincipalPaid: z.number(),
    extraPrincipalPaid: z.number(),
    totalPaid: z.number(),
    remainingPrincipal: z.number(),
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
- Explica brevemente el razonamiento en 'splitReasoning' (ej: "Juan aporta el 60% por ganar 2000€ de los 3333€ totales").

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
    console.warn("AI fallback for banking logic", error);
    
    const tin = input.tin || 0;
    const monthlyRate = (tin / 100) / 12;
    const existingPayment = input.existingMonthlyPayment || 0;
    
    let factor = 0.5;
    if (input.strategy === 'goal_first') factor = 0.95;
    if (input.strategy === 'emergency_first') factor = 0.2;
    const extraContribution = Math.max(0, Math.round(householdSurplus * factor));

    const monthlyTable: MonthlyPaymentDetail[] = [];
    let capitalVivo = input.goalTargetAmount || 0;
    let month = 1;
    const maxMonths = 360;

    // Si no hay deuda, crear una entrada vacía de seguridad
    if (capitalVivo <= 0) {
      capitalVivo = 0;
    }

    while (capitalVivo > 0 && month <= maxMonths) {
      const interest = capitalVivo * monthlyRate;
      let regularPrincipal = Math.max(0, existingPayment - interest);
      if (regularPrincipal > capitalVivo) regularPrincipal = capitalVivo;
      
      let extra = extraContribution;
      if (extra > (capitalVivo - regularPrincipal)) {
        extra = Math.max(0, capitalVivo - regularPrincipal);
      }

      const totalPaidThisMonth = interest + regularPrincipal + extra;
      capitalVivo = Math.max(0, capitalVivo - regularPrincipal - extra);

      monthlyTable.push({
        month: month,
        interestPaid: Math.round(interest * 100) / 100,
        regularPrincipalPaid: Math.round(regularPrincipal * 100) / 100,
        extraPrincipalPaid: Math.round(extra * 100) / 100,
        totalPaid: Math.round(totalPaidThisMonth * 100) / 100,
        remainingPrincipal: Math.round(capitalVivo * 100) / 100
      });

      if (capitalVivo <= 0) break;
      month++;
    }

    // Lógica de reparto manual en fallback
    const split: { memberId: string; monthlyContribution: number }[] = [];
    let splitReasoning = "Plan individual.";

    if (input.members && input.members.length > 1) {
      if (input.splitMethod === 'proportional_income') {
        const totalIncome = input.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
        input.members.forEach(m => {
          const ratio = totalIncome > 0 ? (m.incomeNetMonthly / totalIncome) : (1 / input.members!.length);
          split.push({
            memberId: m.memberId,
            monthlyContribution: Math.round(extraContribution * ratio)
          });
        });
        splitReasoning = "Reparto proporcional: Cada miembro aporta según el peso de su sueldo en el hogar.";
      } else {
        const share = Math.round(extraContribution / input.members.length);
        input.members.forEach(m => {
          split.push({
            memberId: m.memberId,
            monthlyContribution: share
          });
        });
        splitReasoning = "Reparto equitativo: Todos los miembros aportan la misma cantidad independientemente de su sueldo.";
      }
    }

    // Seguridad: Si la tabla está vacía (deuda 0), devolvemos hitos vacíos o informativos
    const hasData = monthlyTable.length > 0;

    return {
      monthlySurplus: householdSurplus,
      priority: input.strategy,
      monthlyContributionExtra: extraContribution,
      estimatedMonthsToGoal: hasData ? monthlyTable.length : 0,
      recommendations: ["Plan bancario realista calculado con método francés y amortización anticipada."],
      milestones: hasData ? [
        { 
          month: 1, 
          label: "Primer Pago Amortizado", 
          description: `Intereses: €${monthlyTable[0].interestPaid}. Ahorro principal: €${(monthlyTable[0].regularPrincipalPaid + monthlyTable[0].extraPrincipalPaid).toFixed(2)}` 
        },
        { 
          month: monthlyTable.length, 
          label: "Deuda Liquidada", 
          description: "Meta alcanzada con éxito." 
        }
      ] : [
        { month: 0, label: "Sin deuda pendiente", description: "No se requiere plan de amortización." }
      ],
      mathSteps: [
        { label: "Sobrante Real", operation: `Ingresos (${input.totalIncomeNetMonthly}€) - Gastos (${(sharedCosts + individualCostsTotal).toFixed(2)}€)`, result: `${householdSurplus.toFixed(2)}€` },
        { label: "Esfuerzo Aplicado", operation: `Estrategia ${input.strategy} (${Math.round(factor * 100)}%)`, result: `€${extraContribution}/mes` }
      ],
      monthlyTable,
      split,
      splitReasoning,
      warnings: []
    };
  }
}
