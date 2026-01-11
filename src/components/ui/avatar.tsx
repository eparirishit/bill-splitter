"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
};

export function Avatar({ src, alt = "", fallback = "U", className, size = "md" }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const showImage = src && !imageError;
  const initials = fallback.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "relative rounded-[1.25rem] overflow-hidden border-2 border-white dark:border-slate-800 shadow-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        <>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />
          )}
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-cover relative z-10",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
          />
        </>
      ) : (
        <div className="text-indigo-600 dark:text-indigo-400 font-black">
          {initials}
        </div>
      )}
    </div>
  );
}
