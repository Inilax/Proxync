import { useId } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  const grad = useId();
  const core = useId();
  const halo = useId();

  return (
    <svg viewBox="0 0 240 240" aria-hidden="true" className={cn("h-8 w-8", className)}>
      <defs>
        <linearGradient id={grad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <radialGradient id={core} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="45%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>
        <radialGradient id={halo} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill={`url(#${halo})`} />
      <path
        d="M120,25 L202.3,72.5 L202.3,167.5 L120,215 L37.7,167.5 L37.7,72.5 Z"
        fill="#0a141c"
        stroke={`url(#${grad})`}
        strokeWidth="3"
      />
      <path
        d="M120,40 L189.3,80 L189.3,160 L120,200 L50.7,160 L50.7,80 Z"
        fill="none"
        stroke="#cbd5e1"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      <line x1="120" y1="40" x2="120" y2="96" stroke={`url(#${grad})`} strokeWidth="8" strokeLinecap="round" />
      <line x1="189.3" y1="160" x2="140.8" y2="132" stroke={`url(#${grad})`} strokeWidth="8" strokeLinecap="round" />
      <line x1="50.7" y1="160" x2="99.2" y2="132" stroke={`url(#${grad})`} strokeWidth="8" strokeLinecap="round" />
      <circle cx="120" cy="40" r="5" fill="#cbd5e1" />
      <circle cx="189.3" cy="160" r="5" fill="#64748b" />
      <circle cx="50.7" cy="160" r="5" fill="#64748b" />
      <circle cx="120" cy="120" r="27" fill={`url(#${core})`} />
    </svg>
  );
}
