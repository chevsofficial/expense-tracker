import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  // DaisyUI plugin options aren't in Tailwind's TS types (Tailwind v4),
  // so keep them but avoid strict type rejection.
  daisyui: {
    themes: [
      {
        spendary: {
          primary: "#6DBE45",
          "primary-content": "#0b1a0b",
          secondary: "#2F6F2E",
          accent: "#F4C430",
          neutral: "#171717",
          "base-100": "#F7F6F2",
          "base-200": "#EFEDE6",
          "base-300": "#E7E4DA",
          "base-content": "#171717",
        },
      },
      "light",
      "dark",
    ],
  },
} as unknown as Config;

export default config;
