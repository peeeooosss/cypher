import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallOut | Underground Dance Battles",
  description: "The underground dance battle platform and artist marketplace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full bg-paper text-ink antialiased">
      <body className="min-h-full bg-paper font-sans text-ink">{children}</body>
    </html>
  );
}
