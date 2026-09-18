import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-soft": "var(--paper-soft)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        "accent-light": "var(--accent-light)",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica Neue", "Helvetica", "sans-serif"],
        display: ["Arial Black", "Arial", "Helvetica Neue", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.04em" }],
        "display-lg": ["2rem", { lineHeight: "1.1" }],
        "title-md": ["1.125rem", { lineHeight: "1.1" }],
        "body-md": ["1rem", { lineHeight: "1.5" }],
        "body-sm": ["0.875rem", { lineHeight: "1.4" }],
        "score-display": ["4.5rem", { lineHeight: "1", letterSpacing: "-0.06em" }],
        "button-md": ["1rem", { lineHeight: "1.2" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        section: "64px",
      },
      borderRadius: {
        none: "0px",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "9999px",
      },
      boxShadow: {
        accent: "0 0 0 1px rgba(255, 43, 43, 0.28)",
        "accent-soft": "0 4px 24px rgba(255, 43, 43, 0.15)",
        card: "0 2px 12px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.4)",
      },
      transitionDuration: {
        "200": "200ms",
        "300": "300ms",
      },
      transitionTimingFunction: {
        "ease-out": "ease-out",
      },
    },
  },
  plugins: [],
};

export default config;