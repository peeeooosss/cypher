import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/session-provider";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "CYPHR | Underground Dance Battles",
  description: "The underground dance battle platform and artist marketplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-paper text-ink antialiased">
      <body className="min-h-full bg-paper font-sans text-ink">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
