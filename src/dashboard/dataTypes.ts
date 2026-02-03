export type DashboardTotalsByCurrency = Record<
  string,
  {
    incomeMinor: number;
    expenseMinor: number;
    netMinor: number;
    incomeCount: number;
    expenseCount: number;
  }
>;

export type BreakdownEntry = {
  currency: string;
  amountMinor: number;
  count: number;
};

export type CategoryBreakdownEntry = BreakdownEntry & {
  categoryId: string | null;
  categoryName: string;
};

export type GroupBreakdownEntry = BreakdownEntry & {
  groupId: string | null;
  groupName: string;
};

export type MerchantBreakdownEntry = BreakdownEntry & {
  merchantId: string | null;
  merchantName: string;
};

export type BudgetVsActualEntry = {
  plannedMinor: number;
  actualMinor: number;
  remainingMinor: number;
  progressPct: number;
};

export type DashboardDataResponse = {
  month: string;
  totalsByCurrency: DashboardTotalsByCurrency;
  byCategory: {
    income: CategoryBreakdownEntry[];
    expense: CategoryBreakdownEntry[];
  };
  byGroup: {
    income: GroupBreakdownEntry[];
    expense: GroupBreakdownEntry[];
  };
  byMerchant: {
    income: MerchantBreakdownEntry[];
    expense: MerchantBreakdownEntry[];
  };
  budgetVsActual: Record<string, BudgetVsActualEntry>;
};
