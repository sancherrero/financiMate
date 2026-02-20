
import { 
  FinancialSnapshot, 
  Goal, 
  PlanResult, 
  MonthlyPaymentDetail, 
  MathStep, 
  Member 
} from './types';

/**
 * Calcula el plan de amortización utilizando el Método Francés con Amortización Anticipada.
 */
export function calculateFinancialPlan(snapshot: FinancialSnapshot, goal: Goal, splitMethod: 'equal' | 'proportional_income'): PlanResult {
  const totalIncome = snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts;
  const individualCostsTotal = snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0), 0);
  const householdSurplus = totalIncome - sharedCosts - individualCostsTotal;

  // Determinar factor de esfuerzo según estrategia
  let effortFactor = 0.5;
  if (goal.strategy === 'goal_first') effortFactor = 0.95;
  if (goal.strategy === 'emergency_first') effortFactor = 0.25;

  const extraContribution = Math.max(0, Math.round(householdSurplus * effortFactor));
  const tin = goal.tin || 0;
  const monthlyRate = (tin / 100) / 12;
  const existingPayment = goal.existingMonthlyPayment || 0;

  const monthlyTable: MonthlyPaymentDetail[] = [];
  let capitalVivo = goal.targetAmount;
  let month = 1;
  const maxMonths = 360; // Límite de seguridad de 30 años

  while (capitalVivo > 0 && month <= maxMonths) {
    const interest = capitalVivo * monthlyRate;
    let regularPrincipal = Math.max(0, existingPayment - interest);
    
    if (regularPrincipal > capitalVivo) regularPrincipal = capitalVivo;
    
    let extra = extraContribution;
    if (extra > (capitalVivo - regularPrincipal)) {
      extra = Math.max(0, capitalVivo - regularPrincipal);
    }

    const totalPaid = interest + regularPrincipal + extra;
    const prevCapital = capitalVivo;
    capitalVivo = Math.max(0, capitalVivo - regularPrincipal - extra);

    monthlyTable.push({
      month,
      interestPaid: Number(interest.toFixed(2)),
      regularPrincipalPaid: Number(regularPrincipal.toFixed(2)),
      extraPrincipalPaid: Number(extra.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      remainingPrincipal: Number(capitalVivo.toFixed(2))
    });

    if (capitalVivo <= 0) break;
    month++;
  }

  // Lógica de reparto
  const split: { memberId: string; monthlyContribution: number }[] = [];
  let splitReasoning = "Plan individual.";

  if (snapshot.members.length > 1) {
    if (splitMethod === 'proportional_income') {
      snapshot.members.forEach(m => {
        const ratio = totalIncome > 0 ? (m.incomeNetMonthly / totalIncome) : (1 / snapshot.members.length);
        split.push({
          memberId: m.id,
          monthlyContribution: Math.round(extraContribution * ratio)
        });
      });
      splitReasoning = "Reparto proporcional: Cada miembro aporta según el peso de su sueldo en el presupuesto total del hogar.";
    } else {
      const share = Math.round(extraContribution / snapshot.members.length);
      snapshot.members.forEach(m => {
        split.push({
          memberId: m.id,
          monthlyContribution: share
        });
      });
      splitReasoning = "Reparto equitativo: Todos los miembros aportan la misma cantidad para alcanzar el objetivo común.";
    }
  }

  // Recomendaciones y explicaciones basadas en reglas
  const recommendations: string[] = [];
  const explanations: string[] = [];

  if (goal.strategy === 'emergency_first') {
    recommendations.push("Prioridad: Seguridad Financiera");
    explanations.push("Estamos destinando una parte menor al ahorro extra para asegurar que vuestro colchón de imprevistos crezca primero.");
  } else if (goal.strategy === 'goal_first') {
    recommendations.push("Aceleración de Meta");
    explanations.push("Se está aplicando el máximo esfuerzo posible para minimizar el pago de intereses bancarios y liquidar la deuda cuanto antes.");
  }

  if (tin > 5) {
    recommendations.push("Alerta de Interés Alto");
    explanations.push(`Con un TIN del ${tin}%, cada euro amortizado extra hoy os ahorra mucho más que en una cuenta de ahorro convencional.`);
  }

  // Pasos matemáticos para validación
  const mathSteps: MathStep[] = [
    { 
      label: "Ingresos Totales", 
      operation: snapshot.members.map(m => `${m.name}: ${m.incomeNetMonthly}€`).join(" + "), 
      result: `${totalIncome}€` 
    },
    { 
      label: "Gastos Totales", 
      operation: `Compartidos (${sharedCosts}€) + Indiv. (${individualCostsTotal}€)`, 
      result: `${sharedCosts + individualCostsTotal}€` 
    },
    { 
      label: "Sobrante Mensual", 
      operation: `${totalIncome}€ - ${sharedCosts + individualCostsTotal}€`, 
      result: `${householdSurplus}€` 
    },
    { 
      label: "Aporte Extra Calculado", 
      operation: `${householdSurplus}€ * ${effortFactor * 100}% (Estrategia ${goal.strategy})`, 
      result: `${extraContribution}€` 
    },
    {
      label: "Esfuerzo Total Amortización",
      operation: `Cuota Actual (${existingPayment}€) + Aporte Extra (${extraContribution}€)`,
      result: `${existingPayment + extraContribution}€/mes`
    }
  ];

  return {
    snapshot,
    goal,
    monthlySurplus: householdSurplus,
    priority: goal.strategy as any,
    monthlyContributionTotal: extraContribution,
    estimatedMonthsToGoal: monthlyTable.length,
    recommendations,
    explanations,
    milestones: [
      { month: 1, label: "Arranque del Plan", description: "Primer pago realizado con éxito." },
      { month: Math.ceil(monthlyTable.length / 2), label: "Ecuador de la Meta", description: "Habéis superado la mitad del camino." },
      { month: monthlyTable.length, label: "Meta Alcanzada", description: "La deuda ha sido liquidada por completo." }
    ],
    mathSteps,
    monthlyTable,
    split,
    splitReasoning,
    warnings: []
  };
}
