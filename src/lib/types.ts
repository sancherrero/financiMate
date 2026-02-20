export type HouseholdType = 'individual' | 'couple' | 'group';
export type FinancialStrategy = 'emergency_first' | 'balanced' | 'goal_first';

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
  startDate?: string; // ISO date string for when this specific plan starts
  createdAt: string;
}

export interface MonthlyPaymentDetail {
  month: number;
  monthName: string; // E.g., "Marzo 2024"
  interestPaid: number;
  regularPrincipalPaid: number;
  extraPrincipalPaid: number;
  totalPaid: number;
  remainingPrincipal: number;
  baseEmergencyContribution: number;
  extraEmergencyContribution: number;
  emergencyFundContribution: number;
  cumulativeEmergencyFund: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
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
  estimatedMonthsToGoal: number;
  totalInterestPaid: number;
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

export interface MultiPlanResult {
  emergency_first: PlanResult;
  balanced: PlanResult;
  goal_first: PlanResult;
}

export interface Roadmap {
  items: PlanResult[];
  lastUpdated: string;
}
