import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PricingProvider } from "@/components/pricing-provider";
import { getPricingConfig } from "@/lib/pricing";
import { Providers } from "@/components/session-provider";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { MobileNav } from "@/components/mobile-nav";
import { fontDisplay, fontSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "CYPHR | Underground Artist Platform",
  description: "The underground platform connecting dancers, DJs, guitarists, drummers, performers, organizers, and judges.",
  applicationName: "CYPHR",
  appleWebApp: {
    capable: true,
    title: "CYPHR",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/Favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pricing = await getPricingConfig();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontDisplay.variable} h-full bg-paper text-ink antialiased`}
    >
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
              <ToastProvider>
                <ServiceWorkerRegister />
                <Nav />
                {children}
                <MobileNav />
                <Footer />
              </ToastProvider>
            </Providers>
          </PricingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
