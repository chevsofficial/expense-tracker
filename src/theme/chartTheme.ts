export type ChartThemeColors = {
  grid: string;
  muted: string;
  surface: string;
  text: string;
};

const fallbackColors: ChartThemeColors = {
  grid: "#1C3A2C",
  muted: "#9BB7A8",
  surface: "#0E2A1F",
  text: "#E6F2EC",
};

export function readChartThemeColors(): ChartThemeColors {
  if (typeof window === "undefined") return fallbackColors;

  const styles = getComputedStyle(document.documentElement);

  return {
    grid: styles.getPropertyValue("--color-base-300").trim() || fallbackColors.grid,
    muted: styles.getPropertyValue("--color-muted").trim() || fallbackColors.muted,
    surface: styles.getPropertyValue("--color-base-200").trim() || fallbackColors.surface,
    text: styles.getPropertyValue("--color-base-content").trim() || fallbackColors.text,
  };
}

export function getFallbackChartThemeColors(): ChartThemeColors {
  return fallbackColors;
}
