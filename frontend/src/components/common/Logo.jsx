import React, { useId } from 'react';

export default function Logo({ className = "h-8 w-8", withText = true, subtitle = "Airport Rescue & Fire Fighting" }) {
  const gradientId = useId();
  const flameGradientId = useId();

  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        className={className}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#b91c1c" />
            <stop offset="1" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id={flameGradientId} x1="18" y1="12" x2="30" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Shield background */}
        <path
          d="M24 4L8 10V22C8 32.5 14.8 42.2 24 44C33.2 42.2 40 32.5 40 22V10L24 4Z"
          fill={`url(#${gradientId})`}
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner shield border */}
        <path
          d="M24 7L11 12V22C11 30.5 16.5 38.5 24 40.5C31.5 38.5 37 30.5 37 22V12L24 7Z"
          stroke="#fca5a5"
          strokeWidth="1"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* Fire Fighting Flame & Cross Symbol */}
        <path
          d="M24 13C22 17 17 21 17 26C17 29.866 20.134 33 24 33C27.866 33 31 29.866 31 26C31 22 28 19 28 19C28 19 27 22 25 22C24 22 23 20 24 13Z"
          fill={`url(#${flameGradientId})`}
        />
        <circle cx="24" cy="27" r="2.5" fill="#ffffff" />
      </svg>

      {withText && (
        <div className="flex flex-col text-left">
          <span className="text-base font-bold tracking-tight text-slate-900 leading-none">
            ARFF OPS
          </span>
          <span className="text-[10px] font-medium tracking-wider uppercase text-slate-500 mt-1">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
}
