import type { ReactNode } from "react";

/** Shared footer height so paired dashboard panels stay aligned */
export function PanelFooter({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mt-auto flex min-h-[3.25rem] w-full shrink-0 items-center border-t border-slate-100 px-4 py-3 ${className}`}
    >
      {children}
    </div>
  );
}

/** Body area shared by Recent Events and Hardware Health */
export const PAIRED_PANEL_BODY_CLASS =
  "flex min-h-[13.5rem] max-h-[13.5rem] flex-col overflow-hidden";
