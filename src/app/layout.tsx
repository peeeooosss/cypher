import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/session-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "CYPHR | Underground Artist Platform",
  description: "The underground platform connecting dancers, DJs, guitarists, drummers, performers, organizers, and judges.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-paper text-ink antialiased">
      <body className="min-h-full bg-paper font-sans text-ink">
        <Providers>
          <Nav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
