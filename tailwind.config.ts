import type { Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [daisyui],
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
          "base-300": "#E5E2D9",
        },
      },
    ],
  },
} satisfies Config;
