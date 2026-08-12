import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DocumentFixer } from "./_document-fixer";
import { HydrationErrorSuppressor } from "./_hydration-error-suppressor";
import { NavigationLoader } from "@/components/NavigationLoader";
import { SupportChatWidget } from "@/components/SupportChatWidget";
import { PwaInstallCapture } from "@/hooks/usePwaInstall";
import { PublicWhatsAppButton } from "@/components/PublicWhatsAppButton";
import { ManifestSwitcher } from "@/components/ManifestSwitcher";

const geistSans = localFont({
  src: [
    {
      path: "../../public/fonts/Geist/Geist-VariableFont_wght.ttf",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

const geistMono = localFont({
  src: [
    {
      path: "../../public/fonts/Geist_Mono/GeistMono-VariableFont_wght.ttf",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  preload: false, // Don't preload monospace font on mobile
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  title: "TK.sa - Company Formation Platform",
  description: "Revolutionizing company formation in Saudi Arabia through transparent, efficient digital processes.",
  keywords: ["TK.sa", "Company Formation", "Saudi Arabia", "Business Setup", "MISA", "SBC"],
  authors: [{ name: "TK.sa Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TK CRM",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "TK.sa - Company Formation Platform",
    description: "Revolutionizing company formation in Saudi Arabia through transparent, efficient digital processes.",
    url: "https://tk.sa",
    siteName: "TK.sa",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TK.sa - Company Formation Platform",
    description: "Revolutionizing company formation in Saudi Arabia through transparent, efficient digital processes.",
  },
  // Optimize for mobile performance
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
};

export const viewport = {
  themeColor: "#0B6B37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  userScalable: true,
  // Optimize for mobile rendering
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="[&[dir='rtl']]:font-arabic">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <HydrationErrorSuppressor />
          <DocumentFixer />
          <Suspense fallback={null}>
            <NavigationLoader />
          </Suspense>
          <SessionProvider
            refetchInterval={5 * 60} // Refetch session every 5 minutes instead of default
            refetchOnWindowFocus={false} // Don't refetch on window focus to reduce calls
          >
            <LocaleProvider>
              <AuthProvider>
                <NotificationProvider>
                <TooltipProvider delayDuration={200}>
                <ManifestSwitcher />
                {children}
                <Toaster />
                {/* Lazy load chat widget for better mobile performance */}
                <Suspense fallback={null}>
                  <SupportChatWidget />
                </Suspense>
                {/* Capture install prompt for profile Install App section (no auto popup) */}
                <PwaInstallCapture />
                {/* WhatsApp floating button - above other FABs so it stays visible */}
                <PublicWhatsAppButton />
                </TooltipProvider>
                </NotificationProvider>
              </AuthProvider>
            </LocaleProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
