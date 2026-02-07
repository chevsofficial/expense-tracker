export type CategoryKind = "income" | "expense" | "both";

export type Category = {
  _id: string;
  nameKey?: string;
  nameCustom?: string;
  groupId?: string | null;
  kind?: CategoryKind;
  emoji?: string | null;
  isArchived?: boolean;
  archivedAt?: string | null;
};
