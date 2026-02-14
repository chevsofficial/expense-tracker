export type TransactionKind = "income" | "expense" | "transfer";

export type Transaction = {
  _id: string;
  date: string;
  amountMinor: number;
  kind: TransactionKind;
  accountId?: string | null;
  categoryId: string | null;
  transferId?: string | null;
  transferSide?: "out" | "in" | null;
  transferAccountId?: string | null;
  note?: string;
  merchantId?: string | null;
  merchantNameSnapshot?: string | null;
  receiptUrls?: string[];
  tagIds?: string[];
  isArchived?: boolean;
};
