import React from 'react';
import clsx from 'clsx';

const baseClasses =
  'inline-flex items-center justify-center rounded-[12px] font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary:
    'bg-[var(--primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[color-mix(in_oklab,var(--primary)_85%,#0f172a_15%)]',
  secondary:
    'bg-[var(--card)] text-[var(--text)] border border-[var(--border-subtle)] shadow-[var(--shadow-subtle)] hover:bg-[color-mix(in_oklab,var(--card)_85%,var(--light)_15%)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[color-mix(in_oklab,var(--background)_80%,var(--light)_20%)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth,
  ...props
}) => {
  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
