import type { ReactNode } from "react";

/** Gradient-highlighted card with hover bounce (see index.css `.card-highlight`) */
export const cardClassName = "card-highlight";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${cardClassName} ${className}`.trim()}>{children}</div>;
}
