import type { ReactNode } from "react";
import { formatNumber, formatPeso, formatPesoCompact } from "@/lib/format";

const TONES = {
  default: "bg-white border-gray-200",
  gold: "bg-gold-500/5 border-gold-500/20",
  brand: "bg-brand-100/60 border-brand-200",
  red: "bg-red-50 border-red-100",
  purple: "bg-purple-50 border-purple-100",
  green: "bg-green-50 border-green-100",
  blue: "bg-blue-50 border-blue-100",
  yellow: "bg-yellow-50 border-yellow-100",
  gray: "bg-gray-50 border-gray-200",
} as const;

const SIZES = {
  md: "text-xl sm:text-2xl lg:text-3xl",
  sm: "text-lg sm:text-xl lg:text-2xl",
} as const;

export type StatCardTone = keyof typeof TONES;

/**
 * Peso value that degrades to its compact form on narrow screens, so a
 * seven-figure number never blows out a card on mobile.
 */
export function Money({
  value,
  cents = false,
  className = "",
}: {
  value: number;
  cents?: boolean;
  className?: string;
}) {
  const full = formatPeso(value, { cents });
  const short = formatPesoCompact(value);

  if (full === short) return <span className={className}>{full}</span>;

  return (
    <span className={className} title={full}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </span>
  );
}

export default function StatCard({
  label,
  value,
  sub,
  trend,
  trendLabel,
  icon,
  iconBg,
  valueColor,
  tone = "default",
  size = "md",
  format,
  layout = "stacked",
  valueFirst = false,
  footer,
}: {
  label: string;
  value: string | number;
  sub?: ReactNode;
  /** Number renders as `N%`; a string renders as-is. `0`/`null` reads "On track". */
  trend?: number | string | null;
  trendLabel?: string;
  icon?: ReactNode;
  iconBg?: string;
  valueColor?: string;
  tone?: StatCardTone;
  size?: keyof typeof SIZES;
  format?: "money";
  layout?: "stacked" | "split";
  valueFirst?: boolean;
  footer?: ReactNode;
}) {
  // Only a signed value gets a direction. Informational trends ("Live",
  // "75 total") are neither up nor down, so they render as plain text rather
  // than being misreported as a decline.
  const signed =
    typeof trend === "number" || /^[+-]/.test(String(trend ?? ""));
  const rising = typeof trend === "number" ? trend > 0 : String(trend).startsWith("+");
  const flat = trend === 0 || trend == null;

  const valueNode = (
    <span
      className={`block min-w-0 truncate font-display font-bold ${SIZES[size] ?? SIZES.md} ${
        valueColor || "text-brand-900"
      }`}
    >
      {format === "money" && typeof value === "number" ? (
        <Money value={value} />
      ) : typeof value === "number" ? (
        formatNumber(value)
      ) : (
        value
      )}
    </span>
  );

  const iconNode = icon && (
    <div
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
        iconBg || "bg-gray-100"
      }`}
    >
      {icon}
    </div>
  );

  const trendNode =
    footer === undefined
      ? trend !== undefined && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {flat ? (
              <span className="text-gray-500">— On track</span>
            ) : (
              <>
                <span
                  className={
                    !signed
                      ? "text-gray-600"
                      : rising
                        ? "text-emerald-600"
                        : "text-red-500"
                  }
                >
                  {signed && `${rising ? "↗" : "↘"} `}
                  {typeof trend === "string" ? trend : `${trend}%`}
                </span>
                {trendLabel && <span className="text-gray-400">{trendLabel}</span>}
              </>
            )}
          </div>
        )
      : footer;

  const labelNode = valueFirst ? (
    <span className="text-sm text-gray-500">{label}</span>
  ) : (
    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
      {label}
    </span>
  );

  if (layout === "split") {
    return (
      <div className={`rounded-xl border p-4 ${TONES[tone] ?? TONES.default}`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm text-gray-500">{label}</span>
          {iconNode}
        </div>
        {valueNode}
        {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
        {trendNode}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-4 sm:p-5 ${
        TONES[tone] ?? TONES.default
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {valueFirst ? (
            <>
              {valueNode}
              {labelNode}
            </>
          ) : (
            <>
              {labelNode}
              {valueNode}
            </>
          )}
          {sub && <span className="text-xs text-gray-500">{sub}</span>}
        </div>
        {iconNode}
      </div>
      {trendNode}
    </div>
  );
}
