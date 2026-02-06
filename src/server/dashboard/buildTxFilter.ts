import mongoose from "mongoose";
import { parseObjectId } from "@/src/server/api";

type BuildTxFilterInput = {
  workspaceId: string;
  accountIds?: string[];
  categoryIds?: string[];
  currency?: string;
  start?: Date;
  end?: Date;
  includeArchived?: boolean;
};

export function buildTxFilter(input: BuildTxFilterInput) {
  const workspaceObjectId = parseObjectId(input.workspaceId);
  if (!workspaceObjectId) {
    throw new Error("Invalid workspace id");
  }

  const filter: Record<string, unknown> = {
    workspaceId: workspaceObjectId,
    ...(input.includeArchived ? {} : { isArchived: false }),
    isPending: { $ne: true },
  };

  if (input.accountIds?.length) {
    const accountObjectIds = input.accountIds
      .map(parseObjectId)
      .filter(Boolean) as mongoose.Types.ObjectId[];
    filter.accountId = { $in: accountObjectIds };
  }

  if (input.categoryIds?.length) {
    const categoryObjectIds = input.categoryIds
      .map(parseObjectId)
      .filter(Boolean) as mongoose.Types.ObjectId[];
    filter.categoryId = { $in: categoryObjectIds };
  }

  if (input.currency) {
    filter.currency = input.currency;
  }

  if (input.start || input.end) {
    filter.date = {
      ...(input.start ? { $gte: input.start } : {}),
      ...(input.end ? { $lt: input.end } : {}),
    };
  }

  return filter;
}
