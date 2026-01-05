import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, ...props }) => (
  <svg viewBox="0 0 100 100" className={cn("w-12 h-12", className)} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <style>
      {`
        .bar-1 { animation: float 3s ease-in-out infinite; }
        .bar-2 { animation: float 3s ease-in-out infinite 0.5s; }
        .bar-3 { animation: float 3s ease-in-out infinite 1s; }
        .sparkle { animation: pulse 2s ease-in-out infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
      `}
    </style>
    <rect x="25" y="20" width="50" height="60" rx="12" fill="#F8FAFC" className="dark:fill-slate-800" />
    <rect className="bar-1" x="35" y="35" width="30" height="6" rx="3" fill="#4285F4" />
    <rect className="bar-2" x="35" y="48" width="22" height="6" rx="3" fill="#EA4335" />
    <rect className="bar-3" x="35" y="61" width="26" height="6" rx="3" fill="#FBBC05" />
    <path className="sparkle" d="M75 15L78 22L85 25L78 28L75 35L72 28L65 25L72 22L75 15Z" fill="#34A853" />
    <circle cx="75" cy="75" r="8" fill="#4f46e5" fillOpacity="0.1" />
  </svg>
);

