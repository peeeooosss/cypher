import { Inter, Oswald } from "next/font/google";

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const fontDisplay = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
