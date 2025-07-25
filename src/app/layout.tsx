import * as React from "react";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { ErrorBoundary } from "@/components/layout/error-boundary";
import { cn } from '@/lib/utils';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Bill Splitter',
    template: '%s | Bill Splitter'
  },
  description: 'Simplify shared expenses with AI-powered receipt scanning and seamless Splitwise integration.',
  keywords: ['bill splitting', 'expense sharing', 'splitwise', 'receipt scanning', 'AI'],
  authors: [{ name: 'Bill Splitter Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' }
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={cn(
          inter.variable, 
          'font-sans antialiased bg-background min-h-dvh flex flex-col'
        )}
      >
        <ErrorBoundary>
          <AuthProvider>
            <TooltipProvider delayDuration={100}>
              <Header />
              <main className="flex-1 w-full max-w-md mx-auto p-4 md:p-6">
                {children}
              </main>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
