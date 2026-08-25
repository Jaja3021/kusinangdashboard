"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Clock, GitPullRequestArrow, Search, UtensilsCrossed, X } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Modal from "@/components/ui/Modal";
import Badge, { type BadgeTone, BranchBadge } from "@/components/ui/Badge";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { formatPeso } from "@/lib/format";
import { ALL_BRANCHES, BRANCH_OPTIONS, getBranchByName, getBranchById } from "@/lib/mt/branches";
import { CATERING_DISH_CATALOG, CATERING_DISH_CATEGORIES, cateringCategoryOf, type CateringDishCategory } from "@/lib/menu/dish-catalog";
import {
  approveChangeRequestAction,
  createMenuChangeRequestAction,
  getChangeRequestImpactAction,
  getOrderMenuOptionsAction,
  rejectChangeRequestAction,
  searchOpenOrdersForMenuChangeAction,
  type OpenOrderOption,
  type OrderMenuOptions,
} from "@/app/dashboard/change-requests/actions";
import { diffPayloads, summarizeChanges } from "@/lib/change-requests/diff";
import type { ChangeRequestImpact } from "@/lib/change-requests/impact";
import type { ChangeRequestRecord, ChangeRequestStatus } from "@/lib/change-requests/types";

type TabKey = "pending" | "approved" | "rejected" | "cancelled" | "all";
type PriceDirection = "any" | "increase" | "decrease" | "none";

const STATUS_TONE: Record<ChangeRequestStatus, BadgeTone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  cancelled: "slate",
};

const STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function branchName(id: string | null): string | undefined {
  return id ? (getBranchById(id)?.name ?? id) : undefined;
}

function priceDirectionOf(diff: number): PriceDirection {
  if (diff > 0.005) return "increase";
  if (diff < -0.005) return "decrease";
  return "none";
}

