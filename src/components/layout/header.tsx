"use client";

import * as React from "react";
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { LogOut, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppIcon } from "@/components/icons/app-icon";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout, isLoading: isAuthLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()} 
              aria-label="Go back"
              className="tap-scale"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <AppIcon className="h-7 w-7 text-primary" />
              <img 
                className="hidden sm:block logo-img" 
                src="/assets/bill-splitter-logo.svg" 
                alt="Bill Splitter"
              />
            </div>
          )}
        </div>

        {showLogoutButton ? (
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
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Log out</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>
    </header>
  );
}
