import type { Metadata } from "next";
import "./globals.css";
import { PricingProvider } from "@/components/pricing-provider";
import { getPricingConfig } from "@/lib/pricing";
import { Providers } from "@/components/session-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "CYPHR | Underground Artist Platform",
  description: "The underground platform connecting dancers, DJs, guitarists, drummers, performers, organizers, and judges.",
  icons: {
    icon: "/Favicon.svg",
    apple: "/apple-icon.svg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pricing = await getPricingConfig();
  return (
    <html lang="en" className="h-full bg-paper text-ink antialiased">
      <body className="min-h-full bg-paper font-sans text-ink">
        <PricingProvider values={pricing}>
          <Providers>
            <Nav />
            {children}
            <Footer />
          </Providers>
        </PricingProvider>
      </body>
    </html>
  );
}
