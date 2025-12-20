"use client";
import { AppIcon } from "@/components/icons/app-icon";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BillSplittingProvider, useBillSplitting } from "@/contexts/bill-splitting-context";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { Inter } from 'next/font/google';
import { usePathname, useRouter } from 'next/navigation';
import * as React from "react";
import './globals.css';
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth(); // Get auth state and logout function
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  
  // Get reset function from bill splitting context
  const { reset: resetBillSplittingState } = useBillSplitting();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      logout(); // This will handle clearing localStorage and redirecting
    } catch (error) {
      console.error("Logout failed in layout:", error);
      setIsLoggingOut(false);
    }
  };

  const handleLogoClick = () => {
    // Reset all bill splitting state (clears all form data, selections, etc.)
    resetBillSplittingState();
    // Navigate to home page if not already there
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const showBackButton = pathname !== '/login' && pathname !== '/';
  const showLogoutButton = isAuthenticated && pathname !== '/login';

  return (
    <header className="sticky z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b" style={{ top: 'var(--pwa-banner-height, 0px)' }}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer tap-scale focus:outline-none focus:ring-0 border-0 bg-transparent p-0 active:outline-none active:ring-0"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              aria-label="Go to home and reset"
            >
              <AppIcon className="h-7 w-7 text-primary" />
              <img className="hidden sm:block logo-img" src="/assets/bill-splitter-logo.svg" alt="Bill Splitter" />
            </button>
          )}
        </div>

        {showLogoutButton && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut || isAuthLoading}
                  aria-label="Log out"
                  className={cn(
                    "tap-scale",
                    "hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Log out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        )}
        {!showLogoutButton && pathname !== '/login' && <div className="w-10 h-10"></div>}
      </div>
    </header>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="hsl(var(--primary))" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Bill Splitter" />
        <meta name="description" content="AI-Powered Bill Splitting for Splitwise - Simplify and automate the process of splitting shared expenses" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="hsl(var(--primary))" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="96x96" href="/icons/icon-96x96.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128x128.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="384x384" href="/icons/icon-384x384.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body className={cn(inter.variable, 'font-sans antialiased bg-background min-h-dvh flex flex-col')}>
        <AuthProvider>
          <BillSplittingProvider>
            <InstallPrompt />
            <Header />
            <main className="flex-1 w-full max-w-md mx-auto p-4 md:p-6">
              {children}
            </main>
            <Toaster />
          </BillSplittingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
