import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Kept for the pages that already pass `action`. */
  action?: ReactNode;
  children?: ReactNode;
}) {
  const trailing = children ?? action;

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold text-brand-900 md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {trailing && (
        <div className="flex flex-shrink-0 items-center gap-2">{trailing}</div>
      )}
    </div>
  );
}
