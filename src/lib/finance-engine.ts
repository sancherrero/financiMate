import { 
  FinancialSnapshot, 
  Goal, 
  PlanResult, 
  MonthlyPaymentDetail, 
  MathStep,
  FinancialStrategy,
  MultiPlanResult,
  DebtPrioritization,
  PortfolioPlanResult,
  PortfolioMonthlyDetail,
  DebtMonthlyBreakdown,
  Roadmap
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
  
  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts + (snapshot.totalMinLeisureCosts || 0);
  const individualCostsTotal = snapshot.members.reduce((acc, m) => 
    acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0) + (m.individualMinLeisureCosts || 0), 0
  );
  
  const householdSurplus = totalIncome - sharedCosts - individualCostsTotal;
  const alreadySavingInExpenses = (snapshot.emergencyFundIncludedInExpenses || 0) + snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0), 0) > 0 ? (snapshot.emergencyFundIncludedInExpenses || 0) : 0; // Simplified check for inheritance context

  // Cálculo del Fondo de Emergencia (3 meses de fijos)
  const targetEmergencyFund = snapshot.targetEmergencyFundAmount || Math.round((snapshot.totalFixedCosts + snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0), 0)) * 3);
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
  const acceleratedExtraDebtContribution = Math.max(0, Math.round(householdSurplus * 1)); // Cuando el fondo está lleno, el esfuerzo es del 100%
  let fundCompletedAtMonth = isFundInitiallyCompleted ? 1 : 0;
  
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
      if (fundCompletedAtMonth === 0) fundCompletedAtMonth = month; // Registra el mes del salto
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
    const totalIncomeIncome = snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
    snapshot.members.forEach(m => {
      const ratio = totalIncomeIncome > 0 ? (m.incomeNetMonthly / totalIncomeIncome) : (1 / snapshot.members.length);
      split.push({
        memberId: m.id,
        monthlyContribution: Math.round(baseExtraDebtContribution * ratio)
      });
    });
  }

  const mathSteps: MathStep[] = [
    { label: "Ingresos Hogar", operation: `${totalIncome}€ netos`, result: `${totalIncome}€` },
    { label: "Gastos Totales", operation: `Fijos + Variables + Ocio`, result: `-${sharedCosts + individualCostsTotal}€` },
    { label: "Sobrante Neto Real", operation: `Ingresos - Gastos`, result: `${householdSurplus}€` },
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
    extraEmergencyContribution: baseExtraEmergencyContribution,
    acceleratedExtraDebtContribution,
    fundCompletedAtMonth,
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

export function calculateDebtPortfolio(
  snapshot: FinancialSnapshot, 
  debts: Goal[], 
  prioritization: DebtPrioritization, 
  strategy: FinancialStrategy
): PortfolioPlanResult {
  const totalIncome = snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts + (snapshot.totalMinLeisureCosts || 0);
  const individualCostsTotal = snapshot.members.reduce((acc, m) => 
    acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0) + (m.individualMinLeisureCosts || 0), 0
  );
  const householdSurplus = totalIncome - sharedCosts - individualCostsTotal;
  const alreadySavingInExpenses = (snapshot.emergencyFundIncludedInExpenses || 0);

  const sortedDebts = [...debts].sort((a, b) => {
    if (prioritization === 'avalanche') {
      return (b.tin || 0) - (a.tin || 0);
    } else {
      return a.targetAmount - b.targetAmount;
    }
  });

  const activeDebts = sortedDebts.map(d => ({ ...d, currentPrincipal: d.targetAmount }));
  const targetEmergencyFund = snapshot.targetEmergencyFundAmount || Math.round((snapshot.totalFixedCosts + snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0), 0)) * 3);
  
  let currentEmergencyFund = snapshot.emergencyFundAmount;
  let totalInterest = 0;
  let totalCommission = 0;
  let month = 1;
  const maxMonths = 600;
  const timeline: PortfolioMonthlyDetail[] = [];
  const warnings: string[] = [];
  const startDate = snapshot.startDate ? new Date(snapshot.startDate) : new Date();

  let debtEffortFactor = 0.5;
  if (strategy === 'goal_first') debtEffortFactor = 0.95;
  else if (strategy === 'emergency_first') debtEffortFactor = 0.25;

  while (activeDebts.some(d => d.currentPrincipal > 0) && month <= maxMonths) {
    const isFundFull = currentEmergencyFund >= targetEmergencyFund;
    const currentEffortFactor = isFundFull ? 1 : debtEffortFactor;
    const currentMonthBreakdown: DebtMonthlyBreakdown[] = [];

    let totalMinimumRequired = 0;
    activeDebts.forEach(d => {
      if (d.currentPrincipal > 0) {
        totalMinimumRequired += (d.existingMonthlyPayment || 0);
      }
    });

    if (totalMinimumRequired > householdSurplus) {
      warnings.push("Riesgo de impago: Las cuotas mínimas obligatorias superan el sobrante disponible del hogar.");
      break;
    }

    let currentEmergencyContribution = isFundFull ? 0 : Math.round((householdSurplus - totalMinimumRequired) * (1 - currentEffortFactor)) + alreadySavingInExpenses;
    
    const monthlyYieldRate = ((snapshot.savingsYieldRate || 0) / 100) / 12;
    const savingsInterest = currentEmergencyFund * monthlyYieldRate;
    currentEmergencyFund += savingsInterest;

    if (!isFundFull) {
      const remainingToTarget = targetEmergencyFund - currentEmergencyFund;
      if (currentEmergencyContribution > remainingToTarget) {
        currentEmergencyContribution = remainingToTarget;
      }
      currentEmergencyFund += currentEmergencyContribution;
    }

    let extraAvailableForDebts = Math.round((householdSurplus - totalMinimumRequired) * currentEffortFactor);
    if (isFundFull) {
       extraAvailableForDebts = householdSurplus - totalMinimumRequired;
    }

    let monthlyTotalInterest = 0;
    let monthlyTotalPrincipal = 0;
    let monthlyTotalExtra = 0;
    const debtBalances: Record<string, number> = {};

    activeDebts.forEach(d => {
      if (d.currentPrincipal <= 0) {
        debtBalances[d.id] = 0;
        return;
      }
      const interest = d.currentPrincipal * ((d.tin || 0) / 100 / 12);
      let principalFromMin = (d.existingMonthlyPayment || 0) - interest;
      if (principalFromMin > d.currentPrincipal) principalFromMin = d.currentPrincipal;
      
      d.currentPrincipal -= principalFromMin;
      monthlyTotalInterest += interest;
      monthlyTotalPrincipal += principalFromMin;
      totalInterest += interest;

      currentMonthBreakdown.push({
        goalId: d.id,
        name: d.name,
        interestPaid: Number(interest.toFixed(2)),
        principalFromMinPayment: Number(principalFromMin.toFixed(2)),
        extraPrincipalPaid: 0,
        commissionPaid: 0,
        remainingPrincipal: Number(d.currentPrincipal.toFixed(2))
      });
    });

    const targetDebt = activeDebts.find(d => d.currentPrincipal > 0);
    if (targetDebt && extraAvailableForDebts > 0) {
      const commissionRate = (targetDebt.earlyRepaymentCommission || 0) / 100;
      let netExtra = extraAvailableForDebts / (1 + commissionRate);
      
      if (netExtra > targetDebt.currentPrincipal) {
        netExtra = targetDebt.currentPrincipal;
      }
      
      const commission = netExtra * commissionRate;
      targetDebt.currentPrincipal -= netExtra;
      monthlyTotalExtra += netExtra;
      totalCommission += commission;
      monthlyTotalPrincipal += netExtra;

      const breakdownItem = currentMonthBreakdown.find(b => b.goalId === targetDebt.id);
      if (breakdownItem) {
        breakdownItem.extraPrincipalPaid = Number(netExtra.toFixed(2));
        breakdownItem.commissionPaid = Number(commission.toFixed(2));
        breakdownItem.remainingPrincipal = Number(targetDebt.currentPrincipal.toFixed(2));
      }
    }

    activeDebts.forEach(d => { debtBalances[d.id] = Number(d.currentPrincipal.toFixed(2)); });

    const currentMonthDate = addMonths(startDate, month - 1);
    timeline.push({
      month,
      monthName: format(currentMonthDate, "MMMM yyyy", { locale: es }),
      totalInterestPaid: Number(monthlyTotalInterest.toFixed(2)),
      totalPrincipalPaid: Number(monthlyTotalPrincipal.toFixed(2)),
      totalExtraPaid: Number(monthlyTotalExtra.toFixed(2)),
      totalPaid: Number((monthlyTotalInterest + monthlyTotalPrincipal + totalCommission).toFixed(2)),
      remainingTotalDebt: Number(activeDebts.reduce((acc, d) => acc + d.currentPrincipal, 0).toFixed(2)),
      emergencyFundContribution: Number(currentEmergencyContribution.toFixed(2)),
      cumulativeEmergencyFund: Number(currentEmergencyFund.toFixed(2)),
      activeDebtsCount: activeDebts.filter(d => d.currentPrincipal > 0).length,
      debtBalances,
      breakdown: currentMonthBreakdown
    });

    month++;
  }

  return {
    id: 'portfolio_' + Date.now(),
    snapshot,
    debts: sortedDebts,
    prioritization,
    strategy,
    monthlySurplus: householdSurplus,
    totalInterestPaid: Number(totalInterest.toFixed(2)),
    totalCommissionPaid: Number(totalCommission.toFixed(2)),
    totalMonths: timeline.length,
    timeline,
    warnings
  };
}

