import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: { DEFAULT: "var(--ui-surface)", muted: "var(--ui-surface-muted)" },
        content: { DEFAULT: "var(--ui-content)", muted: "var(--ui-content-muted)" },
        line: "var(--ui-line)",
        focus: "var(--ui-focus)",
        action: { DEFAULT: "var(--ui-action)", hover: "var(--ui-action-hover)" },
        "on-action": "var(--ui-on-action)",
        success: { DEFAULT: "var(--ui-success)", surface: "var(--ui-success-surface)" },
        warning: { DEFAULT: "var(--ui-warning)", surface: "var(--ui-warning-surface)" },
        danger: { DEFAULT: "var(--ui-danger)", surface: "var(--ui-danger-surface)", solid: "var(--ui-danger-solid)" },
        "on-danger": "var(--ui-on-danger)",
        skeleton: "var(--ui-skeleton)",
        pipeline: {
          pending: "var(--ui-pipeline-pending)", active: "var(--ui-pipeline-active)",
          complete: "var(--ui-pipeline-complete)", blocked: "var(--ui-pipeline-blocked)",
        },
        dtype: {
          numeric: "var(--ui-dtype-numeric)", text: "var(--ui-dtype-text)",
          date: "var(--ui-dtype-date)", boolean: "var(--ui-dtype-boolean)", unknown: "var(--ui-dtype-unknown)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
