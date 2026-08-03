import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({
  children,
  hoverable = true,
  className = '',
  ...props
}: CardProps) {
  const baseStyle = 'relative bg-surface-container border border-outline-variant p-6 rounded-xl overflow-hidden transition-all';
  const hoverStyle = hoverable ? 'hover:bg-surface-container-high hover:border-primary/50 cursor-pointer' : '';

  return (
    <div
      className={`${baseStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {hoverable && (
        <div className="absolute inset-0 border border-transparent rounded-xl pointer-events-none transition-colors group-hover:border-primary/20" />
      )}
      {children}
    </div>
  );
}
