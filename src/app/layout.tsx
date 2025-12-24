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
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
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
