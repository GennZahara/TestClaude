import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            color: "#e2e8f0",
            a: { color: "#60a5fa" },
            strong: { color: "#f1f5f9" },
            code: { color: "#a5f3fc" },
            h1: { color: "#f1f5f9" },
            h2: { color: "#f1f5f9" },
            h3: { color: "#f1f5f9" },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
