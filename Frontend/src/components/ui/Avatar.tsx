import React from 'react';
import clsx from 'clsx';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  imageUrl?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md', imageUrl }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
  }[size];

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-700',
        sizeClasses
      )}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};
