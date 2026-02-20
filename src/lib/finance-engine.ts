import { 
  FinancialSnapshot, 
  Goal, 
  PlanResult, 
  MonthlyPaymentDetail, 
  MathStep,
  FinancialStrategy,
  MultiPlanResult
} from './types';

/**
 * Calcula los tres planes de amortización posibles para ofrecer al usuario.
 */
export function calculateAllFinancialPlans(snapshot: FinancialSnapshot, goal: Goal, splitMethod: 'equal' | 'proportional_income'): MultiPlanResult {
  return {
    emergency_first: calculateSinglePlan(snapshot, goal, splitMethod, 'emergency_first'),
    balanced: calculateSinglePlan(snapshot, goal, splitMethod, 'balanced'),
    goal_first: calculateSinglePlan(snapshot, goal, splitMethod, 'goal_first'),
  };
}

function calculateSinglePlan(
  snapshot: FinancialSnapshot, 
  goal: Goal, 
  splitMethod: 'equal' | 'proportional_income',
  strategy: FinancialStrategy
): PlanResult {
  const totalIncome = snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts;
  const individualCostsTotal = snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0), 0);
  const householdSurplus = totalIncome - sharedCosts - individualCostsTotal;

  // Determinar factores según estrategia
  let debtEffortFactor = 0.5;
  let emergencyFactor = 0.5;
  
  if (strategy === 'goal_first') {
    debtEffortFactor = 0.95;
    emergencyFactor = 0.05;
  } else if (strategy === 'emergency_first') {
    debtEffortFactor = 0.25;
    emergencyFactor = 0.75;
  }

  const extraContribution = Math.max(0, Math.round(householdSurplus * debtEffortFactor));
  const emergencyContribution = Math.max(0, Math.round(householdSurplus * emergencyFactor));
  
  const tin = goal.tin || 0;
  const monthlyRate = (tin / 100) / 12;
  const existingPayment = goal.existingMonthlyPayment || 0;

  const monthlyTable: MonthlyPaymentDetail[] = [];
  let capitalVivo = goal.targetAmount;
  let currentEmergencyFund = snapshot.emergencyFundAmount;
  let totalInterest = 0;
  let month = 1;
  const maxMonths = 360;

  while (capitalVivo > 0 && month <= maxMonths) {
    const interest = capitalVivo * monthlyRate;
    totalInterest += interest;
    
    let regularPrincipal = Math.max(0, existingPayment - interest);
    if (regularPrincipal > capitalVivo) regularPrincipal = capitalVivo;
    
    let extra = extraContribution;
    if (extra > (capitalVivo - regularPrincipal)) {
      extra = Math.max(0, capitalVivo - regularPrincipal);
    }

    const totalPaid = interest + regularPrincipal + extra;
    capitalVivo = Math.max(0, capitalVivo - regularPrincipal - extra);
    
    // El fondo de emergencia crece independientemente de si la deuda se liquida ese mes
    currentEmergencyFund += emergencyContribution;

    monthlyTable.push({
      month,
      interestPaid: Number(interest.toFixed(2)),
      regularPrincipalPaid: Number(regularPrincipal.toFixed(2)),
      extraPrincipalPaid: Number(extra.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      remainingPrincipal: Number(capitalVivo.toFixed(2)),
      emergencyFundContribution: emergencyContribution,
      cumulativeEmergencyFund: Number(currentEmergencyFund.toFixed(2))
    });

    if (capitalVivo <= 0) break;
    month++;
  }

  // Lógica de reparto para el aporte extra
  const split: { memberId: string; monthlyContribution: number }[] = [];
  if (snapshot.members.length > 1) {
    snapshot.members.forEach(m => {
      const ratio = totalIncome > 0 ? (m.incomeNetMonthly / totalIncome) : (1 / snapshot.members.length);
      split.push({
        memberId: m.id,
        monthlyContribution: Math.round(extraContribution * ratio)
      });
    });
  }

  const mathSteps: MathStep[] = [
    { label: "Sobrante Mensual", operation: `${totalIncome}€ (Ingresos) - ${sharedCosts + individualCostsTotal}€ (Gastos)`, result: `${householdSurplus}€` },
    { label: `Esfuerzo ${strategy}`, operation: `${householdSurplus}€ * ${debtEffortFactor * 100}%`, result: `${extraContribution}€ extra/mes` },
    { label: "Fondo Emergencia", operation: `${householdSurplus}€ * ${emergencyFactor * 100}%`, result: `${emergencyContribution}€/mes` }
  ];

  return {
    snapshot,
    goal,
    strategy,
    monthlySurplus: householdSurplus,
    monthlyContributionExtra: extraContribution,
    monthlyEmergencyContribution: emergencyContribution,
    estimatedMonthsToGoal: monthlyTable.length,
    totalInterestPaid: Number(totalInterest.toFixed(2)),
    totalEmergencySaved: Number((currentEmergencyFund - snapshot.emergencyFundAmount).toFixed(2)),
    recommendations: [],
    explanations: [],
    milestones: [],
    mathSteps,
    monthlyTable,
    split,
    warnings: []
  };
}
