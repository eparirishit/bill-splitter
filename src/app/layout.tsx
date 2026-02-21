"use client";
import { Logo } from "@/components/icons/logo";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BillSplittingProvider, useBillSplitting } from "@/contexts/bill-splitting-context";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Script from 'next/script';
import * as React from "react";
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

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

  const showBackButton = pathname !== '/login' && pathname !== '/' && pathname !== '/';
  const showLogoutButton = isAuthenticated && pathname !== '/login' && pathname !== '/';
  
  // Don't show header on home page or login page (billsplitter-ai design has no header)
  if (pathname === '/' || pathname === '/login') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
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
              <Logo className="h-7 w-7" />
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
    <html lang="en" className="bg-[#fcfcfd] dark:bg-slate-900">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <title>SplitScan</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('bill_splitter_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const shouldBeDark = stored ? stored === 'dark' : prefersDark;
                if (shouldBeDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="hsl(var(--primary))" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SplitScan" />
        <meta name="description" content="SplitScan - AI-Powered Bill Splitting. Splitting made intelligent." />
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
      <body className="antialiased min-h-dvh flex flex-col bg-[#fcfcfd] dark:bg-slate-900 transition-colors" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif" }}>
        <ThemeProvider>
          <AuthProvider>
            <BillSplittingProvider>
              <Header />
              <main className="flex-1 w-full max-w-md mx-auto bg-[#fcfcfd] dark:bg-slate-900 transition-colors">
                {children}
              </main>
              <InstallPrompt />
              <Toaster />
            </BillSplittingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
