export type HouseholdType = 'individual' | 'couple' | 'group';
export type FinancialStrategy = 'emergency_first' | 'balanced' | 'goal_first';
export type DebtPrioritization = 'avalanche' | 'snowball';

export interface Member {
  id: string;
  name: string;
  incomeNetMonthly: number;
  individualFixedCosts?: number;
  individualVariableCosts?: number;
  individualMinLeisureCosts?: number;
  individualEmergencyFundIncluded?: number;
}

export interface FinancialSnapshot {
  id: string;
  type: HouseholdType;
  members: Member[];
  totalFixedCosts: number; // Household-wide costs
  totalVariableCosts: number; // Household-wide costs
  totalMinLeisureCosts: number; // Household-wide costs
  emergencyFundIncludedInExpenses: number; // Amount already in fixed/variable
  expenseMode: 'shared' | 'individual';
  emergencyFundAmount: number;
  targetEmergencyFundAmount?: number; // Target goal for the fund
  savingsYieldRate?: number; // Representa el % de rentabilidad anual (TAE)
  startDate?: string; // ISO date string for when this specific plan starts
  createdAt: string;
}

export interface MonthlyPaymentDetail {
  month: number;
  monthName: string; // E.g., "Marzo 2024"
  interestPaid: number;
  commissionPaid: number; // Comisión pagada al banco este mes
  regularPrincipalPaid: number;
  extraPrincipalPaid: number;
  totalPaid: number;
  remainingPrincipal: number;
  baseEmergencyContribution: number;
  extraEmergencyContribution: number;
  emergencyFundContribution: number;
  savingsInterestEarned: number; // Intereses generados por el fondo
  cumulativeEmergencyFund: number;
}

export interface DebtMonthlyBreakdown {
  goalId: string;
  name: string;
  interestPaid: number;
  principalFromMinPayment: number;
  extraPrincipalPaid: number;
  commissionPaid: number;
  remainingPrincipal: number;
}

export interface PortfolioMonthlyDetail {
  month: number;
  monthName: string;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalExtraPaid: number;
  totalPaid: number;
  remainingTotalDebt: number;
  emergencyFundContribution: number;
  cumulativeEmergencyFund: number;
  activeDebtsCount: number;
  // Mapa de cómo quedó cada deuda este mes { idDeuda: capitalVivoRestante }
  debtBalances: Record<string, number>; 
  breakdown: DebtMonthlyBreakdown[]; // NUEVO: Desglose individual de cada deuda este mes
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  startDate?: string; // Fecha en la que empieza la deuda (YYYY-MM-DD)
  urgencyLevel: number; // 1-5
  type: 'debt' | 'savings' | 'other';
  strategy?: FinancialStrategy;
  isExistingDebt?: boolean;
  existingMonthlyPayment?: number;
  debtCategory?: 'fixed' | 'variable';
  assignedTo?: string; // 'shared' or memberId
  tin?: number; 
  tae?: number; 
  remainingPrincipal?: number;
  earlyRepaymentCommission?: number; // % comisión amortización anticipada
}

export interface Milestone {
  month: number;
  label: string;
  description: string;
}

export interface MathStep {
  label: string;
  operation: string;
  result: string;
}

export interface PlanResult {
  id: string;
  snapshot: FinancialSnapshot;
  goal: Goal;
  strategy: FinancialStrategy;
  splitMethod: 'equal' | 'proportional_income';
  monthlySurplus: number;
  monthlyContributionExtra: number;
  monthlyEmergencyContribution: number;
  extraEmergencyContribution: number; // Solo la parte del excedente
  acceleratedExtraDebtContribution: number; // El aporte real cuando el fondo de emergencia se completa
  fundCompletedAtMonth: number; // El mes exacto en el que el fondo se llena y ocurre la aceleración
  estimatedMonthsToGoal: number;
  totalInterestPaid: number;
  totalCommissionPaid: number; // Total comisiones pagadas
  totalSavingsInterestEarned: number; // Total intereses ganados
  totalEmergencySaved: number;
  targetEmergencyFund: number;
  recommendations: string[];
  explanations: string[];
  milestones: Milestone[];
  mathSteps: MathStep[];
  monthlyTable: MonthlyPaymentDetail[];
  split?: { memberId: string; monthlyContribution: number }[];
  splitReasoning?: string;
  warnings: string[];
  startDate: string;
  endDate: string;
}

export interface PortfolioPlanResult {
  id: string;
  snapshot: FinancialSnapshot;
  debts: Goal[];
  prioritization: DebtPrioritization;
  strategy: FinancialStrategy;
  monthlySurplus: number;
  totalInterestPaid: number;
  totalCommissionPaid: number;
  totalMonths: number;
  timeline: PortfolioMonthlyDetail[];
  warnings: string[];
}

export interface MultiPlanResult {
  emergency_first: PlanResult;
  balanced: PlanResult;
  goal_first: PlanResult;
}

export interface Roadmap {
  id: string;
  originalSnapshot: FinancialSnapshot; 
  goals: Goal[]; 
  debtPrioritization: DebtPrioritization; 
  generalStrategy: FinancialStrategy; 
  debtsPortfolio: PortfolioPlanResult | null; 
  savingsPlans: PlanResult[]; 
  lastUpdated: string;
}
