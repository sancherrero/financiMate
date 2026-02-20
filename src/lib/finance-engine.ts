import { 
  FinancialSnapshot, 
  Goal, 
  PlanResult, 
  MonthlyPaymentDetail, 
  MathStep,
  FinancialStrategy,
  MultiPlanResult
} from './types';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

export function calculateAllFinancialPlans(snapshot: FinancialSnapshot, goal: Goal, splitMethod: 'equal' | 'proportional_income'): MultiPlanResult {
  return {
    emergency_first: calculateSinglePlan(snapshot, goal, splitMethod, 'emergency_first'),
    balanced: calculateSinglePlan(snapshot, goal, splitMethod, 'balanced'),
    goal_first: calculateSinglePlan(snapshot, goal, splitMethod, 'goal_first'),
  };
}

export function calculateSinglePlan(
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
  const alreadySavingInExpenses = (snapshot.emergencyFundIncludedInExpenses || 0) + snapshot.members.reduce((acc, m) => acc + (m.individualEmergencyFundIncluded || 0), 0);

  const targetEmergencyFund = snapshot.targetEmergencyFundAmount || (snapshot.totalFixedCosts * 3);
  const isFundInitiallyCompleted = snapshot.emergencyFundAmount >= targetEmergencyFund;

  let debtEffortFactor = 0.5;
  let extraEmergencyFactor = 0.5;
  
  if (strategy === 'goal_first') {
    debtEffortFactor = 0.95;
    extraEmergencyFactor = 0.05;
  } else if (strategy === 'emergency_first') {
    debtEffortFactor = 0.25;
    extraEmergencyFactor = 0.75;
  }

  // Si el fondo está completo desde el inicio, la estrategia es 100% deuda independientemente del nombre
  if (isFundInitiallyCompleted) {
    debtEffortFactor = 1;
    extraEmergencyFactor = 0;
  }

  const baseExtraDebtContribution = Math.max(0, Math.round(householdSurplus * debtEffortFactor));
  const baseExtraEmergencyContribution = Math.max(0, Math.round(householdSurplus * extraEmergencyFactor));
  
  const totalPotentialEmergencyMonthly = isFundInitiallyCompleted ? 0 : (alreadySavingInExpenses + baseExtraEmergencyContribution);
  
  const tin = goal.tin || 0;
  const monthlyRate = (tin / 100) / 12;
  const existingPayment = goal.existingMonthlyPayment || 0;

  const monthlyTable: MonthlyPaymentDetail[] = [];
  let capitalVivo = goal.targetAmount;
  let currentEmergencyFund = snapshot.emergencyFundAmount;
  let totalInterest = 0;
  let month = 1;
  const maxMonths = 360;

  const startDate = snapshot.startDate ? new Date(snapshot.startDate) : new Date();

  while (capitalVivo > 0 && month <= maxMonths) {
    const interest = capitalVivo * monthlyRate;
    totalInterest += interest;
    
    let regularPrincipal = Math.max(0, existingPayment - interest);
    if (regularPrincipal > capitalVivo) regularPrincipal = capitalVivo;
    
    let currentBaseEmergency = alreadySavingInExpenses;
    let currentExtraEmergency = baseExtraEmergencyContribution;
    let currentExtraDebt = baseExtraDebtContribution;

    // Lógica de desbordamiento (Overflow)
    if (currentEmergencyFund >= targetEmergencyFund) {
      currentExtraDebt += currentBaseEmergency + currentExtraEmergency;
      currentBaseEmergency = 0;
      currentExtraEmergency = 0;
    } else {
      const remainingToTarget = targetEmergencyFund - currentEmergencyFund;
      const totalEmergencyAttempt = currentBaseEmergency + currentExtraEmergency;

      if (totalEmergencyAttempt > remainingToTarget) {
        const overflow = totalEmergencyAttempt - remainingToTarget;
        currentExtraDebt += overflow;
        const ratio = remainingToTarget / totalEmergencyAttempt;
        currentBaseEmergency *= ratio;
        currentExtraEmergency *= ratio;
      }
    }

    if (currentExtraDebt > (capitalVivo - regularPrincipal)) {
      currentExtraDebt = Math.max(0, capitalVivo - regularPrincipal);
    }

    const totalPaid = interest + regularPrincipal + currentExtraDebt;
    capitalVivo = Math.max(0, capitalVivo - regularPrincipal - currentExtraDebt);
    currentEmergencyFund += (currentBaseEmergency + currentExtraEmergency);

    const currentMonthDate = addMonths(startDate, month - 1);

    monthlyTable.push({
      month,
      monthName: format(currentMonthDate, "MMMM yyyy", { locale: es }),
      interestPaid: Number(interest.toFixed(2)),
      regularPrincipalPaid: Number(regularPrincipal.toFixed(2)),
      extraPrincipalPaid: Number(currentExtraDebt.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      remainingPrincipal: Number(capitalVivo.toFixed(2)),
      baseEmergencyContribution: Number(currentBaseEmergency.toFixed(2)),
      extraEmergencyContribution: Number(currentExtraEmergency.toFixed(2)),
      emergencyFundContribution: Number((currentBaseEmergency + currentExtraEmergency).toFixed(2)),
      cumulativeEmergencyFund: Number(currentEmergencyFund.toFixed(2))
    });

    if (capitalVivo <= 0) break;
    month++;
  }

  const warnings: string[] = [];
  if (isFundInitiallyCompleted) {
    warnings.push("Fondo de emergencia ya completado. El plan prioriza el ahorro de la meta al 100%.");
  }

  const split: { memberId: string; monthlyContribution: number }[] = [];
  if (snapshot.members.length > 1) {
    snapshot.members.forEach(m => {
      const ratio = totalIncome > 0 ? (m.incomeNetMonthly / totalIncome) : (1 / snapshot.members.length);
      split.push({
        memberId: m.id,
        monthlyContribution: Math.round(baseExtraDebtContribution * ratio)
      });
    });
  }

  const mathSteps: MathStep[] = [
    { label: "Ingresos Hogar", operation: `${totalIncome}€ netos`, result: `${totalIncome}€` },
    { label: "Sobrante Real", operation: `Ingresos - Gastos - Ocio`, result: `${householdSurplus}€` },
    { label: `Extra a Meta (${isFundInitiallyCompleted ? 'Acelerado' : strategy})`, operation: `${householdSurplus}€ * ${debtEffortFactor * 100}%`, result: `${baseExtraDebtContribution}€/mes` }
  ];

  if (alreadySavingInExpenses > 0) {
    mathSteps.push({
      label: "Ahorro Base Redirigido",
      operation: isFundInitiallyCompleted ? "Fondo completo: se suma a la meta" : "Incluido en gastos para el fondo",
      result: `${alreadySavingInExpenses}€`
    });
  }

  const endDateISO = addMonths(startDate, monthlyTable.length > 0 ? monthlyTable.length - 1 : 0).toISOString();

  return {
    id: goal.id || 'plan_' + Math.random().toString(36).substr(2, 9),
    snapshot,
    goal,
    strategy,
    monthlySurplus: householdSurplus,
    monthlyContributionExtra: baseExtraDebtContribution,
    monthlyEmergencyContribution: totalPotentialEmergencyMonthly,
    estimatedMonthsToGoal: monthlyTable.length,
    totalInterestPaid: Number(totalInterest.toFixed(2)),
    totalEmergencySaved: Number(currentEmergencyFund.toFixed(2)),
    targetEmergencyFund,
    recommendations: [],
    explanations: [],
    milestones: [],
    mathSteps,
    monthlyTable,
    split,
    warnings,
    startDate: startDate.toISOString(),
    endDate: endDateISO
  };
}

export function recalculateRoadmap(items: PlanResult[]): PlanResult[] {
  if (items.length === 0) return [];
  
  const results: PlanResult[] = [];
  let prevPlan: PlanResult | null = null;

  for (const item of items) {
    let currentSnapshot = { ...item.snapshot };
    
    // If there was a previous plan, inherit its end state
    if (prevPlan) {
      const nextStart = addMonths(new Date(prevPlan.endDate), 1);
      currentSnapshot = {
        ...currentSnapshot,
        startDate: nextStart.toISOString(),
        emergencyFundAmount: prevPlan.totalEmergencySaved
      };
    }

    const newPlan = calculateSinglePlan(
      currentSnapshot,
      item.goal,
      'equal', // or store this in the plan result
      item.strategy
    );
    
    results.push(newPlan);
    prevPlan = newPlan;
  }

  return results;
}
