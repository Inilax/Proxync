import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Eyebrow / Section header                                            */
/* ------------------------------------------------------------------ */

export function Eyebrow({
  children,
  tone = "primary",
  className,
}: {
  children: ReactNode;
  tone?: "primary" | "tertiary" | "secondary" | "outline";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    tertiary: "text-tertiary",
    secondary: "text-secondary",
    outline: "text-on-surface-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-low px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "primary" && "bg-primary animate-pulse-dot",
          tone === "tertiary" && "bg-tertiary animate-pulse-dot",
          tone === "secondary" && "bg-secondary",
          tone === "outline" && "bg-outline",
        )}
      />
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-[-0.02em] text-on-surface sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-xl text-balance text-base leading-relaxed text-on-surface-variant sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonBaseProps = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg" | "sm";
  children: ReactNode;
  className?: string;
};

const buttonVariants: Record<NonNullable<ButtonBaseProps["variant"]>, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-strong hover:shadow-glow-primary hover:brightness-105",
  secondary:
    "border border-outline-variant/60 bg-surface-container-lowest/60 text-on-surface hover:border-outline-variant hover:bg-surface-container",
  ghost: "text-on-surface-variant hover:text-on-surface",
};

const buttonSizes: Record<NonNullable<ButtonBaseProps["size"]>, string> = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-sm",
};

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-tight transition-all duration-200 ring-focus active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

type AnchorButtonProps = ButtonBaseProps & AnchorHTMLAttributes<HTMLAnchorElement>;
type NativeButtonProps = ButtonBaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className, ...props }: AnchorButtonProps | NativeButtonProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";
  const classes = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);

  if ("href" in props && props.href) {
    const { href, variant: _v, size: _s, ...rest } = props as AnchorButtonProps;
    return (
      <a href={href} className={classes} {...rest}>
        {rest.children}
      </a>
    );
  }

  const { variant: _v2, size: _s2, ...rest } = props as NativeButtonProps;
  return (
    <button type="button" className={classes} {...rest}>
      {rest.children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */

export function MonoTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] tracking-wide text-on-surface-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant/30 bg-surface-container/60 backdrop-blur-sm transition-colors duration-300 hover:border-outline-variant/60",
        className,
      )}
    >
      {children}
    </div>
  );
}
