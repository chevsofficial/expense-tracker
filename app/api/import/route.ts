import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TransactionModel } from "@/src/models/Transaction";
import { MerchantModel, normalizeMerchantNameKey } from "@/src/models/Merchant";
import { CategoryModel } from "@/src/models/Category";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { errorResponse, requireAuthContext } from "@/src/server/api";

const importSchema = z.object({
  entity: z.enum(["transactions", "merchants", "categories"]),
  rows: z.array(z.record(z.string(), z.string())),
  mapping: z.record(z.string(), z.string()),
  options: z
    .object({
      createMissingMerchants: z.boolean().optional(),
      createMissingCategories: z.boolean().optional(),
      createMissingGroups: z.boolean().optional(),
      skipInvalidRows: z.boolean().optional(),
    })
    .optional(),
});

const normalizeNameKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const getFieldValue = (row: Record<string, string>, mapping: Record<string, string>, field: string) => {
  const column = mapping[field];
  if (!column) return "";
  return row[column] ?? "";
};

export async function POST(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.message, 400);
  }

  const { entity, rows, mapping } = parsed.data;
  const options = {
    createMissingMerchants: parsed.data.options?.createMissingMerchants ?? false,
    createMissingCategories: parsed.data.options?.createMissingCategories ?? false,
    createMissingGroups: parsed.data.options?.createMissingGroups ?? false,
    skipInvalidRows: parsed.data.options?.skipInvalidRows ?? true,
  };

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: { row: number; message: string }[] = [];

  const reportError = (index: number, message: string) => {
    errors.push({ row: index + 1, message });
    skipped += 1;
  };

  if (entity === "merchants") {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const name = getFieldValue(row, mapping, "name").trim();
      if (!name) {
        reportError(i, "Missing merchant name.");
        if (!options.skipInvalidRows) break;
        continue;
      }
      const aliasesRaw = getFieldValue(row, mapping, "aliases").trim();
      const aliases = aliasesRaw
        ? aliasesRaw.split("|").map((alias) => alias.trim().toLowerCase()).filter(Boolean)
        : [];

      const nameKey = normalizeMerchantNameKey(name);
      const existing = await MerchantModel.findOne({
        workspaceId: auth.workspace.id,
        nameKey,
      });
      if (existing) {
        existing.name = name;
        existing.aliases = aliases;
        await existing.save();
        updated += 1;
      } else {
        await MerchantModel.create({
          workspaceId: auth.workspace.id,
          name,
          aliases,
          isArchived: false,
        });
        created += 1;
      }
    }
  }

  if (entity === "categories") {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const name = getFieldValue(row, mapping, "name").trim();
      if (!name) {
        reportError(i, "Missing category name.");
        if (!options.skipInvalidRows) break;
        continue;
      }

      const groupName = getFieldValue(row, mapping, "group").trim() || "Imported";
      const kindValue = getFieldValue(row, mapping, "kind").trim();
      const isArchivedValue = getFieldValue(row, mapping, "isArchived").trim().toLowerCase();
      const kind =
        kindValue === "income" || kindValue === "expense" ? kindValue : ("expense" as const);
      const isArchived = isArchivedValue === "true";

      let group = await CategoryGroupModel.findOne({
        workspaceId: auth.workspace.id,
        nameKey: normalizeNameKey(groupName),
      });

      if (!group) {
        if (!options.createMissingGroups) {
          reportError(i, "Category group not found.");
          if (!options.skipInvalidRows) break;
          continue;
        }
        group = await CategoryGroupModel.create({
          workspaceId: auth.workspace.id,
          nameCustom: groupName,
          nameKey: normalizeNameKey(groupName),
          sortOrder: 0,
          isDefault: false,
          isArchived: false,
        });
      }

      const nameKey = normalizeNameKey(name);
      const existing = await CategoryModel.findOne({
        workspaceId: auth.workspace.id,
        groupId: group._id,
        nameKey,
      });
      if (existing) {
        existing.nameCustom = name;
        existing.kind = kind;
        existing.isArchived = isArchived;
        await existing.save();
        updated += 1;
      } else {
        await CategoryModel.create({
          workspaceId: auth.workspace.id,
          groupId: group._id,
          nameCustom: name,
          nameKey,
          kind,
          sortOrder: 0,
          isDefault: false,
          isArchived,
        });
        created += 1;
      }
    }
  }

  if (entity === "transactions") {
    const groups = await CategoryGroupModel.find({ workspaceId: auth.workspace.id }).lean();
    let importedGroup = groups.find((group) => group.nameKey === "imported") ?? null;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const dateValue = getFieldValue(row, mapping, "date").trim();
      const amountValue = getFieldValue(row, mapping, "amount").trim();
      const currency = auth.workspace.defaultCurrency;
      const kindValue = getFieldValue(row, mapping, "kind").trim();
      const merchantName = getFieldValue(row, mapping, "merchant").trim();
      const categoryName = getFieldValue(row, mapping, "category").trim();
      const note = getFieldValue(row, mapping, "note").trim();
      const receiptUrl = getFieldValue(row, mapping, "receiptUrl").trim();

      const parsedDate = new Date(dateValue);
      const amount = Number(amountValue);
      if (Number.isNaN(parsedDate.getTime()) || !Number.isFinite(amount)) {
        reportError(i, "Invalid date or amount.");
        if (!options.skipInvalidRows) break;
        continue;
      }

      const kind =
        kindValue === "income" || kindValue === "expense" ? kindValue : ("expense" as const);

      let merchantId = null;
      if (merchantName) {
        let merchant = await MerchantModel.findOne({
          workspaceId: auth.workspace.id,
          nameKey: normalizeMerchantNameKey(merchantName),
        });
        if (!merchant) {
          if (!options.createMissingMerchants) {
            reportError(i, "Merchant not found.");
            if (!options.skipInvalidRows) break;
            continue;
          }
          merchant = await MerchantModel.create({
            workspaceId: auth.workspace.id,
            name: merchantName,
            isArchived: false,
          });
        }
        merchantId = merchant._id;
      }

      let categoryId = null;
      if (categoryName) {
        let category = await CategoryModel.findOne({
          workspaceId: auth.workspace.id,
          nameKey: normalizeNameKey(categoryName),
        });
        if (!category) {
          if (!options.createMissingCategories) {
            reportError(i, "Category not found.");
            if (!options.skipInvalidRows) break;
            continue;
          }
          if (!importedGroup) {
            importedGroup = await CategoryGroupModel.create({
              workspaceId: auth.workspace.id,
              nameCustom: "Imported",
              nameKey: "imported",
              sortOrder: 0,
              isDefault: false,
              isArchived: false,
            });
          }
          category = await CategoryModel.create({
            workspaceId: auth.workspace.id,
            groupId: importedGroup._id,
            nameCustom: categoryName,
            nameKey: normalizeNameKey(categoryName),
            kind,
            sortOrder: 0,
            isDefault: false,
            isArchived: false,
          });
        }
        categoryId = category._id;
      }

      await TransactionModel.create({
        workspaceId: auth.workspace.id,
        date: parsedDate,
        amountMinor: Math.round(amount * 100),
        currency,
        kind,
        categoryId,
        merchantId,
        merchantNameSnapshot: merchantName || null,
        note: note || undefined,
        receiptUrls: receiptUrl ? [receiptUrl] : [],
        isArchived: false,
      });
      created += 1;
    }
  }

  return NextResponse.json({ data: { created, updated, skipped, errors } });
}
