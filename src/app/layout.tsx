import type { Metadata } from "next";
import "./globals.css";
import { PricingProvider } from "@/components/pricing-provider";
import { getPricingConfig } from "@/lib/pricing";
import { Providers } from "@/components/session-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning className="h-full bg-paper text-ink antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme")||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-paper font-sans text-ink">
        <ThemeProvider>
          <PricingProvider values={pricing}>
            <Providers>
              <Nav />
              {children}
              <Footer />
            </Providers>
          </PricingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
