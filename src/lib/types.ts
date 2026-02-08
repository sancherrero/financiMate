
export type HouseholdType = 'individual' | 'couple' | 'group';

export interface Member {
  id: string;
  name: string;
  incomeNetMonthly: number;
}

export interface FinancialSnapshot {
  id: string;
  type: HouseholdType;
  members: Member[];
  totalFixedCosts: number;
  totalVariableCosts: number;
  emergencyFundAmount: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  urgencyLevel: number; // 1-5
  type: 'debt' | 'savings' | 'other';
}

export interface PlanResult {
  snapshot: FinancialSnapshot;
  goal: Goal;
  monthlySurplus: number;
  priority: 'emergency_first' | 'goal_first';
  monthlyContributionTotal: number;
  estimatedMonthsToGoal: number;
  recommendations: string[];
  explanations: string[];
  split?: { memberId: string; monthlyContribution: number }[];
  warnings: string[];
  planB?: string;
}
