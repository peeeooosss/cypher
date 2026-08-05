import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0A0A0A",
        ink: "#F2F2F2",
        accent: "#FF2B2B",
        "ink-muted": "#8C8C8C",
        line: "#2A2A2A",
        "paper-soft": "#141414",
        "accent-dark": "#B51F1F",
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
        sm: "0px",
        md: "0px",
        lg: "0px",
        full: "0px",
      },
      boxShadow: {
        accent: "0 0 0 1px rgba(255, 43, 43, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
