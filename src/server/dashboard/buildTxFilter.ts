import mongoose from "mongoose";

type BuildTxFilterInput = {
  workspaceId: mongoose.Types.ObjectId;
  accountIds?: mongoose.Types.ObjectId[];
  categoryIds?: mongoose.Types.ObjectId[];
  currency?: string;
  start?: Date;
  end?: Date;
};

export function buildTxFilter({
  workspaceId,
  accountIds,
  categoryIds,
  currency,
  start,
  end,
}: BuildTxFilterInput) {
  const filter: Record<string, unknown> = {
    workspaceId,
    isArchived: false,
    isPending: { $ne: true },
  };

  if (accountIds && accountIds.length > 0) {
    filter.accountId = { $in: accountIds };
  }

  if (categoryIds && categoryIds.length > 0) {
    filter.categoryId = { $in: categoryIds };
  }

  if (currency) {
    filter.currency = currency;
  }

  if (start || end) {
    filter.date = {
      ...(start ? { $gte: start } : {}),
      ...(end ? { $lt: end } : {}),
    };
  }

  return filter;
}
