import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[var(--text)]">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'block w-full rounded-xl border px-3 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]',
          'bg-white text-black data-[theme=dark]:bg-[#374151] data-[theme=dark]:border-[#4b5563] data-[theme=dark]:text-[#f7fafc]',
          error ? 'border-red-500' : 'border-slate-200',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
