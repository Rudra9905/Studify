import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'rounded-2xl p-6 bg-[var(--card)] text-[var(--text)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--border-subtle)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
