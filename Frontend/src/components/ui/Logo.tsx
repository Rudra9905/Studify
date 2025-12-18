import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }[size];

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses} flex items-center justify-center rounded-lg bg-blue-400 shadow-sm`}>
        <svg
          className={`${sizeClasses} p-1.5`}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Graduation cap - white */}
          <path
            d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"
            fill="white"
          />
          {/* Tassel dot - yellow */}
          <circle cx="21" cy="9" r="1.5" fill="#FCD34D" />
        </svg>
      </div>
      {showText && (
        <span className={`${textSizes} font-semibold tracking-tight text-blue-900`}>
          Studify
        </span>
      )}
    </div>
  );
};

