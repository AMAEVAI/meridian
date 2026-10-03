import React from 'react';

interface BBLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function BBLogo({ size = 'md', className = '', showText = false }: BBLogoProps) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* BB Monogram Luxury Emblem */}
      <div 
        className={`${sizeClasses[size]} relative rounded-xl overflow-hidden bg-black border border-white/25 flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.4)] group shrink-0 transition-transform active:scale-95`}
      >
        {/* Ambient Specular Gloss Highlight */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/80 pointer-events-none z-10" />
        
        {/* Razor-sharp Vector Monogram BB */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full p-1.5 relative z-0 select-none"
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Metallic Silver Chrome Gradient */}
            <linearGradient id="bbChrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="30%" stopColor="#D4D4D8" />
              <stop offset="50%" stopColor="#71717A" />
              <stop offset="70%" stopColor="#E4E4E7" />
              <stop offset="100%" stopColor="#A1A1AA" />
            </linearGradient>

            <linearGradient id="bbFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#27272A" />
              <stop offset="100%" stopColor="#09090B" />
            </linearGradient>

            <filter id="bbGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#FFFFFF" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* First 'B' */}
          <path
            d="M 18 16 L 42 16 C 52 16 57 21 57 30 C 57 36 53 41 47 43 C 55 45 60 51 60 62 C 60 74 53 82 41 82 L 18 82 Z"
            fill="url(#bbFill)"
            stroke="url(#bbChrome)"
            strokeWidth="3.5"
            strokeLinejoin="round"
            filter="url(#bbGlow)"
          />
          <path
            d="M 28 27 L 39 27 C 44 27 47 29 47 34 C 47 39 44 41 39 41 L 28 41 Z"
            fill="#09090B"
            stroke="url(#bbChrome)"
            strokeWidth="2"
          />
          <path
            d="M 28 51 L 41 51 C 46 51 50 54 50 61 C 50 68 46 71 41 71 L 28 71 Z"
            fill="#09090B"
            stroke="url(#bbChrome)"
            strokeWidth="2"
          />

          {/* Second Interlocking 'B' */}
          <path
            d="M 44 16 L 68 16 C 78 16 83 21 83 30 C 83 36 79 41 73 43 C 81 45 86 51 86 62 C 86 74 79 82 67 82 L 44 82 Z"
            fill="url(#bbFill)"
            stroke="url(#bbChrome)"
            strokeWidth="3.5"
            strokeLinejoin="round"
            filter="url(#bbGlow)"
          />
          <path
            d="M 54 27 L 65 27 C 70 27 73 29 73 34 C 73 39 70 41 65 41 L 54 41 Z"
            fill="#09090B"
            stroke="url(#bbChrome)"
            strokeWidth="2"
          />
          <path
            d="M 54 51 L 67 51 C 72 51 76 54 76 61 C 76 68 72 71 67 71 L 54 71 Z"
            fill="#09090B"
            stroke="url(#bbChrome)"
            strokeWidth="2"
          />
        </svg>
      </div>

      {showText && (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-widest text-white uppercase font-sans">
              BLACKBORZ
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 font-mono">
              AI
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              Studio • Gemini 3.8
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
