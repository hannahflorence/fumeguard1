import type { ReactNode } from "react";

/** Soft floating card shadow (reference: material-style elevation on white) */
export const cardClassName =
  "rounded-xl bg-white shadow-[0_4px_15px_rgba(0,0,0,0.1)]";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${cardClassName} ${className}`.trim()}>{children}</div>;
}
