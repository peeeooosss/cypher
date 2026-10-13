import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-contrast hover:brightness-110 active:brightness-95",
  secondary: "bg-paper-soft text-ink hover:bg-paper-raised border border-line",
  outline: "border border-line-strong text-ink hover:border-accent hover:text-accent",
  ghost: "text-ink-muted hover:text-ink hover:bg-paper-soft",
  danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-button-sm rounded-md",
  md: "h-11 px-5 text-button-md rounded-md",
  lg: "h-12 px-6 text-button-md rounded-lg",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex select-none items-center justify-center gap-2 font-sans font-semibold transition-all duration-200 cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
