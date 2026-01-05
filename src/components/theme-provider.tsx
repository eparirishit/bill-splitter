"use client";

import { useEffect, useState } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initialize theme immediately on mount
    const initializeTheme = () => {
      const stored = localStorage.getItem('bill_splitter_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = stored ? stored === 'dark' : prefersDark;
      
      const el = document.documentElement;
      if (shouldBeDark) {
        el.classList.add('dark');
      } else {
        el.classList.remove('dark');
      }
    };

    initializeTheme();
    setMounted(true);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const stored = localStorage.getItem('bill_splitter_theme');
      if (!stored) {
        // Only update if user hasn't set a preference
        const el = document.documentElement;
        if (mediaQuery.matches) {
          el.classList.add('dark');
        } else {
          el.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

