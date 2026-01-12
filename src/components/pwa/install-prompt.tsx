"use client";

import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA Install Prompt Component
 * 
 * Shows an install button when the browser's install prompt is available.
 * This component handles the "Add to Home Screen" functionality for PWAs.
 * 
 * Usage:
 * ```tsx
 * <InstallPrompt />
 * ```
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsVisible(false);
    } catch (error) {
      // Silently handle errors
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDeferredPrompt(null);
    // Store dismissal in localStorage to prevent showing again
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    }
  };

  // Check localStorage for dismissal (must be called before any early returns!)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if user dismissed (don't show again for 7 days)
      const dismissed = localStorage.getItem('pwa-banner-dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - dismissedTime < sevenDays) {
          // Banner was dismissed recently, don't show
          setIsVisible(false);
          return;
        } else {
          // Clear old dismissal
          localStorage.removeItem('pwa-banner-dismissed');
        }
      }
    }
  }, []);

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Only show if we have a real install prompt
  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-bottom-4">
      <div className="bg-background border border-primary/20 rounded-xl shadow-xl p-4 flex items-center gap-3 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
              Install Bill Splitter
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
              Add to home screen for quick access
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleInstallClick}
            className="tap-scale shadow-md hover:shadow-lg transition-shadow"
            size="sm"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 tap-scale hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
