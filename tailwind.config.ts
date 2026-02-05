import type { Config } from "tailwindcss";
import daisyui from "daisyui";

type DaisyUIThemeObject = Record<string, Record<string, string>>;

type DaisyUIConfig = {
  themes?: DaisyUIThemeObject[] | string[];
  darkTheme?: string;
  themeRoot?: string;
  base?: boolean;
  styled?: boolean;
  utils?: boolean;
  logs?: boolean;
};

type ConfigWithDaisyUI = Config & { daisyui?: DaisyUIConfig };

const config: ConfigWithDaisyUI = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    darkTheme: "spendaryDark",
    themes: [
      {
        spendaryLight: {
          primary: "#6DBE45",
          "primary-content": "#0b1b12",
          secondary: "#9AD96A",
          "secondary-content": "#0b1b12",
          accent: "#F4C430",
          "accent-content": "#1f2937",
          neutral: "#2F6F2E",
          "neutral-content": "#F7F6F2",
          "base-100": "#F7F6F2",
          "base-200": "#ffffff",
          "base-300": "#eae7dc",
          "base-content": "#1f2937",
          info: "#60a5fa",
          success: "#6DBE45",
          warning: "#F4C430",
          error: "#ef4444",
        },
      },
      {
        spendaryDark: {
          primary: "#6DBE45",
          "primary-content": "#0b1b12",
          secondary: "#9AD96A",
          "secondary-content": "#0b1b12",
          accent: "#F4C430",
          "accent-content": "#111827",
          neutral: "#2F6F2E",
          "neutral-content": "#F7F6F2",
          "base-100": "#0f1a12",
          "base-200": "#132116",
          "base-300": "#1a2a1c",
          "base-content": "#F7F6F2",
          info: "#60a5fa",
          success: "#6DBE45",
          warning: "#F4C430",
          error: "#f87171",
        },
      },
    ],
    themeRoot: "html",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
};

export default config;
