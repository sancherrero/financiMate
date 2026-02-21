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
  strategy: FinancialStrategy,
  existingId?: string
): PlanResult {
  const totalIncome = snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
  
  // Prorrateo de gastos anuales
  const totalAnnualCosts = (snapshot.annualTaxesAndInsurance || 0) + 
    snapshot.members.reduce((acc, m) => acc + (m.annualTaxesAndInsurance || 0), 0);
  const monthlyProratedCost = Math.round(totalAnnualCosts / 12);

  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts + (snapshot.totalMinLeisureCosts || 0);
  const individualCostsTotal = snapshot.members.reduce((acc, m) => 
    acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0) + (m.individualMinLeisureCosts || 0), 0
  );
  
  // El sobrante neto ahora resta el prorrateo anual
  const householdSurplus = totalIncome - sharedCosts - individualCostsTotal - monthlyProratedCost;
  const alreadySavingInExpenses = (snapshot.emergencyFundIncludedInExpenses || 0) + snapshot.members.reduce((acc, m) => acc + (m.individualEmergencyFundIncluded || 0), 0);

  // Cálculo del Fondo de Emergencia basado en Supervivencia
  const survivalPercent = snapshot.survivalVariablePercent !== undefined ? snapshot.survivalVariablePercent / 100 : 1;
  const survivalExpenses = 
    snapshot.totalFixedCosts + 
    snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0), 0) +
    (snapshot.totalVariableCosts * survivalPercent) +
    snapshot.members.reduce((acc, m) => acc + ((m.individualVariableCosts || 0) * survivalPercent), 0);

  const targetEmergencyFund = snapshot.targetEmergencyFundAmount || Math.round(survivalExpenses * 3);
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
  let totalCommissionPaid = 0;
  let totalSavingsInterestEarned = 0;
  let month = 1;
  const maxMonths = 600;

  const startDate = snapshot.startDate ? new Date(snapshot.startDate) : new Date();

  while (capitalVivo > 0 && month <= maxMonths) {
    const interest = capitalVivo * monthlyRate;
    totalInterest += interest;
    
    let regularPrincipal = Math.max(0, existingPayment - interest);
    if (regularPrincipal > capitalVivo) regularPrincipal = capitalVivo;
    
    let currentBaseEmergency = alreadySavingInExpenses;
    let currentExtraEmergency = baseExtraEmergencyContribution;
    let currentExtraDebt = baseExtraDebtContribution;

    if (currentEmergencyFund >= targetEmergencyFund) {
      currentExtraDebt += (currentBaseEmergency + currentExtraEmergency);
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

    // Lógica de Comisión por Amortización Anticipada
    const commissionRate = (goal.earlyRepaymentCommission || 0) / 100;
    let netExtraDebt = currentExtraDebt;
    let currentCommissionPaid = 0;

    if (commissionRate > 0 && currentExtraDebt > 0) {
      netExtraDebt = currentExtraDebt / (1 + commissionRate);
      currentCommissionPaid = currentExtraDebt - netExtraDebt;
    }

    if (netExtraDebt > (capitalVivo - regularPrincipal)) {
      netExtraDebt = Math.max(0, capitalVivo - regularPrincipal);
      currentCommissionPaid = netExtraDebt * commissionRate;
    }

    const totalPaidThisMonth = interest + regularPrincipal + netExtraDebt + currentCommissionPaid;
    capitalVivo = Math.max(0, capitalVivo - regularPrincipal - netExtraDebt);
    totalCommissionPaid += currentCommissionPaid;

    // Lógica de Rentabilidad del Fondo de Emergencia (Interés Compuesto)
    const monthlyYieldRate = ((snapshot.savingsYieldRate || 0) / 100) / 12;
    const currentSavingsInterestEarned = currentEmergencyFund * monthlyYieldRate;
    currentEmergencyFund += currentSavingsInterestEarned;
    totalSavingsInterestEarned += currentSavingsInterestEarned;

    currentEmergencyFund += (currentBaseEmergency + currentExtraEmergency);

    const currentMonthDate = addMonths(startDate, month - 1);

    monthlyTable.push({
      month,
      monthName: format(currentMonthDate, "MMMM yyyy", { locale: es }),
      interestPaid: Number(interest.toFixed(2)),
      commissionPaid: Number(currentCommissionPaid.toFixed(2)),
      regularPrincipalPaid: Number(regularPrincipal.toFixed(2)),
      extraPrincipalPaid: Number(netExtraDebt.toFixed(2)),
      totalPaid: Number(totalPaidThisMonth.toFixed(2)),
      remainingPrincipal: Number(capitalVivo.toFixed(2)),
      baseEmergencyContribution: Number(currentBaseEmergency.toFixed(2)),
      extraEmergencyContribution: Number(currentExtraEmergency.toFixed(2)),
      emergencyFundContribution: Number((currentBaseEmergency + currentExtraEmergency).toFixed(2)),
      savingsInterestEarned: Number(currentSavingsInterestEarned.toFixed(2)),
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
    { label: "Gastos Anuales Prorrateados", operation: `${totalAnnualCosts}€ / 12 meses`, result: `-${monthlyProratedCost}€` },
    { label: "Sobrante Neto Real", operation: `Ingresos - Gastos - Prorrateo`, result: `${householdSurplus}€` },
    { label: `Extra a Meta (${isFundInitiallyCompleted ? 'Acelerado' : strategy})`, operation: `${householdSurplus}€ * ${debtEffortFactor * 100}%`, result: `${baseExtraDebtContribution}€/mes` }
  ];

  if (snapshot.savingsYieldRate && snapshot.savingsYieldRate > 0) {
    mathSteps.push({
      label: "Rentabilidad Ahorro",
      operation: `Interés Compuesto Anual`,
      result: `${snapshot.savingsYieldRate}% TAE`
    });
  }

  const endDateISO = addMonths(startDate, monthlyTable.length > 0 ? monthlyTable.length - 1 : 0).toISOString();
  const planId = existingId || ('plan_' + (goal.id || Date.now().toString()) + '_' + Math.random().toString(36).substring(2, 9));

  return {
    id: planId,
    snapshot,
    goal,
    strategy,
    splitMethod,
    monthlySurplus: householdSurplus,
    monthlyContributionExtra: baseExtraDebtContribution,
    monthlyEmergencyContribution: totalPotentialEmergencyMonthly,
    estimatedMonthsToGoal: monthlyTable.length,
    totalInterestPaid: Number(totalInterest.toFixed(2)),
    totalCommissionPaid: Number(totalCommissionPaid.toFixed(2)),
    totalSavingsInterestEarned: Number(totalSavingsInterestEarned.toFixed(2)),
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
      item.splitMethod || 'equal',
      item.strategy,
      item.id
    );
    
    results.push(newPlan);
    prevPlan = newPlan;
  }

  return results;
}
