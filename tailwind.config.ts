import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        "paper-soft": "var(--paper-soft)",
        "paper-raised": "var(--paper-raised)",
        cream: "var(--cream)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        accent: "var(--accent)",
        "accent-dark": "var(--accent-dark)",
        "accent-light": "var(--accent-light)",
        "accent-contrast": "var(--accent-contrast)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "display-xl": ["3rem", { lineHeight: "1.05", letterSpacing: "0.01em", fontWeight: "600" }],
        "display-lg": ["2.25rem", { lineHeight: "1.08", letterSpacing: "0.01em", fontWeight: "600" }],
        "display-md": ["1.75rem", { lineHeight: "1.12", letterSpacing: "0.01em", fontWeight: "600" }],
        "display-sm": ["1.375rem", { lineHeight: "1.15", letterSpacing: "0.01em", fontWeight: "600" }],
        "title-lg": ["1.25rem", { lineHeight: "1.2", letterSpacing: "0.02em", fontWeight: "500" }],
        "title-md": ["1.125rem", { lineHeight: "1.25", letterSpacing: "0.02em", fontWeight: "500" }],
        "title-sm": ["0.9375rem", { lineHeight: "1.3", letterSpacing: "0.03em", fontWeight: "500" }],
        "body-lg": ["1.125rem", { lineHeight: "1.55" }],
        "body-md": ["1rem", { lineHeight: "1.55" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        "body-xs": ["0.75rem", { lineHeight: "1.45" }],
        "score-display": ["4.5rem", { lineHeight: "1", letterSpacing: "0.01em", fontWeight: "600" }],
        "button-md": ["1rem", { lineHeight: "1.2", fontWeight: "600" }],
        "button-sm": ["0.875rem", { lineHeight: "1.2", fontWeight: "600" }],
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
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
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