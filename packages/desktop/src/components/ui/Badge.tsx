import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'muted';
}

export function Badge({
  children,
  variant = 'primary',
  className = '',
  ...props
}: BadgeProps) {
  const baseStyle = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider select-none border';
  
  const variants = {
    primary: 'bg-primary/15 text-primary border-primary/25',
    secondary: 'bg-secondary/15 text-secondary border-secondary/25',
    success: 'bg-primary/15 text-primary border-primary/25',
    danger: 'bg-error/15 text-error border-error/25',
    warning: 'bg-tertiary/15 text-tertiary border-tertiary/25',
    muted: 'bg-surface-container-highest text-on-surface-variant border-outline-variant'
  };

  return (
    <span
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