export function buildMasterRoadmap(
  snapshot: FinancialSnapshot, 
  goals: Goal[], 
  debtPrioritization: DebtPrioritization, 
  generalStrategy: FinancialStrategy
): Roadmap {
  const debts = goals.filter(g => g.type === 'debt' || g.isExistingDebt);
  const savings = goals.filter(g => g.type !== 'debt' && !g.isExistingDebt);

  let currentSnapshot = { ...snapshot };
  let currentDate = snapshot.startDate ? new Date(snapshot.startDate) : new Date();
  
  let debtsPortfolio: PortfolioPlanResult | null = null;
  const savingsPlans: PlanResult[] = [];

  if (debts.length > 0) {
    debtsPortfolio = calculateDebtPortfolio(currentSnapshot, debts, debtPrioritization, generalStrategy);
    if (debtsPortfolio.timeline.length > 0) {
      const lastMonth = debtsPortfolio.timeline[debtsPortfolio.timeline.length - 1];
      currentSnapshot.emergencyFundAmount = lastMonth.cumulativeEmergencyFund;
      currentDate = addMonths(currentDate, debtsPortfolio.totalMonths);
      currentSnapshot.startDate = currentDate.toISOString();
    }
  }

  for (const saveGoal of savings) {
    const plan = calculateSinglePlan(currentSnapshot, saveGoal, 'equal', generalStrategy);
    savingsPlans.push(plan);
    currentSnapshot.emergencyFundAmount = plan.totalEmergencySaved;
    currentDate = addMonths(new Date(plan.endDate), 1);
    currentSnapshot.startDate = currentDate.toISOString();
  }

  return {
    id: 'master_roadmap_' + Date.now(),
    originalSnapshot: snapshot,
    goals,
    debtPrioritization,
    generalStrategy,
    debtsPortfolio,
    savingsPlans,
    lastUpdated: new Date().toISOString()
  };
}
