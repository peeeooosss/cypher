import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

const fieldBase =
  "w-full rounded-md border border-line bg-paper px-3 text-body-md text-ink placeholder:text-ink-muted/70 transition-colors focus:border-accent focus:outline-none disabled:opacity-50";

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cx("mb-1.5 block text-body-sm font-semibold text-ink", className)} {...rest} />
  );
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-body-sm text-ink-muted">{children}</p>;
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1.5 text-body-sm font-medium text-accent">
      {children}
    </p>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(fieldBase, "h-11", className)} {...rest} />;
}

export function Textarea({ className, rows = 4, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cx(fieldBase, "py-2.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, "h-11 cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
}
