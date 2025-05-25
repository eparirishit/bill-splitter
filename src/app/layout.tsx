"use client";
import * as React from "react";
import { usePathname, useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { LogOut, Loader2, ArrowLeft } from 'lucide-react';
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AppIcon } from "@/components/icons/app-icon";
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});


// Cannot export metadata from a client component
// export const metadata: Metadata = {
//   title: 'Bill Splitter',
//   description: 'Split grocery bills easily with Splitwise',
// };


function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth(); // Get auth state and logout function
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login'); // Redirect to login after logout
    } catch (error) {
      console.error("Logout failed in layout:", error);
      // Optionally show a toast message for logout failure
    } finally {
      setIsLoggingOut(false);
    }
  };

  const showBackButton = pathname !== '/login' && pathname !== '/';
  const showLogoutButton = isAuthenticated && pathname !== '/login';


  // Dynamic header based on page
  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side: Back button or Logo */}
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

        {/* Right side: Logout Button */}
        {showLogoutButton && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut || isAuthLoading} // Disable while logging out or initial auth check
                  aria-label="Log out"
                  className={cn(
                    "tap-scale",
                    // Apply primary hover colors instead of accent
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
        {/* Placeholder for right side if no button shown to maintain balance */}
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
        <AuthProvider> {/* Wrap everything in AuthProvider */}
          <Header /> {/* Render Header conditionally inside AuthProvider scope */}
          {/* Main content area - centered with max-width for desktop, full width mobile */}
          <main className="flex-1 w-full max-w-md mx-auto p-4 md:p-6">
            {children}
          </main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
