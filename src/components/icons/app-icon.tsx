
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Custom App Icon component featuring a stylized abstract bill/receipt.
 * Uses theme's primary color for accents.
 */
export const AppIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor" // Default stroke color, overridden by inline styles
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)} // Default size can be overridden
      {...props}
    >
      {/* Outer rectangle representing the bill */}
      <rect
        x="5" y="3" width="14" height="18" rx="2"
        stroke="hsl(var(--foreground-h) var(--foreground-s) var(--foreground-l) / 0.4)" // Lighter border
        fill="hsl(var(--card-h) var(--card-s) var(--card-l))" // Card background color
        strokeWidth="1.5"
      />
      {/* Stylized lines representing text/items */}
      <line
        x1="8" y1="8" x2="16" y2="8"
        stroke="hsl(var(--primary-h) var(--primary-s) var(--primary-l))" // Primary color accent
        strokeWidth="1.5"
      />
      <line
        x1="8" y1="12" x2="16" y2="12"
        stroke="hsl(var(--muted-foreground-h) var(--muted-foreground-s) var(--muted-foreground-l) / 0.6)" // Muted line
        strokeWidth="1.5"
      />
       <line
        x1="8" y1="16" x2="13" y2="16" // Shorter line
        stroke="hsl(var(--muted-foreground-h) var(--muted-foreground-s) var(--muted-foreground-l) / 0.6)" // Muted line
        strokeWidth="1.5"
      />
       {/* Circle element for visual interest, could represent a stamp or total */}
        <circle
            cx="16" cy="16" r="1.5"
            fill="hsl(var(--primary-h) var(--primary-s) var(--primary-l))"
            stroke="none"
        />
    </svg>
  )
);
AppIcon.displayName = 'AppIcon';
