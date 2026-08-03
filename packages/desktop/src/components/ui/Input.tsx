import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string; // Material symbol name
}

export function Input({
  icon,
  className = '',
  ...props
}: InputProps) {
  const baseStyle = 'bg-surface-container-low border border-outline-variant rounded-lg text-on-surface text-sm px-4 py-2.5 w-full focus:outline-none focus:border-primary transition-all placeholder:text-outline';
  
  if (icon) {
    return (
      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none select-none">
          {icon}
        </span>
        <input
          className={`${baseStyle} pl-10 ${className}`}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={`${baseStyle} ${className}`}
      {...props}
    />
  );
}
