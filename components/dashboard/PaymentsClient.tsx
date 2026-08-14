"use client";

import { useMemo, useState } from "react";
import { CreditCard, Hourglass, XCircle } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Modal from "@/components/ui/Modal";
import Badge, { BadgeTone, BranchBadge } from "@/components/ui/Badge";
import DataTable, { Column } from "@/components/ui/DataTable";
import { formatPeso } from "@/lib/format";
import { getBranchById } from "@/lib/mt/branches";
import { verifyPaymentAction, rejectPaymentAction, getProofUrlAction, getPaymentsForOrderAction } from "@/app/dashboard/payments/actions";
import { balanceDue, type PaymentQueueRow, type PaymentRecord, type PaymentStatus } from "@/lib/payments/types";

type TabKey = "payments" | "pending" | "lost";

const STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  "Pending Upload": "slate",
  Submitted: "amber",
  Verified: "green",
  Rejected: "red",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  "Pending Upload": "Pending Upload",
  Submitted: "Awaiting Verification",
  Verified: "Verified",
  Rejected: "Rejected",
};

function branchName(id: string | null): string | undefined {
  return id ? (getBranchById(id)?.name ?? id) : undefined;
}

export default function PaymentsClient({ payments }: { payments: PaymentQueueRow[] }) {
  const [rows, setRows] = useState(payments);
  const [tab, setTab] = useState<TabKey>("payments");

  const [detail, setDetail] = useState<PaymentQueueRow | null>(null);
  const [history, setHistory] = useState<PaymentRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [proofUrls, setProofUrls] = useState<Record<string, string | null>>({});
  const [proofLoading, setProofLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingReview = useMemo(() => rows.filter((p) => p.status === "Submitted"), [rows]);
  const lostCancelled = useMemo(() => rows.filter((p) => p.status === "Rejected"), [rows]);

  const visibleRows = tab === "payments" ? rows : tab === "pending" ? pendingReview : lostCancelled;

  const columns: Column<PaymentQueueRow>[] = [
    {
      key: "customerName",
      header: "Customer",
      render: (r) => (
        <button type="button" onClick={() => openDetail(r)} className="font-medium text-brand-900 hover:underline">
          {r.customerName}
        </button>
      ),
    },
    { key: "branch", header: "Branch", render: (r) => <BranchBadge branch={branchName(r.branch)} /> },
    { key: "amount", header: "Amount", render: (r) => formatPeso(r.amount) },
    { key: "orderAmountPaid", header: "Paid", render: (r) => formatPeso(r.orderAmountPaid) },
    { key: "status", header: "Payment", render: (r) => <Badge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} /> },
    { key: "eventDate", header: "Event Date", render: (r) => r.eventDate || "—" },
    { key: "referenceNumber", header: "Ref", render: (r) => <span className="font-mono text-xs">{r.referenceNumber || "—"}</span> },
  ];

  async function openDetail(row: PaymentQueueRow) {
    setDetail(row);
    setHistory(null);
    setHistoryLoading(true);
    try {
      const list = await getPaymentsForOrderAction(row.orderId);
      setHistory(list);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setHistory(null);
  }

  async function viewProof(paymentId: string, proofPath: string) {
    if (proofUrls[paymentId] !== undefined) return;
    setProofLoading(paymentId);
    try {
      const url = await getProofUrlAction(proofPath);
      setProofUrls((prev) => ({ ...prev, [paymentId]: url }));
    } finally {
      setProofLoading(null);
    }
  }

  function applyStatus(paymentId: string, status: PaymentStatus) {
    setRows((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status } : p)));
    setHistory((prev) => (prev ? prev.map((p) => (p.id === paymentId ? { ...p, status } : p)) : prev));
  }

  async function handleVerify(paymentId: string) {
    setActionLoading(paymentId);
    try {
      await verifyPaymentAction(paymentId);
      applyStatus(paymentId, "Verified");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to verify payment.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(paymentId: string) {
    if (typeof window !== "undefined" && !window.confirm("Reject this payment?")) return;
    setActionLoading(paymentId);
    try {
      await rejectPaymentAction(paymentId);
      applyStatus(paymentId, "Rejected");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject payment.");
    } finally {
      setActionLoading(null);
    }
  }

  const totalVerified = rows.filter((p) => p.status === "Verified").reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Verified Payments" value={formatPeso(totalVerified)} icon={<CreditCard size={18} className="text-gold-600" />} />
        <StatCard label="Pending Review" value={String(pendingReview.length)} icon={<Hourglass size={18} className="text-gold-600" />} />
        <StatCard label="Lost / Cancelled" value={String(lostCancelled.length)} icon={<XCircle size={18} className="text-gold-600" />} />
      </div>

      <div className="mt-6 flex flex-wrap gap-6 border-b border-gray-200">
        {([
          ["payments", `Payments (${rows.length})`],
          ["pending", `Pending Review (${pendingReview.length})`],
          ["lost", `Lost / Cancelled (${lostCancelled.length})`],
        ] as [TabKey, string][]).map(([key, label]) => (
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

      <div className="mt-4">
        {visibleRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            No payments here yet.
          </p>
        ) : (
          <DataTable columns={columns} rows={visibleRows} />
        )}
      </div>

      <Modal isOpen={detail !== null} onClose={closeDetail} title={detail ? `${detail.customerName} — ${detail.orderNumber}` : ""} size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400">Package</p>
                <p className="font-medium text-brand-900">{detail.packageName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Event Date</p>
                <p className="font-medium text-brand-900">{detail.eventDate || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total</p>
                <p className="font-medium text-brand-900">{formatPeso(detail.orderTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Balance Due</p>
                <p className="font-medium text-brand-900">{formatPeso(balanceDue({ total: detail.orderTotal, amountPaid: detail.orderAmountPaid }))}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Deposit</p>
                <p className="font-medium text-brand-900">{formatPeso(detail.orderDepositAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Amount Paid</p>
                <p className="font-medium text-brand-900">{formatPeso(detail.orderAmountPaid)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400">Order Payment Status</p>
                <Badge
                  label={detail.orderPaymentStatus}
                  tone={
                    detail.orderPaymentStatus === "Paid"
                      ? "green"
                      : detail.orderPaymentStatus === "Unpaid"
                        ? "slate"
                        : "amber"
                  }
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Payment History</p>
              {historyLoading && <p className="text-sm text-slate-400">Loading…</p>}
              {!historyLoading && history && history.length === 0 && (
                <p className="text-sm text-slate-400">No payments recorded yet.</p>
              )}
              <ul className="space-y-2">
                {(history ?? []).map((p) => (
                  <li key={p.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-brand-900">
                          {p.kind} · {p.method} · {formatPeso(p.amount)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(p.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                          {p.referenceNumber ? ` · Ref ${p.referenceNumber}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge label={STATUS_LABEL[p.status]} tone={STATUS_TONE[p.status]} />
                        {p.proofPath && (
                          <button
                            type="button"
                            onClick={() => viewProof(p.id, p.proofPath!)}
                            disabled={proofLoading === p.id}
                            className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
                          >
                            {proofUrls[p.id] !== undefined ? "" : proofLoading === p.id ? "Loading…" : "View Proof"}
                          </button>
                        )}
                      </div>
                    </div>

                    {proofUrls[p.id] && (
                      <a href={proofUrls[p.id]!} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        <img
                          src={proofUrls[p.id]!}
                          alt="Payment proof"
                          className="max-h-72 w-full rounded-lg border border-gray-200 object-contain"
                        />
                      </a>
                    )}
                    {proofUrls[p.id] === null && <p className="mt-2 text-xs text-red-500">Couldn&apos;t load the proof image.</p>}

                    {p.status === "Submitted" && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(p.id)}
                          disabled={actionLoading === p.id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerify(p.id)}
                          disabled={actionLoading === p.id}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Verify
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
