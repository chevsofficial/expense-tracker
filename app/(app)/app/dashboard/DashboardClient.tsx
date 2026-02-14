"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJSON } from "@/src/lib/apiClient";
import { t } from "@/src/i18n/t";
import type { Locale } from "@/src/i18n/messages";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { CategoryBreakdownWidget } from "@/components/dashboard/widgets/CategoryBreakdownWidget";
import { MerchantBreakdownWidget } from "@/components/dashboard/widgets/MerchantBreakdownWidget";
import { GroupBreakdownWidget } from "@/components/dashboard/widgets/GroupBreakdownWidget";
import { TotalBalanceCard } from "@/components/dashboard/widgets/TotalBalanceCard";
import { TotalChangeCard } from "@/components/dashboard/widgets/TotalChangeCard";
import { TotalIncomeCard } from "@/components/dashboard/widgets/TotalIncomeCard";
import { TotalExpensesCard } from "@/components/dashboard/widgets/TotalExpensesCard";
import { TagBreakdownWidget, type TagBreakdownRow } from "@/components/dashboard/widgets/TagBreakdownWidget";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPresetRange } from "@/src/utils/dateRange";
import type { Category } from "@/src/types/category";
import type { Tag } from "@/src/types/tag";

type Account = { _id: string; name: string; isArchived?: boolean };
type Merchant = { _id: string; name: string; isArchived?: boolean };

type SummaryResponse = {
  data: {
    totals: { incomeMinor: number; expenseMinor: number; balanceMinor: number };
    totalBalanceAsOfEnd: { amountMinor: number };
    totalChange: { amountMinor: number };
    byCategory: { income: Array<{ id: string | null; name: string; emoji?: string | null; amountMinor: number; count: number }>; expense: Array<{ id: string | null; name: string; emoji?: string | null; amountMinor: number; count: number }> };
    byMerchant: { income: Array<{ id: string | null; name: string; amountMinor: number; count: number }>; expense: Array<{ id: string | null; name: string; amountMinor: number; count: number }> };
    byGroup: { income: Array<{ groupId: string | null; groupName: string; amountMinor: number; count: number }>; expense: Array<{ groupId: string | null; groupName: string; amountMinor: number; count: number }> };
    tagSummaries: { income: TagBreakdownRow[]; expense: TagBreakdownRow[] };
  };
};

type ApiListResponse<T> = { data: T[] };

export function DashboardClient({ locale, defaultCurrency }: { locale: Locale; defaultCurrency: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [summary, setSummary] = useState<SummaryResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState(() => getPresetRange("thisMonth"));
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const loadFilters = useCallback(async () => {
    try {
      const [accountsResponse, categoriesResponse, merchantsResponse, tagsResponse] = await Promise.all([
        getJSON<ApiListResponse<Account>>("/api/accounts?includeArchived=false"),
        getJSON<ApiListResponse<Category>>("/api/categories?includeArchived=false"),
        getJSON<ApiListResponse<Merchant>>("/api/merchants?includeArchived=false"),
        getJSON<ApiListResponse<Tag>>("/api/tags?includeArchived=false"),
      ]);
      setAccounts(accountsResponse.data);
      setCategories(categoriesResponse.data);
      setMerchants(merchantsResponse.data);
      setTags(tagsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "dashboard_loading"));
    }
  }, [locale]);

  const loadSummary = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.set("startDate", dateRange.start);
      if (dateRange.end) params.set("endDate", dateRange.end);
      if (selectedAccountId) params.set("accountId", selectedAccountId);
      if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
      if (selectedMerchantId) params.set("merchantId", selectedMerchantId);
      selectedTagIds.forEach((tagId) => params.append("tagIds", tagId));
      const response = await getJSON<SummaryResponse>(`/api/dashboard/summary?${params}`);
      setSummary(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "dashboard_loading"));
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start, locale, selectedAccountId, selectedCategoryId, selectedMerchantId, selectedTagIds]);

  useEffect(() => { void loadFilters(); }, [loadFilters]);
  useEffect(() => { void loadSummary(); }, [loadSummary]);

  const categoryBreakdown = useMemo(() => summary?.byCategory ?? { income: [], expense: [] }, [summary]);
  const merchantBreakdown = useMemo(() => summary?.byMerchant ?? { income: [], expense: [] }, [summary]);
  const groupBreakdown = useMemo(() => summary?.byGroup ?? { income: [], expense: [] }, [summary]);
  const tagSummaries = useMemo(() => summary?.tagSummaries ?? { income: [], expense: [] }, [summary]);

  return (
    <section className="space-y-6">
      <PageHeader title={t(locale, "dashboard_title")} subtitle={t(locale, "dashboard_subtitle")} />
      <DashboardFilterBar
        locale={locale}
        accounts={accounts}
        categories={categories}
        merchants={merchants}
        tags={tags}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={setSelectedCategoryId}
        selectedMerchantId={selectedMerchantId}
        onMerchantChange={setSelectedMerchantId}
        selectedTagIds={selectedTagIds}
        onTagIdsChange={setSelectedTagIds}
      />
      {error ? <div className="alert alert-error">{error}</div> : null}
      {loading && !summary ? <p className="text-sm opacity-70">{t(locale, "dashboard_loading")}</p> : null}
      {summary ? (
        <DashboardGrid>
          <TotalBalanceCard locale={locale} total={summary.totalBalanceAsOfEnd.amountMinor} currency={defaultCurrency} />
          <TotalChangeCard locale={locale} total={summary.totalChange.amountMinor} currency={defaultCurrency} />
          <TotalIncomeCard locale={locale} total={summary.totals.incomeMinor} currency={defaultCurrency} />
          <TotalExpensesCard locale={locale} total={summary.totals.expenseMinor} currency={defaultCurrency} />
          <GroupBreakdownWidget locale={locale} title={t(locale, "dashboard_widget_income_by_groups")} rows={groupBreakdown.income} currency={defaultCurrency} />
          <GroupBreakdownWidget locale={locale} title={t(locale, "dashboard_widget_expense_by_groups")} rows={groupBreakdown.expense} currency={defaultCurrency} />
          <CategoryBreakdownWidget locale={locale} title={t(locale, "dashboard_widget_income_by_categories")} rows={categoryBreakdown.income} currency={defaultCurrency} />
          <CategoryBreakdownWidget locale={locale} title={t(locale, "dashboard_widget_expense_by_categories")} rows={categoryBreakdown.expense} currency={defaultCurrency} />
          <MerchantBreakdownWidget locale={locale} title={t(locale, "dashboard_widget_income_by_merchants")} rows={merchantBreakdown.income} currency={defaultCurrency} />
          <MerchantBreakdownWidget locale={locale} title={t(locale, "dashboard_widget_expense_by_merchants")} rows={merchantBreakdown.expense} currency={defaultCurrency} />
          <TagBreakdownWidget locale={locale} title="Income by Tag" rows={tagSummaries.income} currency={defaultCurrency} />
          <TagBreakdownWidget locale={locale} title="Expense by Tag" rows={tagSummaries.expense} currency={defaultCurrency} />
        </DashboardGrid>
      ) : null}
    </section>
  );
}
