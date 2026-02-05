import type { DashboardWidget } from "@/src/dashboard/widgetTypes";

type Rect = { x: number; y: number; w: number; h: number };

function intersects(a: Rect, b: Rect) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

export function normalizeWidgets(widgets: DashboardWidget[], cols = 12): DashboardWidget[] {
  const placed: Rect[] = [];

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const result = widgets.map((widget) => {
    const minW = widget.type.includes("by_") ? Math.max(5, widget.w) : Math.max(4, widget.w);
    const minH = Math.max(2, widget.h);

    const wClamped = clamp(minW, 1, cols);
    let x = clamp(widget.x ?? 0, 0, cols - wClamped);
    let y = Math.max(0, widget.y ?? 0);

    while (true) {
      const candidate = { x, y, w: wClamped, h: minH };
      const hit = placed.some((placedRect) => intersects(placedRect, candidate));
      if (!hit) {
        placed.push(candidate);
        return { ...widget, x, y, w: wClamped, h: minH };
      }
      x += 1;
      if (x > cols - wClamped) {
        x = 0;
        y += 1;
      }
    }
  });

  return result;
}
