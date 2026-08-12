import type { ReactNode } from "react";

/**
 * Keeps wide content (tables, mostly) scrolling inside its own card instead of
 * pushing the page into a horizontal scroll.
 */
export default function ScrollX({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`-mx-1 overflow-x-auto px-1 ${className}`}>{children}</div>;
}
