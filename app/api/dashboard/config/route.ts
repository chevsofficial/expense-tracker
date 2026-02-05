import { NextResponse, type NextRequest } from "next/server";
import { DashboardConfigModel } from "@/src/models/DashboardConfig";
import { errorResponse, requireAuthContext } from "@/src/server/api";
import { buildDefaultDashboardConfig } from "@/src/server/dashboard/defaultConfig";
import { getWidgetDefinition, isDashboardMetricType } from "@/src/dashboard/widgetRegistry";
import type { DashboardWidget } from "@/src/dashboard/widgetTypes";

const MAX_GRID_COLUMNS = 12;
const MAX_GRID_ROWS = 20;

const allowedViews = new Set(["card", "table", "bar", "pie"]);

function validateWidgets(widgets: DashboardWidget[]) {
  const ids = new Set<string>();

  for (const widget of widgets) {
    if (!widget.id || typeof widget.id !== "string") {
      return "Each widget needs an id.";
    }
    if (ids.has(widget.id)) {
      return "Widget ids must be unique.";
    }
    ids.add(widget.id);

    if (!isDashboardMetricType(widget.type)) {
      return "Invalid widget type.";
    }

    const definition = getWidgetDefinition(widget.type);
    if (!definition) {
      return "Invalid widget type.";
    }

    if (!allowedViews.has(widget.view)) {
      return "Invalid widget view.";
    }

    if (!definition.supportedViews.includes(widget.view)) {
      return "Unsupported widget view.";
    }

    const layoutValues = [widget.x, widget.y, widget.w, widget.h];
    if (!layoutValues.every((value) => Number.isFinite(value))) {
      return `Invalid widget layout for ${widget.id}.`;
    }

    if (widget.x < 0 || widget.y < 0) {
      return `Widget positions must be positive for ${widget.id}.`;
    }

    if (widget.w <= 0 || widget.h <= 0) {
      return `Widget sizes must be positive for ${widget.id}.`;
    }

    if (widget.w > MAX_GRID_COLUMNS || widget.h > MAX_GRID_ROWS) {
      return `Widget sizes exceed grid bounds for ${widget.id}.`;
    }
  }

  return null;
}

export async function GET() {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  const config = await DashboardConfigModel.findOne({ workspaceId: auth.workspace._id });
  if (!config) {
    return NextResponse.json({
      data: { widgets: buildDefaultDashboardConfig(), version: 1 },
    });
  }

  return NextResponse.json({
    data: { widgets: config.layout, version: config.version ?? 1 },
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthContext();
  if ("response" in auth) return auth.response;

  let body: { widgets?: DashboardWidget[] } | null = null;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid payload", 400);
  }

  if (!body || !Array.isArray(body.widgets)) {
    return errorResponse("Invalid payload", 400);
  }

  const widgets = body.widgets.map((widget) => {
    const definition = getWidgetDefinition(widget.type);
    return {
      ...widget,
      titleKey: definition?.titleKey ?? widget.titleKey,
    };
  });

  const error = validateWidgets(widgets);
  if (error) {
    return errorResponse(error, 400);
  }

  const stored = await DashboardConfigModel.findOneAndUpdate(
    { workspaceId: auth.workspace._id },
    { $set: { layout: widgets, version: 1 } },
    { upsert: true, new: true }
  );

  const responseWidgets = stored?.layout ?? widgets;

  return NextResponse.json({
    data: { widgets: responseWidgets, version: stored?.version ?? 1 },
  });
}

export const dynamic = "force-dynamic";
