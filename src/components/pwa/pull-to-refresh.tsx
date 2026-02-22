"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

const PULL_THRESHOLD = 70;
const MAX_PULL = 120;

/**
 * Pull-to-refresh for PWA.
 * Overlay-only: does not affect layout or scroll. Uses document scroll (window.scrollY).
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(true);
  const startY = React.useRef(0);
  const startScrollY = React.useRef(0);
  const currentPull = React.useRef(0);

  React.useEffect(() => {
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsEnabled(hasTouch);
  }, []);

  React.useEffect(() => {
    if (!isEnabled) return;

    const getScrollY = () =>
      window.scrollY ?? document.documentElement.scrollTop ?? 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
      startScrollY.current = getScrollY();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startScrollY.current > 15) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      if (deltaY > 0) {
        const resisted = Math.min(deltaY * 0.55, MAX_PULL);
        currentPull.current = resisted;
        setPullDistance(resisted);
        if (startScrollY.current <= 0) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (currentPull.current >= PULL_THRESHOLD) {
        setIsRefreshing(true);
        window.location.reload();
      } else {
        setPullDistance(0);
      }
      currentPull.current = 0;
      startY.current = 0;
      startScrollY.current = 0;
    };

    document.addEventListener("touchstart", handleTouchStart as EventListener, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove as EventListener, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd as EventListener, {
      passive: true,
    });

    return () => {
      document.removeEventListener(
        "touchstart",
        handleTouchStart as EventListener
      );
      document.removeEventListener(
        "touchmove",
        handleTouchMove as EventListener
      );
      document.removeEventListener("touchend", handleTouchEnd as EventListener);
    };
  }, [isEnabled]);

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-2 pointer-events-none"
          style={{
            transform: `translateY(${Math.min(pullDistance, MAX_PULL) - 48}px)`,
            transition:
              pullDistance === 0 && !isRefreshing
                ? "transform 0.2s ease-out"
                : "none",
          }}
        >
          <div className="w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center">
            {isRefreshing || pullDistance >= PULL_THRESHOLD ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <svg
                className="h-5 w-5 text-muted-foreground transition-transform"
                style={{
                  transform: `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 180, 180)}deg)`,
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
          </div>
        </div>
      )}
      {children}
    </>
  );
}
