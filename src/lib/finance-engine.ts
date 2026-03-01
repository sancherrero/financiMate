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
  ExtraSourceBreakdown,
  FinancialSnapshotChange,
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
  const alreadySavingInExpenses = (snapshot.emergencyFundIncludedInExpenses || 0);

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
  const acceleratedExtraDebtContribution = Math.max(0, Math.round(householdSurplus * 1));
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
      if (fundCompletedAtMonth === 0) fundCompletedAtMonth = month;
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
    warnings: [],
    startDate: startDate.toISOString(),
    endDate: endDateISO
  };
}

/**
 * Deriva ingresos totales y gastos totales desde un FinancialSnapshot (misma fórmula que el motor).
 */
function deriveIncomeAndExpenses(snapshot: FinancialSnapshot): { totalIncome: number; totalExpenses: number; householdSurplus: number } {
  const totalIncome = snapshot.members.reduce((acc, m) => acc + m.incomeNetMonthly, 0);
  const sharedCosts = snapshot.totalFixedCosts + snapshot.totalVariableCosts + (snapshot.totalMinLeisureCosts || 0);
  const individualCostsTotal = snapshot.members.reduce((acc, m) =>
    acc + (m.individualFixedCosts || 0) + (m.individualVariableCosts || 0) + (m.individualMinLeisureCosts || 0), 0
  );
  const totalExpenses = sharedCosts + individualCostsTotal;
  const householdSurplus = totalIncome - totalExpenses;
  return { totalIncome, totalExpenses, householdSurplus };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula el desglose de fuentes del extra disponible para el mes actual (sin incluir accumulatedUnspentExtra).
 * Invariante: fromBaseSurplus + fromSalaryIncrease + fromExpenseReduction + fromReleasedQuotas + fromEmergencyFundQuota + fromEmergencyOverflow
 * = extra disponible del mes antes de sumar el acumulado de meses previos (householdSurplus ajustado por effortFactor + resto de fuentes).
 *
 * @param currentSnapshot - Snapshot financiero del mes actual
 * @param previousSnapshot - Snapshot del mes anterior (null en mes 1 → fromSalaryIncrease y fromExpenseReduction = 0) – solo usado cuando no hay snapshotChange
 * @param debtBudgetLeftover - Cuotas liberadas de deudas liquidadas (euros)
 * @param emergencyData - Estado del FE (isFull, overflow, quotaToRedirect en euros)
 * @param accumulatedUnspentExtra - Extra acumulado de meses previos (solo documentación; no se incluye en el return)
 * @param effortFactor - Factor de esfuerzo aplicado al sobrante cuando FE no está completo (0–1, ya incluye el ajuste si el FE está lleno)
 * @param snapshotChange - Cambio financiero efectivo a partir de este mes, si aplica
 * @returns Breakdown con cada fuente en euros (number), redondeado a 2 decimales
 *
 * @example
 * // Mes 1, sin snapshot previo, FE no completo, surplus 500, effort 0.5 → fromBaseSurplus = 250, resto 0
 * computeExtraSourceBreakdown(snap, null, 0, { isFull: false, overflow: 0, quotaToRedirect: 0 }, 0, 0.5)
 * // Verificación: suma de los 6 campos = extra disponible del mes (sin accumulatedUnspentExtra)
 */
export function computeExtraSourceBreakdown(
  currentSnapshot: FinancialSnapshot,
  previousSnapshot: FinancialSnapshot | null,
  debtBudgetLeftover: number,
  emergencyData: {
    isFull: boolean;
    overflow: number;
    quotaToRedirect: number;
  },
  _accumulatedUnspentExtra: number,
  effortFactor: number,
  snapshotChange?: FinancialSnapshotChange | null
): ExtraSourceBreakdown {
  const current = deriveIncomeAndExpenses(currentSnapshot);
  const { totalIncome: baseTotalIncome, totalExpenses: baseTotalExpenses, householdSurplus } = current;
  const isFundFull = emergencyData.isFull;

  // Caso por defecto: sin snapshotChange, se mantiene el comportamiento actual basado en previousSnapshot.
  if (!snapshotChange) {
    let fromSalaryIncrease = 0;
    let fromExpenseReduction = 0;

    if (previousSnapshot) {
      const prev = deriveIncomeAndExpenses(previousSnapshot);
      const incomeDiff = baseTotalIncome - prev.totalIncome;
      if (incomeDiff > 0) fromSalaryIncrease = incomeDiff;
      const expenseReduction = prev.totalExpenses - baseTotalExpenses;
      if (expenseReduction > 0) fromExpenseReduction = expenseReduction;
    }

    const adjustedBaseSurplus = Math.max(0, householdSurplus - fromSalaryIncrease - fromExpenseReduction);
    const rawBaseFromSurplus = isFundFull ? adjustedBaseSurplus : adjustedBaseSurplus * effortFactor;

    return {
      fromBaseSurplus: round2(rawBaseFromSurplus),
      fromSalaryIncrease: round2(fromSalaryIncrease),
      fromExpenseReduction: round2(fromExpenseReduction),
      fromReleasedQuotas: round2(debtBudgetLeftover),
      fromEmergencyFundQuota: round2(isFundFull ? emergencyData.quotaToRedirect : 0),
      fromEmergencyOverflow: round2(emergencyData.overflow),
    };
  }

  // Caso con snapshotChange: usamos el cambio declarado para etiquetar mejor las fuentes,
  // sin alterar el total de extra que sale del householdSurplus.

  const baseSharedFixed = currentSnapshot.totalFixedCosts;
  const baseSharedVariable = currentSnapshot.totalVariableCosts;
  const baseMinLeisure = currentSnapshot.totalMinLeisureCosts || 0;
  const individualCostsTotal = baseTotalExpenses - (baseSharedFixed + baseSharedVariable + baseMinLeisure);

  const targetIncome = snapshotChange.netIncomeCents ?? baseTotalIncome;
  const targetFixed = snapshotChange.fixedExpensesCents ?? baseSharedFixed;
  const targetVariable = snapshotChange.variableExpensesCents ?? baseSharedVariable;
  const targetTotalExpenses = targetFixed + targetVariable + baseMinLeisure + individualCostsTotal;

  const rawSalaryIncrease = Math.max(0, targetIncome - baseTotalIncome);
  const rawExpenseReduction = Math.max(0, baseTotalExpenses - targetTotalExpenses);

  const baseRawSurplus = Math.max(0, householdSurplus - rawSalaryIncrease - rawExpenseReduction);

  // Total de extra que, según la lógica original, sale del householdSurplus este mes
  const totalFromSurplusOriginal = isFundFull ? householdSurplus : householdSurplus * effortFactor;

  // Potenciales aportes de cada fuente antes de normalizar para respetar el total original
  const basePotential = isFundFull ? baseRawSurplus : baseRawSurplus * effortFactor;
  const salaryPotential = isFundFull ? rawSalaryIncrease : rawSalaryIncrease * effortFactor;
  const expensePotential = isFundFull ? rawExpenseReduction : rawExpenseReduction * effortFactor;

  const totalPotential = basePotential + salaryPotential + expensePotential;

  let fromBaseSurplus = 0;
  let fromSalaryIncrease = 0;
  let fromExpenseReduction = 0;

  if (totalPotential <= 0 || !Number.isFinite(totalPotential) || totalFromSurplusOriginal <= 0) {
    // Sin cambios efectivos o sin sobrante: todo se etiqueta como sobrante base.
    fromBaseSurplus = Math.max(0, totalFromSurplusOriginal);
  } else {
    const scale = totalFromSurplusOriginal / totalPotential;
    fromBaseSurplus = basePotential * scale;
    fromSalaryIncrease = salaryPotential * scale;
    fromExpenseReduction = expensePotential * scale;
  }

  return {
    fromBaseSurplus: round2(fromBaseSurplus),
    fromSalaryIncrease: round2(fromSalaryIncrease),
    fromExpenseReduction: round2(fromExpenseReduction),
    fromReleasedQuotas: round2(debtBudgetLeftover),
    fromEmergencyFundQuota: round2(isFundFull ? emergencyData.quotaToRedirect : 0),
    fromEmergencyOverflow: round2(emergencyData.overflow),
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
    if (prioritization === 'avalanche') return (b.tin || 0) - (a.tin || 0);
    return a.targetAmount - b.targetAmount;
  });

  const activeDebts = sortedDebts.map(d => ({ ...d, currentPrincipal: d.targetAmount }));
  const fallbackTargetFund = Math.round((snapshot.totalFixedCosts + snapshot.members.reduce((acc, m) => acc + (m.individualFixedCosts || 0), 0)) * 3);
  
  let currentEmergencyFund = snapshot.emergencyFundAmount;
  let totalInterest = 0;
  let totalCommission = 0;
  let month = 1;
  const maxMonths = 600;
  const timeline: PortfolioMonthlyDetail[] = [];
  const warnings: string[] = [];
  let firstMonthTargetFund: number = snapshot.targetEmergencyFundAmount ?? fallbackTargetFund;
  
  const startDate = snapshot.startDate ? new Date(snapshot.startDate) : new Date();

  const initialEmergencyFund = snapshot.emergencyFundAmount;
  const planStartDateISO = startDate.toISOString();

  const debtStartDates = debts.filter(d => d.startDate).map(d => new Date(d.startDate!));
  if (debtStartDates.length > 0) {
    const minDebtStart = new Date(Math.min(...debtStartDates.map(d => d.getTime())));
    if (startDate > minDebtStart) {
      warnings.push('La fecha de inicio del plan es posterior al inicio de alguna deuda; puede haber meses con excedente sin asignar.');
    }
  }

  const getDebtEffortFactor = (s: FinancialStrategy) => {
    if (s === 'goal_first') return 0.95;
    if (s === 'emergency_first') return 0.25;
    return 0.5;
  };

  const isActiveThisMonth = (d: Goal, currentMonthDate: Date) => {
    if (!d.startDate) return true;
    const dDate = new Date(d.startDate);
    const dVal = dDate.getFullYear() * 12 + dDate.getMonth();
    const cVal = currentMonthDate.getFullYear() * 12 + currentMonthDate.getMonth();
    return cVal >= dVal;
  };

  let accumulatedUnspentExtra = 0;
  const totalDeclaredDebtMinimums = activeDebts.reduce((sum, d) => sum + (d.existingMonthlyPayment || 0), 0);
  let previousSnapshotForBreakdown: FinancialSnapshot | null = null;

  while (activeDebts.some(d => d.currentPrincipal > 0) && month <= maxMonths) {
    const currentMonthDate = addMonths(startDate, month - 1);
    const referenceDebt = activeDebts.find(d => isActiveThisMonth(d, currentMonthDate) && d.currentPrincipal > 0);
    const targetEmergencyFund = referenceDebt?.targetEmergencyFundAmount ?? snapshot.targetEmergencyFundAmount ?? fallbackTargetFund;
    const monthStrategy = referenceDebt?.strategy ?? strategy;
    const debtEffortFactor = getDebtEffortFactor(monthStrategy);
    if (month === 1) firstMonthTargetFund = targetEmergencyFund;
    const isFundFull = currentEmergencyFund >= targetEmergencyFund;
    const currentEffortFactor = isFundFull ? 1 : debtEffortFactor;
    const currentMonthBreakdown: DebtMonthlyBreakdown[] = [];

    let actualMinimumsThisMonth = 0;

    activeDebts.forEach(d => {
      if (isActiveThisMonth(d, currentMonthDate) && d.currentPrincipal > 0) {
        actualMinimumsThisMonth += (d.existingMonthlyPayment || 0);
      }
    });

    const debtBudgetLeftover = totalDeclaredDebtMinimums - actualMinimumsThisMonth;

    if (actualMinimumsThisMonth > (householdSurplus + totalDeclaredDebtMinimums)) {
      warnings.push("Riesgo de impago: Las cuotas mínimas superan la capacidad en el mes " + month);
      break;
    }

    const monthlyYieldRate = ((snapshot.savingsYieldRate || 0) / 100) / 12;
    currentEmergencyFund += (currentEmergencyFund * monthlyYieldRate);

    let currentEmergencyContribution = 0;
    let emergencyOverflow = 0;

    if (!isFundFull) {
      const intendedEmergencyContribution = Math.round(householdSurplus * (1 - currentEffortFactor)) + alreadySavingInExpenses;
      const remainingToTarget = targetEmergencyFund - currentEmergencyFund;

      if (intendedEmergencyContribution > remainingToTarget) {
        currentEmergencyContribution = remainingToTarget;
        emergencyOverflow = intendedEmergencyContribution - remainingToTarget;
      } else {
        currentEmergencyContribution = intendedEmergencyContribution;
      }
      currentEmergencyFund += currentEmergencyContribution;
    }

    const snapshotChange = referenceDebt?.snapshotChanges;
    const currentYearMonth = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const isChangeEffective =
      snapshotChange && currentYearMonth >= snapshotChange.effectiveFromMonth;

    const extraBreakdown = computeExtraSourceBreakdown(
      snapshot,
      previousSnapshotForBreakdown,
      debtBudgetLeftover,
      { isFull: isFundFull, overflow: emergencyOverflow, quotaToRedirect: alreadySavingInExpenses },
      accumulatedUnspentExtra,
      currentEffortFactor,
      isChangeEffective ? snapshotChange : undefined
    );
    const totalFromSources =
      extraBreakdown.fromBaseSurplus +
      extraBreakdown.fromSalaryIncrease +
      extraBreakdown.fromExpenseReduction +
      extraBreakdown.fromReleasedQuotas +
      extraBreakdown.fromEmergencyFundQuota +
      extraBreakdown.fromEmergencyOverflow;
    let extraAvailableForDebts = totalFromSources + accumulatedUnspentExtra;
    if (process.env.NODE_ENV === 'development') {
      const expected = totalFromSources + accumulatedUnspentExtra;
      if (Math.abs(extraAvailableForDebts - expected) >= 0.01) {
        console.warn('[calculateDebtPortfolio] Invariante extra: extraAvailableForDebts debería ser', expected, 'got', extraAvailableForDebts);
      }
    }
    accumulatedUnspentExtra = 0; 

    let monthlyTotalInterest = 0;
    let monthlyTotalPrincipal = 0;
    let monthlyTotalExtra = 0;
    const debtBalances: Record<string, number> = {};

    activeDebts.forEach(d => {
      if (d.currentPrincipal <= 0) {
        debtBalances[d.id] = 0;
        return;
      }
      
      if (!isActiveThisMonth(d, currentMonthDate)) {
        debtBalances[d.id] = d.currentPrincipal;
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

    let remainingExtraAvailable = extraAvailableForDebts;
    for (const targetDebt of activeDebts) {
      if (remainingExtraAvailable <= 0) break;
      if (targetDebt.currentPrincipal <= 0) continue;
      if (!isActiveThisMonth(targetDebt, currentMonthDate)) continue;

      const commissionRate = (targetDebt.earlyRepaymentCommission || 0) / 100;
      let netExtra = remainingExtraAvailable / (1 + commissionRate);
      let grossConsumed = remainingExtraAvailable;
      let commission = 0;

      if (netExtra > targetDebt.currentPrincipal) {
        netExtra = targetDebt.currentPrincipal;
        commission = netExtra * commissionRate;
        grossConsumed = netExtra + commission;
        remainingExtraAvailable -= grossConsumed; 
      } else {
        commission = netExtra * commissionRate;
        remainingExtraAvailable = 0; 
      }

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

    if (remainingExtraAvailable > 0) {
      accumulatedUnspentExtra = remainingExtraAvailable;
    }

    activeDebts.forEach(d => { debtBalances[d.id] = Number(d.currentPrincipal.toFixed(2)); });

    timeline.push({
      month,
      monthName: format(currentMonthDate, "MMMM yyyy", { locale: es }),
      totalInterestPaid: Number(monthlyTotalInterest.toFixed(2)),
      totalPrincipalPaid: Number(monthlyTotalPrincipal.toFixed(2)),
      totalExtraPaid: Number(monthlyTotalExtra.toFixed(2)),
      totalPaid: Number((monthlyTotalInterest + monthlyTotalPrincipal + totalCommission).toFixed(2)),
      remainingTotalDebt: Number(activeDebts.filter(d => isActiveThisMonth(d, currentMonthDate)).reduce((acc, d) => acc + d.currentPrincipal, 0).toFixed(2)),
      emergencyFundContribution: Number(currentEmergencyContribution.toFixed(2)),
      cumulativeEmergencyFund: Number(currentEmergencyFund.toFixed(2)),
      activeDebtsCount: activeDebts.filter(d => d.currentPrincipal > 0 && isActiveThisMonth(d, currentMonthDate)).length,
      debtBalances,
      breakdown: currentMonthBreakdown,
      extraSources: extraBreakdown
    });

    previousSnapshotForBreakdown = snapshot;
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
    warnings,
    planStartDate: planStartDateISO,
    targetEmergencyFund: firstMonthTargetFund,
    initialEmergencyFund
  };
}

/**
 * Construye el roadmap maestro (portafolio de deudas + planes de ahorro en cascada).
 *
 * IMPORTANTE – FinancialSnapshot.startDate en contexto de plan maestro:
 * Representa el "mes 0" / fecha de inicio del plan maestro. NO debe ser la fecha
 * de inicio de una meta concreta. La fecha de inicio del plan (mes 0) es la indicada
 * en snapshot.startDate (o hoy si no existe); el motor la normaliza aquí y la expone
 * en originalSnapshot.startDate.
 */
export function buildMasterRoadmap(
  snapshot: FinancialSnapshot, 
  goals: Goal[], 
  debtPrioritization: DebtPrioritization, 
  generalStrategy: FinancialStrategy
): Roadmap {
  const debts = goals.filter(g => g.type === 'debt' || g.isExistingDebt);
  const savings = goals.filter(g => g.type !== 'debt' && !g.isExistingDebt);

  const planStartDate = snapshot.startDate ? new Date(snapshot.startDate) : new Date();

  let currentSnapshot = { ...snapshot, startDate: planStartDate.toISOString() };
  let currentDate = planStartDate;

  let debtsPortfolio: PortfolioPlanResult | null = null;
  const savingsPlans: PlanResult[] = [];

  if (debts.length > 0) {
    debtsPortfolio = calculateDebtPortfolio(currentSnapshot, debts, debtPrioritization, generalStrategy);
    if (debtsPortfolio.timeline.length > 0) {
      const lastMonthDetail = debtsPortfolio.timeline[debtsPortfolio.timeline.length - 1];
      currentSnapshot.emergencyFundAmount = lastMonthDetail.cumulativeEmergencyFund;
      currentDate = addMonths(planStartDate, debtsPortfolio.totalMonths);
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
    originalSnapshot: { ...snapshot, startDate: planStartDate.toISOString() },
    goals,
    debtPrioritization,
    generalStrategy,
    debtsPortfolio,
    savingsPlans,
    lastUpdated: new Date().toISOString()
  };
}