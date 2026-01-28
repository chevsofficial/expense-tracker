import mongoose from "mongoose";
import { WorkspaceModel } from "@/src/models/Workspace";
import { CategoryGroupModel } from "@/src/models/CategoryGroup";
import { CategoryModel } from "@/src/models/Category";

const normalizeNameKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");

const DEFAULT_GROUP_KEYS = [
  "categoryGroup.home",
  "categoryGroup.utilities",
  "categoryGroup.kids",
  "categoryGroup.insurance",
  "categoryGroup.car",
  "categoryGroup.foodDining",
  "categoryGroup.hobbiesEntertainment",
  "categoryGroup.subscriptions",
  "categoryGroup.healthMedical",
  "categoryGroup.travelVacation",
  "categoryGroup.debt",
  "categoryGroup.misc",
];
const DEFAULT_GROUP_NAME_KEYS = DEFAULT_GROUP_KEYS.map(normalizeNameKey);

export async function ensureWorkspaceSeeded(userId: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  let workspace = await WorkspaceModel.findOne({ userId: userObjectId, name: "Personal" });
  if (!workspace) {
    workspace = await WorkspaceModel.create({
      userId: userObjectId,
      name: "Personal",
      defaultCurrency: "MXN",
    });
  }

  const existingGroups = await CategoryGroupModel.find({
    workspaceId: workspace._id,
    isDefault: true,
  });

  if (existingGroups.length === 0) {
    await CategoryGroupModel.insertMany(
      DEFAULT_GROUP_NAME_KEYS.map((key, idx) => ({
        workspaceId: workspace._id,
        nameKey: key,
        sortOrder: idx,
        isDefault: true,
        isArchived: false,
      }))
    );
  }

  const miscGroup = await CategoryGroupModel.findOne({
    workspaceId: workspace._id,
    nameKey: normalizeNameKey("categoryGroup.misc"),
  });

  if (miscGroup) {
    // Default income category
    await CategoryModel.updateOne(
      { workspaceId: workspace._id, groupId: miscGroup._id, nameCustom: "Job" },
      {
        $setOnInsert: {
          workspaceId: workspace._id,
          groupId: miscGroup._id,
          nameCustom: "Job",
          kind: "income",
          sortOrder: 0,
          isDefault: true,
          isArchived: false,
        },
      },
      { upsert: true }
    );

    // Default expense category
    await CategoryModel.updateOne(
      { workspaceId: workspace._id, groupId: miscGroup._id, nameCustom: "General" },
      {
        $setOnInsert: {
          workspaceId: workspace._id,
          groupId: miscGroup._id,
          nameCustom: "General",
          kind: "expense",
          sortOrder: 1,
          isDefault: true,
          isArchived: false,
        },
      },
      { upsert: true }
    );
  }

  return workspace;
}
