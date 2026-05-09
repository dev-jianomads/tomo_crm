/**
 * =============================================================================
 * TOMO CRM - Root Layout
 * =============================================================================
 * 
 * Next.js App Router root layout that wraps all pages.
 * 
 * PRODUCTION ENHANCEMENTS:
 * 
 * 1. ADD PROVIDERS:
 *    - React Query provider for data fetching
 *    - Firebase Auth provider
 *    - Toast/notification provider
 *    
 *    ```
 *    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *    import { AuthProvider } from '@/components/auth-provider';
 *    
 *    const queryClient = new QueryClient();
 *    
 *    export default function RootLayout({ children }) {
 *      return (
 *        <html lang="en">
 *          <body>
 *            <QueryClientProvider client={queryClient}>
 *              <AuthProvider>
 *                {children}
 *              </AuthProvider>
 *            </QueryClientProvider>
 *          </body>
 *        </html>
 *      );
 *    }
 *    ```
 * 
 * 2. ADD ANALYTICS:
 *    - Vercel Analytics
 *    - Posthog or Mixpanel for product analytics
 *    
 *    ```
 *    import { Analytics } from '@vercel/analytics/react';
 *    
 *    // In body:
 *    <Analytics />
 *    ```
 * 
 * 3. ADD ERROR BOUNDARY:
 *    - Global error boundary for uncaught errors
 *    - Error reporting to Sentry or similar
 * 
 * 4. ADD META TAGS:
 *    - Open Graph tags for social sharing
 *    - Twitter card meta tags
 *    - Canonical URLs
 * =============================================================================
 */

import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { themeBlockingScript } from "@/lib/theme-appearance";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

/** Today greeting headline — matches design/tomo_today_light_v2.html `.greeting`. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/**
 * Default metadata for all pages
 * Can be overridden per-page using generateMetadata()
 */
export const metadata: Metadata = {
  title: "Tomo | AI execution workspace",
  description: "Minimal, Notion-like AI workspace for investors, founders, and operators.",
  // PRODUCTION: Add more metadata
  // openGraph: {
  //   title: "Tomo | AI execution workspace",
  //   description: "...",
  //   images: [{ url: "/og-image.png" }],
  // },
  // twitter: {
  //   card: "summary_large_image",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBlockingScript() }} />
      </head>
      <body
        className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} ${newsreader.variable} antialiased bg-[color:var(--background)] text-[color:var(--foreground)]`}
        suppressHydrationWarning
      >
        {/* 
          PRODUCTION: Wrap with providers
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              {children}
              <Toaster /> // For toast notifications
            </AuthProvider>
          </QueryClientProvider>
          <Analytics />
        */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
