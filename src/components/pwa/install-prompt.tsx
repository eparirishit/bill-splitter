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
  const [bannerHeight, setBannerHeight] = React.useState(0);
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
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
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDeferredPrompt(null);
    // Update CSS variable when banner is dismissed
    document.documentElement.style.setProperty('--pwa-banner-height', '0px');
  };

  // Update CSS variable when banner visibility changes
  React.useEffect(() => {
    if (isInstalled || !isVisible || !deferredPrompt) {
      document.documentElement.style.setProperty('--pwa-banner-height', '0px');
      return;
    }

    // Measure banner height and set CSS variable
    const updateHeight = () => {
      const banner = document.querySelector('[data-pwa-banner]') as HTMLElement;
      if (banner) {
        const height = banner.offsetHeight;
        setBannerHeight(height);
        document.documentElement.style.setProperty('--pwa-banner-height', `${height}px`);
      }
    };

    // Initial measurement
    updateHeight();

    // Update on resize
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [isVisible, isInstalled, deferredPrompt]);

  // Don't show if already installed or not available
  if (isInstalled || !isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div 
      data-pwa-banner
      className="sticky top-0 w-full bg-primary/10 border-b border-primary/20 z-50 animate-in slide-in-from-top-2"
    >
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Download className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Install Bill Splitter
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Add to home screen for quick access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="tap-scale h-8 px-3 text-xs"
            >
              Install
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-7 w-7 tap-scale"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
