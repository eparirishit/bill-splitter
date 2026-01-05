"use client";

import { useEffect, useState } from 'react';

export function useTheme() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('bill_splitter_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Sync with actual DOM state
    const el = document.documentElement;
    const isDark = el.classList.contains('dark');
    if (isDark !== darkMode) {
      setDarkMode(isDark);
    }
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (darkMode) {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }
    localStorage.setItem('bill_splitter_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // Immediately update DOM for instant feedback
    const el = document.documentElement;
    if (newDarkMode) {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }
    localStorage.setItem('bill_splitter_theme', newDarkMode ? 'dark' : 'light');
  };

  return { darkMode, setDarkMode, toggleTheme };
}

