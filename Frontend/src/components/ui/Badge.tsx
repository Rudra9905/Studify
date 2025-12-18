import React from 'react';
import clsx from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const styles: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700',
    // Use the primary blue palette for success / "good" states instead of green
    success: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    outline: 'border border-slate-300 text-slate-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
