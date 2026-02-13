import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, ...props }) => (
  <svg viewBox="0 0 100 100" className={cn("w-12 h-12", className)} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
        <feOffset dx="0" dy="1.5" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.1" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <style>
      {`
        .bar { animation: barPulse 4s ease-in-out infinite; }
        .bar-1 { animation-delay: 0s; }
        .bar-2 { animation-delay: 0.3s; }
        .bar-3 { animation-delay: 0.6s; }
        @keyframes barPulse {
          0%, 100% { opacity: 1; transform: scaleX(1); }
          50% { opacity: 0.7; transform: scaleX(0.92); }
        }
      `}
    </style>
    {/* Serrated receipt background */}
    <path
      d="M25 20C25 18 27 16 29 16H71C73 16 75 18 75 20V78L71 74L67 78L63 74L59 78L55 74L51 78L47 74L43 78L39 74L35 78L31 74L25 80V20Z"
      fill="white"
      className="dark:fill-slate-800"
      filter="url(#logoShadow)"
    />
    {/* Animated data bars */}
    <rect className="bar bar-1" x="35" y="30" width="30" height="5" rx="2" fill="#4285F4" />
    <rect className="bar bar-2" x="35" y="42" width="18" height="5" rx="2" fill="#EA4335" />
    <rect className="bar bar-3" x="35" y="54" width="24" height="5" rx="2" fill="#FBBC05" />
    {/* Verification symbols */}
    <path d="M60 66L65 71L70 66" stroke="#34A853" strokeWidth="4" strokeLinecap="round" />
    <circle cx="37.5" cy="68.5" r="3" fill="#34A853" />
  </svg>
);