export default function ChangeRequestsClient({
  requests,
  canApprove,
  canPropose,
  defaultBranch,
}: {
  requests: ChangeRequestRecord[];
  canApprove: boolean;
  /** Whether this admin may propose a change themselves (the "Propose Menu
   * Change" button) — separate from canApprove, since Finance Officer can't
   * approve but every role with manage:bookings can propose. */
  canPropose: boolean;
  /** A branch NAME (matches lib/mt/branches), or null for Owners — mirrors
   * the useBranch() convention the rest of the dashboard uses. This is a UI
   * convenience only, not a security boundary: RLS can only see
   * public.is_admin(), never a specific branch. */
  defaultBranch: string | null;
}) {
  const [rows, setRows] = useState(requests);
  const [tab, setTab] = useState<TabKey>("pending");
  const [branchFilter, setBranchFilter] = useState(defaultBranch ?? ALL_BRANCHES);
  const [search, setSearch] = useState("");
  const [priceDirection, setPriceDirection] = useState<PriceDirection>("any");

  const [detail, setDetail] = useState<ChangeRequestRecord | null>(null);
  const [impact, setImpact] = useState<ChangeRequestImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [forceAcknowledged, setForceAcknowledged] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [proposeOpen, setProposeOpen] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderOptions, setOrderOptions] = useState<OpenOrderOption[]>([]);
  const [orderSearchLoading, setOrderSearchLoading] = useState(false);
  const [menuOptions, setMenuOptions] = useState<OrderMenuOptions | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuCategory, setMenuCategory] = useState<CateringDishCategory | "">("");
  const [menuDish, setMenuDish] = useState("");
  const [proposeNotes, setProposeNotes] = useState("");
  const [proposeError, setProposeError] = useState<string | null>(null);
  const [proposeLoading, setProposeLoading] = useState(false);

  const branchId = branchFilter === ALL_BRANCHES ? null : (getBranchByName(branchFilter)?.id ?? null);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const approved = useMemo(() => rows.filter((r) => r.status === "approved"), [rows]);
  const rejected = useMemo(() => rows.filter((r) => r.status === "rejected"), [rows]);
  const cancelled = useMemo(() => rows.filter((r) => r.status === "cancelled"), [rows]);

  const byTab = tab === "pending" ? pending : tab === "approved" ? approved : tab === "rejected" ? rejected : tab === "cancelled" ? cancelled : rows;

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return byTab.filter((r) => {
      if (branchId && r.branch !== branchId) return false;
      if (priceDirection !== "any" && priceDirectionOf(r.priceDifference) !== priceDirection) return false;
      if (q) {
        const haystack = `${r.customerName} ${r.orderNumber} ${r.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [byTab, branchId, priceDirection, search]);

  const netPendingValue = useMemo(() => pending.reduce((sum, r) => sum + r.priceDifference, 0), [pending]);

  function applyStatus(id: string, patch: Partial<ChangeRequestRecord>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function openDetail(row: ChangeRequestRecord) {
    setDetail(row);
    setImpact(null);
    setImpactError(null);
    setRejecting(false);
    setRejectReason("");
    setForceAcknowledged(false);
    setImpactLoading(true);
    try {
      const result = await getChangeRequestImpactAction(row.id);
      setImpact(result);
    } catch (err) {
      setImpactError(err instanceof Error ? err.message : "Failed to load impact.");
    } finally {
      setImpactLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setImpact(null);
  }

  async function handleApprove(force: boolean) {
    if (!detail) return;
    const diffs = diffPayloads(detail.originalData, detail.requestedData, detail.originalData);
    const summary = summarizeChanges(diffs);
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Approving this request will update the official booking, pricing, payment balance, menu, and related operational requirements.\n\n${summary}\n\nProceed?`,
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await approveChangeRequestAction(detail.id, force);
      applyStatus(detail.id, { status: "approved", reviewerName: result.request.reviewerName, reviewedAt: result.request.reviewedAt });
      closeDetail();
      if (result.reservationSyncWarning) alert(result.reservationSyncWarning);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve change request.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!detail || !rejectReason.trim()) return;
    if (typeof window !== "undefined" && !window.confirm("Reject this change request? The original booking will remain unchanged.")) return;

    setActionLoading(true);
    try {
      const rejected = await rejectChangeRequestAction(detail.id, rejectReason.trim());
      applyStatus(detail.id, { status: "rejected", reviewerName: rejected.reviewerName, reviewedAt: rejected.reviewedAt, rejectionReason: rejected.rejectionReason });
      closeDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject change request.");
    } finally {
      setActionLoading(false);
    }
  }

  function openPropose() {
    setProposeOpen(true);
    setOrderQuery("");
    setOrderOptions([]);
    setMenuOptions(null);
    setMenuCategory("");
    setMenuDish("");
    setProposeNotes("");
    setProposeError(null);
  }

  function closePropose() {
    setProposeOpen(false);
  }

  async function runOrderSearch(q: string) {
    setOrderQuery(q);
    setOrderSearchLoading(true);
    try {
      setOrderOptions(await searchOpenOrdersForMenuChangeAction(q));
    } catch {
      setOrderOptions([]);
    } finally {
      setOrderSearchLoading(false);
    }
  }

  async function selectOrderForPropose(orderId: string) {
    setMenuLoading(true);
    setProposeError(null);
    try {
      const options = await getOrderMenuOptionsAction(orderId);
      setMenuOptions(options);
      const firstCategory = (Object.keys(options.selectedDishes)[0] as CateringDishCategory | undefined) ?? "";
      setMenuCategory(firstCategory);
      setMenuDish(firstCategory ? options.selectedDishes[firstCategory] : "");
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : "Failed to load this order's menu.");
    } finally {
      setMenuLoading(false);
    }
  }

  async function submitPropose() {
    if (!menuOptions || !menuCategory || !menuDish) return;
    const currentDish = menuOptions.selectedDishes[menuCategory];
    if (currentDish === menuDish) {
      setProposeError("Pick a different dish than what's already booked.");
      return;
    }

    setProposeLoading(true);
    setProposeError(null);
    try {
      const nextSelectedDishes = { ...menuOptions.selectedDishes, [menuCategory]: menuDish };
      const created = await createMenuChangeRequestAction(
        menuOptions.orderId,
        nextSelectedDishes,
        proposeNotes.trim(),
      );
      setRows((prev) => [created, ...prev]);
      setTab("pending");
      closePropose();
    } catch (err) {
      setProposeError(err instanceof Error ? err.message : "Failed to create change request.");
    } finally {
      setProposeLoading(false);
    }
  }

  const columns: Column<ChangeRequestRecord>[] = [
    {
      key: "orderNumber",
      header: "Order #",
      render: (r) => (
        <button type="button" onClick={() => openDetail(r)} className="font-medium text-brand-900 hover:underline">
          {r.orderNumber}
        </button>
      ),
    },
    { key: "customerName", header: "Customer" },
    { key: "branch", header: "Branch", render: (r) => <BranchBadge branch={branchName(r.branch)} /> },
    { key: "eventDate", header: "Event Date", render: (r) => r.eventDate || "—" },
    {
      key: "changes",
      header: "Requested Change",
      render: (r) => (
        <span className="block max-w-xs truncate" title={summarizeChanges(diffPayloads(r.originalData, r.requestedData, r.originalData))}>
          {summarizeChanges(diffPayloads(r.originalData, r.requestedData, r.originalData))}
        </span>
      ),
    },
    {
      key: "priceDifference",
      header: "Δ Total",
      render: (r) => (
        <span className={r.priceDifference > 0 ? "font-medium text-red-600" : r.priceDifference < 0 ? "font-medium text-emerald-600" : "text-slate-500"}>
          {r.priceDifference > 0 ? "+" : ""}
          {formatPeso(r.priceDifference)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (r) => <Badge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
    { key: "requestedAt", header: "Requested", render: (r) => new Date(r.requestedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Pending Review" value={String(pending.length)} icon={<Clock size={18} className="text-gold-600" />} />
        <StatCard
          label="Net Value (Pending)"
          value={formatPeso(netPendingValue)}
          valueColor={netPendingValue >= 0 ? "text-red-600" : "text-emerald-600"}
          icon={<GitPullRequestArrow size={18} className="text-gold-600" />}
        />
        <StatCard label="Approved" value={String(approved.length)} icon={<CheckCircle2 size={18} className="text-gold-600" />} />
        <StatCard label="Rejected" value={String(rejected.length)} icon={<Ban size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200">
        <div className="flex flex-wrap gap-6">
          {(
            [
              ["pending", `Pending (${pending.length})`],
              ["approved", `Approved (${approved.length})`],
              ["rejected", `Rejected (${rejected.length})`],
              ["cancelled", `Cancelled (${cancelled.length})`],
              ["all", `All (${rows.length})`],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                tab === key ? "border-brand-900 text-brand-900" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {canPropose && (
          <button
            type="button"
            onClick={openPropose}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            <UtensilsCrossed size={14} />
            Propose Menu Change
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, order #, email..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-600">
          {BRANCH_OPTIONS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select value={priceDirection} onChange={(e) => setPriceDirection(e.target.value as PriceDirection)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-slate-600">
          <option value="any">Any Price Change</option>
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
          <option value="none">No Change</option>
        </select>
        {(search || branchFilter !== ALL_BRANCHES || priceDirection !== "any") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setBranchFilter(ALL_BRANCHES);
              setPriceDirection("any");
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      <div className="mt-4">
        {visibleRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">No change requests here yet.</p>
        ) : (
          <DataTable columns={columns} rows={visibleRows} />
        )}
      </div>

      <Modal isOpen={detail !== null} onClose={closeDetail} title={detail ? `${detail.orderNumber} — ${detail.customerName}` : ""} size="2xl">
        {detail && (
          <div className="space-y-5">
            {impactLoading && <p className="text-sm text-slate-400">Loading impact…</p>}
            {impactError && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{impactError}</p>}

            {impact && (
              <>
                {/* Warnings */}
                {impact.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {impact.warnings.map((w, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                          w.level === "block"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : w.level === "warn"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                        {w.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Header facts */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-400">Event Date</p>
                    <p className="font-medium text-brand-900">{detail.eventDate || "—"} {detail.eventTime || ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Branch</p>
                    <p className="font-medium text-brand-900">{branchName(detail.branch) ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Order Status</p>
                    <p className="font-medium text-brand-900">{detail.orderStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Payment Status</p>
                    <p className="font-medium text-brand-900">{detail.orderPaymentStatus}</p>
                  </div>
                </div>

                {/* Requested changes */}
                {impact.fields.filter((f) => f.changed).length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Requested Changes</p>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-left text-sm">
                        <tbody>
                          {impact.fields.filter((f) => f.changed).map((f) => (
                            <tr key={f.key} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-slate-600">{f.label}</td>
                              <td className="px-3 py-2 text-slate-500">
                                {f.kind === "dishes" || f.kind === "categories" ? "changed" : String(f.before ?? "—")}
                              </td>
                              <td className="px-3 py-2 font-medium text-brand-900">
                                {f.kind === "dishes" || f.kind === "categories" ? "see below" : String(f.after ?? "—")}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {f.delta !== null && (f.kind === "money" ? formatPeso(f.delta) : `${f.delta > 0 ? "+" : ""}${f.delta}`)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Menu changes */}
                {(impact.dishes.tray.some((d) => d.kind !== "same") || impact.dishes.packed.some((d) => d.kind !== "same") || impact.dishes.categories.length > 0) && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Menu Changes</p>
                    <ul className="space-y-1 rounded-lg border border-gray-200 p-3 text-sm">
                      {[...impact.dishes.tray, ...impact.dishes.packed].filter((d) => d.kind !== "same").map((d) => (
                        <li key={d.lineKey} className={d.kind === "added" ? "text-emerald-600" : d.kind === "removed" ? "text-red-600" : "text-amber-600"}>
                          {d.kind === "added" && `+ ${d.dishId} × ${d.afterQty}`}
                          {d.kind === "removed" && `− ${d.dishId}`}
                          {d.kind === "changed" && `${d.dishId}: ${d.beforeQty} → ${d.afterQty}`}
                        </li>
                      ))}
                      {impact.dishes.categories.map((c) => (
                        <li key={c.category} className="text-brand-900">
                          {c.category}: {c.before ?? "—"} → {c.after ?? "—"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Staff impact */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Staff Impact</p>
                  <div className="rounded-lg border border-gray-200 p-3 text-sm">
                    <p className="font-medium text-brand-900">
                      Servers {impact.staff.before ?? "—"} → {impact.staff.after ?? "—"}
                      {impact.staff.delta ? ` (${impact.staff.delta > 0 ? "+" : ""}${impact.staff.delta})` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">No staff roster or availability data exists in this system — confirm staffing manually before approving.</p>
                  </div>
                </div>

                {/* Kitchen capacity impact */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Kitchen Capacity Impact</p>
                  {!impact.capacity.known ? (
                    <p className="rounded-lg border border-gray-200 p-3 text-sm text-slate-400">No event date set — capacity impact unknown.</p>
                  ) : (
                    <div className="rounded-lg border border-gray-200 p-3 text-sm">
                      <p className="font-medium text-brand-900">
                        {impact.capacity.statusBefore} → {impact.capacity.statusAfter}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        PAX on {impact.capacity.date} ({branchName(impact.capacity.branch) ?? "—"}): {impact.capacity.totalPaxBefore}/{impact.capacity.maxPax || "—"} → {impact.capacity.totalPaxAfter}/{impact.capacity.maxPax || "—"} ({Math.round(impact.capacity.paxUtilAfter)}%)
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Events: {impact.capacity.eventCount}/{impact.capacity.maxEvents || "—"} (unchanged)</p>
                    </div>
                  )}
                </div>

                {/* Inventory impact */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Inventory Impact</p>
                  {impact.inventory.rows.length === 0 ? (
                    <p className="rounded-lg border border-gray-200 p-3 text-sm text-slate-400">No ingredient requirements are affected by this change.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-slate-500">
                            <th className="px-3 py-2 font-semibold">Ingredient</th>
                            <th className="px-3 py-2 font-semibold">Required</th>
                            <th className="px-3 py-2 font-semibold">Available</th>
                            <th className="px-3 py-2 font-semibold">Shortage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {impact.inventory.rows.map((r) => (
                            <tr key={r.ingredientId} className="border-b border-gray-100 last:border-0">
                              <td className="px-3 py-2 font-medium text-brand-900">
                                {r.ingredientName}
                                {r.isNewShortage && <span className="ml-1.5 text-xs font-semibold text-red-600">NEW</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {r.requiredBefore.toFixed(1)} → {r.requiredAfter.toFixed(1)} {r.baseUnit}
                              </td>
                              <td className="px-3 py-2 text-slate-600">{r.availableToThisOrder.toFixed(1)} {r.baseUnit}</td>
                              <td className={`px-3 py-2 font-medium ${r.shortageAfter > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                {r.shortageBefore.toFixed(1)} → {r.shortageAfter.toFixed(1)} {r.baseUnit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {impact.inventory.unmappedAfter.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      {impact.inventory.unmappedAfter.length} dish(es) have no linked recipe — ingredient impact above is understated.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">Grazing/fixed-menu items and stock figures are summed across all branches.</p>
                </div>

                {/* Financial impact */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Financial Impact</p>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">Original Total</p>
                      <p className="font-medium text-brand-900">{formatPeso(impact.financial.originalTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Requested Total</p>
                      <p className="font-medium text-brand-900">{formatPeso(impact.financial.requestedTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Difference</p>
                      <p className={`font-semibold ${impact.financial.priceDifference >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {impact.financial.priceDifference > 0 ? "+" : ""}
                        {formatPeso(impact.financial.priceDifference)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Balance Due (after)</p>
                      <p className="font-medium text-brand-900">{formatPeso(impact.financial.balanceDueAfter)}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <p className="text-xs text-slate-400">Estimated Food Cost</p>
                      <p className="font-medium text-brand-900">
                        {formatPeso(impact.financial.foodCostBefore)} → {formatPeso(impact.financial.foodCostAfter)}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                      <p className="text-xs text-slate-400">Payment Status (projected)</p>
                      <p className="font-medium text-brand-900">
                        {impact.financial.paymentStatusNow} → {impact.financial.paymentStatusProjected}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Priced by the Meal Builder — this dashboard does not reprice. Food cost and margin are estimated from the recipe book.
                  </p>
                </div>

                {/* Footer actions */}
                {canApprove && detail.status === "pending" && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    {rejecting && (
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-500">
                          Reason for rejection
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={2}
                            placeholder="e.g. Additional 30 pax cannot be accommodated because the kitchen is already at capacity."
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        </label>
                      </div>
                    )}

                    {impact.financial.hasDrift && (
                      <label className="flex items-center gap-2 text-xs text-amber-700">
                        <input type="checkbox" checked={forceAcknowledged} onChange={(e) => setForceAcknowledged(e.target.checked)} />
                        I have reviewed the price drift and want to approve anyway.
                      </label>
                    )}

                    <div className="flex justify-end gap-2">
                      {!rejecting ? (
                        <button
                          type="button"
                          onClick={() => setRejecting(true)}
                          disabled={actionLoading}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject Change
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Confirm Rejection
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleApprove(impact.financial.hasDrift)}
                        disabled={
                          actionLoading ||
                          impact.warnings.some((w) => w.level === "block") ||
                          (impact.financial.hasDrift && !forceAcknowledged)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} />
                        {impact.financial.hasDrift ? "Approve anyway" : "Approve Change"}
                      </button>
                    </div>
                  </div>
                )}

                {detail.status !== "pending" && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-slate-600">
                    <Badge label={STATUS_LABEL[detail.status]} tone={STATUS_TONE[detail.status]} /> by {detail.reviewerName || "—"}
                    {detail.reviewedAt && ` on ${new Date(detail.reviewedAt).toLocaleString("en-PH")}`}
                    {detail.rejectionReason && <p className="mt-1 text-xs text-slate-500">{detail.rejectionReason}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={proposeOpen} onClose={closePropose} title="Propose Menu Change" size="lg">
        <div className="space-y-4">
          {!menuOptions ? (
            <>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={orderQuery}
                  onChange={(e) => runOrderSearch(e.target.value)}
                  placeholder="Search order # or customer..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
                {orderSearchLoading && <p className="p-3 text-sm text-slate-400">Searching…</p>}
                {!orderSearchLoading && orderOptions.length === 0 && (
                  <p className="p-3 text-sm text-slate-400">
                    {orderQuery.trim() ? "No matching open orders." : "Type to search open orders."}
                  </p>
                )}
                {orderOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectOrderForPropose(o.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium text-brand-900">{o.orderNumber}</span>{" "}
                      <span className="text-slate-500">— {o.customerName}</span>
                    </span>
                    <span className="text-xs text-slate-400">{o.eventDate || "—"}</span>
                  </button>
                ))}
              </div>
              {proposeError && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{proposeError}</p>}
            </>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 p-3 text-sm">
                <p className="font-medium text-brand-900">
                  {menuOptions.orderNumber} — {menuOptions.customerName}
                </p>
                <button type="button" onClick={() => setMenuOptions(null)} className="mt-1 text-xs font-medium text-brand-600 hover:underline">
                  Change order
                </button>
              </div>

              {menuLoading ? (
                <p className="text-sm text-slate-400">Loading menu…</p>
              ) : Object.keys(menuOptions.selectedDishes).length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
                  This order has no category-based dish selections to swap.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-slate-500">
                      Category
                      <select
                        value={menuCategory}
                        onChange={(e) => {
                          const category = e.target.value as CateringDishCategory;
                          setMenuCategory(category);
                          setMenuDish(menuOptions.selectedDishes[category] ?? "");
                        }}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {Object.keys(menuOptions.selectedDishes).map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs text-slate-500">
                      New dish
                      <select
                        value={menuDish}
                        onChange={(e) => setMenuDish(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {(CATERING_DISH_CATALOG[
                          (cateringCategoryOf(menuOptions.selectedDishes[menuCategory] ?? "") ?? (menuCategory as CateringDishCategory)) as CateringDishCategory
                        ] ?? CATERING_DISH_CATEGORIES.flatMap((c) => CATERING_DISH_CATALOG[c])).map((dish) => (
                          <option key={dish} value={dish}>
                            {dish}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-slate-600">
                    {menuCategory}: <span className="font-medium text-brand-900">{menuOptions.selectedDishes[menuCategory]}</span>{" "}
                    <span className="text-slate-400">→</span> <span className="font-medium text-brand-900">{menuDish}</span>
                  </p>

                  <label className="block text-xs text-slate-500">
                    Notes (optional)
                    <textarea
                      value={proposeNotes}
                      onChange={(e) => setProposeNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Customer called in asking for a dessert swap."
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </label>

                  {proposeError && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{proposeError}</p>}

                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={closePropose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitPropose}
                      disabled={proposeLoading || !menuDish || menuDish === menuOptions.selectedDishes[menuCategory]}
                      className="rounded-lg bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {proposeLoading ? "Submitting…" : "Submit Change Request"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
