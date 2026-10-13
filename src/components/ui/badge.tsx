import type { HTMLAttributes } from "react";
import { cx } from "./cx";

type Tone = "neutral" | "accent" | "success" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "border-line bg-paper text-ink-muted",
  accent: "border-accent/40 bg-accent/10 text-accent",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  info: "border-[#2980FF]/40 bg-[#2980FF]/10 text-[#2980FF]",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-body-xs font-semibold uppercase tracking-wider",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
