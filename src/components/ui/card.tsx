import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cx(
        "rounded-lg border border-line bg-paper-soft shadow-card",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("flex items-start justify-between gap-3 p-md sm:p-lg", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cx("font-display text-title-md uppercase tracking-wide", className)} {...rest} />
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("px-md pb-md sm:px-lg sm:pb-lg", className)} {...rest} />;
}
