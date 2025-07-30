"use client";
import { AppIcon } from "@/components/icons/app-icon";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BillSplittingProvider } from "@/contexts/bill-splitting-context";
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      logout(); // This will handle clearing localStorage and redirecting
    } catch (error) {
      console.error("Logout failed in layout:", error);
      setIsLoggingOut(false);
    }
  };

  const showBackButton = pathname !== '/login' && pathname !== '/';
  const showLogoutButton = isAuthenticated && pathname !== '/login';

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <AppIcon className="h-7 w-7 text-primary" />
              <img className="hidden sm:block logo-img"  src="/assets/bill-splitter-logo.svg" />
            </div>
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
      <body className={cn(inter.variable, 'font-sans antialiased bg-background min-h-dvh flex flex-col')}>
        <AuthProvider>
          <BillSplittingProvider>
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
