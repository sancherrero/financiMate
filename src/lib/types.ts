export type HouseholdType = 'individual' | 'couple' | 'group';
export type FinancialStrategy = 'emergency_first' | 'balanced' | 'goal_first';

export interface Member {
  id: string;
  name: string;
  incomeNetMonthly: number;
  individualFixedCosts?: number;
  individualVariableCosts?: number;
}

export interface FinancialSnapshot {
  id: string;
  type: HouseholdType;
  members: Member[];
  totalFixedCosts: number; // Household-wide costs
  totalVariableCosts: number; // Household-wide costs
  expenseMode: 'shared' | 'individual';
  emergencyFundAmount: number;
  createdAt: string;
}

export interface MonthlyPaymentDetail {
  month: number;
  interestPaid: number;
  regularPrincipalPaid: number;
  extraPrincipalPaid: number;
  totalPaid: number;
  remainingPrincipal: number;
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
  // Detailed Debt Info
  tin?: number; 
  tae?: number; 
  remainingPrincipal?: number;
  nextPaymentDate?: string;
  interestSplitPercentage?: number;
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
  snapshot: FinancialSnapshot;
  goal: Goal;
  strategy: FinancialStrategy;
  monthlySurplus: number;
  monthlyContributionExtra: number;
  monthlyEmergencyContribution: number;
  estimatedMonthsToGoal: number;
  totalInterestPaid: number;
  totalEmergencySaved: number;
  recommendations: string[];
  explanations: string[];
  milestones: Milestone[];
  mathSteps: MathStep[];
  monthlyTable: MonthlyPaymentDetail[];
  split?: { memberId: string; monthlyContribution: number }[];
  splitReasoning?: string;
  warnings: string[];
}

export interface MultiPlanResult {
  emergency_first: PlanResult;
  balanced: PlanResult;
  goal_first: PlanResult;
}
