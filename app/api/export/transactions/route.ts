import { NextResponse } from "next/server";
import { TransactionModel } from "@/src/models/Transaction";
import { MerchantModel } from "@/src/models/Merchant";
import { CategoryModel } from "@/src/models/Category";
import { errorResponse, requireAuthContext } from "@/src/server/api";

const csvEscape = (value: string) => {
  const normalized = value ?? "";
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  try {
    const [transactions, merchants, categories] = await Promise.all([
      TransactionModel.find({ workspaceId: auth.workspace.id }).sort({ date: -1 }).lean(),
      MerchantModel.find({ workspaceId: auth.workspace.id }).lean(),
      CategoryModel.find({ workspaceId: auth.workspace.id }).lean(),
    ]);

    const merchantMap = new Map(merchants.map((merchant) => [merchant._id.toString(), merchant.name]));
    const categoryMap = new Map(
      categories.map((category) => [category._id.toString(), category.nameCustom ?? category.nameKey])
    );

    const headers = [
      "date",
      "amount",
      "currency",
      "kind",
      "merchant",
      "category",
      "note",
      "receiptUrl",
    ];

    const rows = transactions.map((transaction) => {
      const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
      const dateLabel = Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10);
      const amount = (transaction.amountMinor / 100).toFixed(2);
      const merchantName =
        (transaction.merchantId
          ? merchantMap.get(transaction.merchantId.toString())
          : null) ??
        transaction.merchantNameSnapshot ??
        "";
      const categoryName = transaction.categoryId
        ? categoryMap.get(transaction.categoryId.toString()) ?? ""
        : "";
      const receiptUrl = transaction.receiptUrls?.[0] ?? "";

      return [
        dateLabel,
        amount,
        transaction.currency ?? "",
        transaction.kind ?? "",
        merchantName,
        categoryName,
        transaction.note ?? "",
        receiptUrl,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="transactions.csv"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to export transactions";
    return errorResponse(message, 500);
  }
}
