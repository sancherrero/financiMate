import { 
  FinancialSnapshot, 
  Goal, 
  PlanResult, 
  MonthlyPaymentDetail, 
  MathStep,
  FinancialStrategy,
  MultiPlanResult
} from './types';

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
  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts + (snapshot.totalMinLeisureCosts || 0);
  const individualCostsTotal = snapshot.members.reduce((acc, m) => 
    acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0) + (m.individualMinLeisureCosts || 0), 0
  );
  
  const householdSurplus = totalIncome - sharedCosts - individualCostsTotal;
  const alreadySavingInExpenses = snapshot.emergencyFundIncludedInExpenses + snapshot.members.reduce((acc, m) => acc + (m.individualEmergencyFundIncluded || 0), 0);

  let debtEffortFactor = 0.5;
  let extraEmergencyFactor = 0.5;
  
  if (strategy === 'goal_first') {
    debtEffortFactor = 0.95;
    extraEmergencyFactor = 0.05;
  } else if (strategy === 'emergency_first') {
    debtEffortFactor = 0.25;
    extraEmergencyFactor = 0.75;
  }

  const extraDebtContribution = Math.max(0, Math.round(householdSurplus * debtEffortFactor));
  const extraEmergencyFromSurplus = Math.max(0, Math.round(householdSurplus * extraEmergencyFactor));
  
  // Total que va al fondo cada mes = Lo que ya estaba en gastos + lo que sacamos del sobrante
  const totalMonthlyEmergencyContribution = alreadySavingInExpenses + extraEmergencyFromSurplus;
  
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
    
    let extra = extraDebtContribution;
    if (extra > (capitalVivo - regularPrincipal)) {
      extra = Math.max(0, capitalVivo - regularPrincipal);
    }

    const totalPaid = interest + regularPrincipal + extra;
    capitalVivo = Math.max(0, capitalVivo - regularPrincipal - extra);
    
    currentEmergencyFund += totalMonthlyEmergencyContribution;

    monthlyTable.push({
      month,
      interestPaid: Number(interest.toFixed(2)),
      regularPrincipalPaid: Number(regularPrincipal.toFixed(2)),
      extraPrincipalPaid: Number(extra.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      remainingPrincipal: Number(capitalVivo.toFixed(2)),
      emergencyFundContribution: totalMonthlyEmergencyContribution,
      cumulativeEmergencyFund: Number(currentEmergencyFund.toFixed(2))
    });

    if (capitalVivo <= 0) break;
    month++;
  }

  const split: { memberId: string; monthlyContribution: number }[] = [];
  if (snapshot.members.length > 1) {
    snapshot.members.forEach(m => {
      const ratio = totalIncome > 0 ? (m.incomeNetMonthly / totalIncome) : (1 / snapshot.members.length);
      split.push({
        memberId: m.id,
        monthlyContribution: Math.round(extraDebtContribution * ratio)
      });
    });
  }

  const totalMinLeisure = (snapshot.totalMinLeisureCosts || 0) + snapshot.members.reduce((acc, m) => acc + (m.individualMinLeisureCosts || 0), 0);
  const totalEssentials = sharedCosts + individualCostsTotal - totalMinLeisure;

  const mathSteps: MathStep[] = [
    { label: "Suma de Ingresos", operation: snapshot.members.map(m => `${m.name}: ${m.incomeNetMonthly}€`).join(' + '), result: `${totalIncome}€` },
    { label: "Gastos Básicos", operation: `Incluyendo €${alreadySavingInExpenses} que ya ahorras para emergencias`, result: `${totalEssentials}€` },
    { label: "Ocio Mínimo", operation: `Presupuesto blindado`, result: `${totalMinLeisure}€` },
    { label: "Sobrante Real", operation: `Ingresos - Básicos - Ocio`, result: `${householdSurplus}€` },
    { label: "Ahorro Fondo Emergencia", operation: `€${alreadySavingInExpenses} (gastos) + €${extraEmergencyFromSurplus} (sobrante)`, result: `${totalMonthlyEmergencyContribution}€/mes` },
    { label: `Extra a Meta (${strategy})`, operation: `${householdSurplus}€ * ${debtEffortFactor * 100}%`, result: `${extraDebtContribution}€/mes` }
  ];

  return {
    snapshot,
    goal,
    strategy,
    monthlySurplus: householdSurplus,
    monthlyContributionExtra: extraDebtContribution,
    monthlyEmergencyContribution: totalMonthlyEmergencyContribution,
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
