"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  Printer,
  RotateCcw,
  Save as SaveIcon,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import { getBranchById } from "@/lib/mt/branches";
import { saveRoomLayoutAction } from "@/app/dashboard/room-diagram/actions";
import {
  isTableKind,
  specFor,
  STRUCT_SPECS,
  TABLE_SPECS,
  type RoomElement,
  type RoomElementKind,
  type RoomLayout,
  type StructKind,
  type TableKind,
} from "@/lib/rooms/types";

const TABLE_KINDS = Object.keys(TABLE_SPECS) as TableKind[];
const STRUCT_KINDS = Object.keys(STRUCT_SPECS) as StructKind[];

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

function newId(): string {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function branchCode(branch: string): string {
  return branch.slice(0, 3).toUpperCase();
}

type WorkingLayout = { elements: RoomElement[]; canvasWidth: number; canvasHeight: number };

/** Evenly-spaced chair dots for the "Chairs" overlay toggle. */
function chairOffsets(kind: RoomElementKind): { dx: number; dy: number }[] {
  const spec = specFor(kind);
  if (spec.seats === 0) return [];

  if (spec.shape === "round") {
    const radius = spec.width / 2 + 10;
    return Array.from({ length: spec.seats }, (_, i) => {
      const angle = (i / spec.seats) * Math.PI * 2 - Math.PI / 2;
      return { dx: spec.width / 2 + radius * Math.cos(angle), dy: spec.height / 2 + radius * Math.sin(angle) };
    });
  }

  // Rectangular tables: split seats along the two long edges.
  const perSide = Math.ceil(spec.seats / 2);
  const offsets: { dx: number; dy: number }[] = [];
  for (let side = 0; side < 2 && offsets.length < spec.seats; side++) {
    const count = Math.min(perSide, spec.seats - offsets.length);
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      offsets.push({ dx: t * spec.width, dy: side === 0 ? -10 : spec.height + 10 });
    }
  }
  return offsets;
}

function ElementPreview({ kind, size = 22 }: { kind: RoomElementKind; size?: number }) {
  const spec = specFor(kind);
  if (spec.shape === "line") {
    const horizontal = spec.width >= spec.height;
    return (
      <span
        className="inline-block bg-slate-600"
        style={horizontal ? { width: size, height: 3 } : { width: 3, height: size }}
      />
    );
  }
  if (spec.shape === "diagonal") {
    return <span className="inline-block bg-slate-600" style={{ width: size, height: 3, transform: "rotate(45deg)" }} />;
  }
  if (kind === "door") return <span className="inline-block rounded-sm bg-amber-500" style={{ width: size, height: 6 }} />;
  if (kind === "window") return <span className="inline-block rounded-sm bg-sky-400" style={{ width: size, height: 6 }} />;

  return (
    <span
      className={`inline-block border-2 border-brand-400 ${spec.shape === "round" ? "rounded-full" : "rounded-sm"}`}
      style={{ width: size, height: spec.shape === "round" ? size : size * 0.6 }}
    />
  );
}

export default function RoomDiagramEditor({ layouts }: { layouts: RoomLayout[] }) {
  const [layoutsData, setLayoutsData] = useState(layouts);
  const [activeId, setActiveId] = useState(layouts[0]?.id ?? "");
  const active = layoutsData.find((l) => l.id === activeId) ?? layoutsData[0];

  const [elements, setElements] = useState<RoomElement[]>(active?.elements ?? []);
  const [canvasWidth, setCanvasWidth] = useState(active?.canvasWidth ?? 820);
  const [canvasHeight, setCanvasHeight] = useState(active?.canvasHeight ?? 560);
  const [widthInput, setWidthInput] = useState(String(active?.canvasWidth ?? 820));
  const [heightInput, setHeightInput] = useState(String(active?.canvasHeight ?? 560));

  const [history, setHistory] = useState<RoomElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [showChairs, setShowChairs] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { type: "pan"; startX: number; startY: number; startPanX: number; startPanY: number }
    | { type: "element"; id: string; startX: number; startY: number; elX: number; elY: number }
    | null
  >(null);

  // Everything below reads/writes the "current" values from stable window
  // listeners (keydown, pointermove) — a ref mirror avoids stale closures
  // without re-subscribing listeners on every keystroke/drag frame.
  const stateRef = useRef({ elements, canvasWidth, canvasHeight, history, selectedId, pan, zoom });
  useEffect(() => {
    stateRef.current = { elements, canvasWidth, canvasHeight, history, selectedId, pan, zoom };
  });

  // Switching halls loads that hall's in-memory working copy (saved edits
  // from earlier in this session persist; anything unsaved on the hall you're
  // leaving is discarded — no confirmation prompt in v1).
  useEffect(() => {
    const l = layoutsData.find((x) => x.id === activeId);
    if (!l) return;
    setElements(l.elements);
    setCanvasWidth(l.canvasWidth);
    setCanvasHeight(l.canvasHeight);
    setWidthInput(String(l.canvasWidth));
    setHeightInput(String(l.canvasHeight));
    setHistory([]);
    setSelectedId(null);
    setZoom(1);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Center the room in the viewport whenever its size changes.
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    setPan({
      x: Math.max(20, (rect.width - canvasWidth) / 2),
      y: Math.max(20, (rect.height - canvasHeight) / 2),
    });
  }, [activeId, canvasWidth, canvasHeight]);

  const baseline = layoutsData.find((l) => l.id === activeId);
  const dirty =
    !!baseline &&
    (JSON.stringify(elements) !== JSON.stringify(baseline.elements) ||
      canvasWidth !== baseline.canvasWidth ||
      canvasHeight !== baseline.canvasHeight);

  function pushHistory() {
    setHistory((h) => [...h, stateRef.current.elements]);
  }

  function addElement(kind: RoomElementKind) {
    const vp = viewportRef.current;
    const { pan: p, zoom: z } = stateRef.current;
    const rect = vp?.getBoundingClientRect();
    const spec = specFor(kind);
    const centerX = rect ? (rect.width / 2 - p.x) / z : 100;
    const centerY = rect ? (rect.height / 2 - p.y) / z : 100;

    pushHistory();
    const el: RoomElement = { id: newId(), kind, x: centerX - spec.width / 2, y: centerY - spec.height / 2 };
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  }

  function deleteSelected() {
    const { selectedId: sel } = stateRef.current;
    if (!sel) return;
    pushHistory();
    setElements((els) => els.filter((e) => e.id !== sel));
    setSelectedId(null);
  }

  function duplicateSelected() {
    const { selectedId: sel, elements: els } = stateRef.current;
    const source = els.find((e) => e.id === sel);
    if (!source) return;
    pushHistory();
    const copy: RoomElement = { ...source, id: newId(), x: source.x + 20, y: source.y + 20 };
    setElements((cur) => [...cur, copy]);
    setSelectedId(copy.id);
  }

  function undo() {
    const { history: h } = stateRef.current;
    if (h.length === 0) return;
    const prev = h[h.length - 1];
    setHistory((cur) => cur.slice(0, -1));
    setElements(prev);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await saveRoomLayoutAction(activeId, { elements, canvasWidth, canvasHeight });
      setLayoutsData((cur) => cur.map((l) => (l.id === activeId ? { ...l, elements, canvasWidth, canvasHeight } : l)));
      setSavedAt(Date.now());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    requestAnimationFrame(() => window.print());
  }

  // Keyboard shortcuts: Delete/Backspace, Ctrl/Cmd+Z, Ctrl/Cmd+D, Ctrl/Cmd+S.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (stateRef.current.selectedId) {
          e.preventDefault();
          deleteSelected();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function onViewportPointerDown(e: React.PointerEvent) {
    if (e.target !== e.currentTarget) return; // background only — elements handle their own pointerdown
    setSelectedId(null);
    dragRef.current = { type: "pan", startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onElementPointerDown(e: React.PointerEvent, el: RoomElement) {
    e.stopPropagation();
    setSelectedId(el.id);
    pushHistory();
    dragRef.current = { type: "element", id: el.id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const { zoom: z } = stateRef.current;
    if (drag.type === "pan") {
      setPan({ x: drag.startPanX + (e.clientX - drag.startX), y: drag.startPanY + (e.clientY - drag.startY) });
    } else {
      const dx = (e.clientX - drag.startX) / z;
      const dy = (e.clientY - drag.startY) / z;
      setElements((els) => els.map((el) => (el.id === drag.id ? { ...el, x: drag.elX + dx, y: drag.elY + dy } : el)));
    }
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { pan: p, zoom: z } = stateRef.current;
    const wx = (mx - p.x) / z;
    const wy = (my - p.y) / z;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (e.deltaY < 0 ? 1.1 : 0.9)));
    setZoom(nextZoom);
    setPan({ x: mx - wx * nextZoom, y: my - wy * nextZoom });
  }

  function zoomBy(factor: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function resetView() {
    setZoom(1);
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    setPan({ x: Math.max(20, (rect.width - canvasWidth) / 2), y: Math.max(20, (rect.height - canvasHeight) / 2) });
  }

  function applySize() {
    const w = Math.max(200, Math.min(3000, parseInt(widthInput, 10) || canvasWidth));
    const h = Math.max(200, Math.min(3000, parseInt(heightInput, 10) || canvasHeight));
    setCanvasWidth(w);
    setCanvasHeight(h);
  }

  const tablesPlaced = elements.filter((e) => isTableKind(e.kind)).length;
  const structElements = elements.length - tablesPlaced;
  const totalSeats = useMemo(
    () => elements.reduce((sum, e) => sum + specFor(e.kind).seats, 0),
    [elements],
  );
  const capacity = active?.capacity ?? 0;
  const utilizationPct = capacity > 0 ? Math.round((totalSeats / capacity) * 100) : 0;

  if (!active) {
    return (
      <div>
        <PageHeader title="Room Diagram" subtitle="Design your event floor plan." />
        <p className="text-sm text-gray-500">
          No halls found. Run supabase/room_layouts.sql in the Supabase SQL editor to seed the branch halls.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Room Diagram"
          subtitle="Design your event floor plan — drag to position, scroll to zoom, drag background to pan."
        />
      </div>

      {/* Hall tabs */}
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {layoutsData.map((l) => {
          const branchInfo = getBranchById(l.branch);
          const isActive = l.id === activeId;
          return (
            <button
              key={l.id}
              onClick={() => setActiveId(l.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-brand-900 bg-brand-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? "bg-white/15 text-white" : branchInfo?.badge ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {branchCode(l.branch)}
              </span>
              {l.hallName}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 print:hidden">
        <div className="flex items-center gap-1">
          <button onClick={resetView} title="Reset view" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => zoomBy(0.9)} title="Zoom out" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <ZoomOut size={16} />
          </button>
          <span className="w-12 text-center text-xs font-medium text-gray-600">{Math.round(zoom * 100)}%</span>
          <button onClick={() => zoomBy(1.1)} title="Zoom in" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          {!saveError && savedAt && !dirty && <span className="text-xs text-emerald-600">Saved</span>}
          <button
            onClick={() => setShowChairs((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
              showChairs ? "border-gold-500 bg-gold-500/10 text-gold-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Armchair size={14} /> Chairs
          </button>
          <button
            onClick={() => setClearOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Trash2 size={14} /> Clear
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold-600 disabled:opacity-40"
          >
            <SaveIcon size={14} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Palette */}
        <div className="w-full flex-shrink-0 rounded-lg border border-gray-200 bg-white p-4 print:hidden lg:w-48">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Tables</p>
          <div className="mb-4 flex flex-col gap-1">
            {TABLE_KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => addElement(kind)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                <ElementPreview kind={kind} /> {TABLE_SPECS[kind].label}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Room</p>
          <div className="mb-4 flex flex-col gap-1">
            {STRUCT_KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => addElement(kind)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
              >
                <ElementPreview kind={kind} /> {STRUCT_SPECS[kind].label}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 text-xs text-gray-500">
            <div className="flex justify-between py-0.5">
              <span>Tables</span>
              <span className="font-semibold text-brand-900">{tablesPlaced}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span>Seats</span>
              <span className="font-semibold text-brand-900">{totalSeats}</span>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">{Math.max(0, capacity - totalSeats)} remaining</p>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={viewportRef}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
          className="relative h-[70vh] min-h-[420px] flex-1 touch-none overflow-hidden rounded-lg border border-gray-200 bg-[radial-gradient(circle,theme(colors.gray.300)_1px,transparent_1px)] bg-[length:16px_16px] print:h-auto print:overflow-visible print:border-0"
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: canvasWidth,
              height: canvasHeight,
            }}
            className="absolute rounded-md border border-gray-300 bg-white shadow-sm"
          >
            {elements.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-lg">
                  +
                </span>
                <p className="text-sm">Click a table type to add it</p>
              </div>
            )}

            {elements.map((el) => {
              const spec = specFor(el.kind);
              const selected = el.id === selectedId;
              const isStruct = !isTableKind(el.kind);
              return (
                <div key={el.id} style={{ left: el.x, top: el.y }} className="absolute">
                  <div
                    onPointerDown={(e) => onElementPointerDown(e, el)}
                    style={{
                      width: spec.width,
                      height: spec.height,
                      transform: el.kind === "wall-s" ? "rotate(45deg)" : undefined,
                    }}
                    className={`flex cursor-move items-center justify-center text-center text-[10px] font-semibold ${
                      spec.shape === "round" ? "rounded-full" : "rounded-sm"
                    } ${selected ? "ring-2 ring-gold-500 ring-offset-1" : ""} ${
                      isStruct
                        ? el.kind === "door"
                          ? "bg-amber-500"
                          : el.kind === "window"
                            ? "bg-sky-400"
                            : "bg-slate-600"
                        : "border-2 border-brand-400 bg-brand-50 text-brand-800"
                    }`}
                  >
                    {!isStruct && spec.label}
                  </div>

                  {showChairs &&
                    chairOffsets(el.kind).map((c, i) => (
                      <span
                        key={i}
                        style={{ left: c.dx - 4, top: c.dy - 4 }}
                        className="absolute h-2 w-2 rounded-full bg-gray-400"
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Room info */}
        <div className="w-full flex-shrink-0 rounded-lg border border-gray-200 bg-white p-4 print:hidden lg:w-64">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Room Info</p>
          <dl className="mb-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500">Room</dt>
              <dd className="font-medium text-brand-900">{active.hallName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Branch</dt>
              <dd className="font-medium text-brand-900">{getBranchById(active.branch)?.name ?? active.branch}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Max capacity</dt>
              <dd className="font-medium text-brand-900">{capacity} pax</dd>
            </div>
          </dl>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Canvas Size</p>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-gray-500">
              Width (px)
              <input
                type="number"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs"
              />
            </label>
            <label className="text-[11px] text-gray-500">
              Height (px)
              <input
                type="number"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs"
              />
            </label>
          </div>
          <button
            onClick={applySize}
            className="mb-4 w-full rounded-lg bg-brand-900 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
          >
            Apply Size
          </button>

          <div className="mb-4 space-y-1.5 border-t border-gray-100 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Tables placed</span>
              <span className="font-semibold text-brand-900">{tablesPlaced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Struct. elements</span>
              <span className="font-semibold text-brand-900">{structElements}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total seats</span>
              <span className="font-semibold text-brand-900">
                {totalSeats} / {capacity} <span className="text-gray-400">({utilizationPct}%)</span>
              </span>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Shortcuts</p>
          <ul className="space-y-1 text-[11px] text-gray-500">
            <li className="flex justify-between"><span>Pan</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">Drag bg</kbd></li>
            <li className="flex justify-between"><span>Zoom</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">Scroll</kbd></li>
            <li className="flex justify-between"><span>Reset zoom</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">↺</kbd></li>
            <li className="flex justify-between"><span>Delete</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">Del</kbd></li>
            <li className="flex justify-between"><span>Undo</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">Ctrl+Z</kbd></li>
            <li className="flex justify-between"><span>Save</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">Ctrl+S</kbd></li>
            <li className="flex justify-between"><span>Duplicate</span><kbd className="rounded bg-gray-100 px-1.5 py-0.5">Ctrl+D</kbd></li>
          </ul>
        </div>
      </div>

      <Modal isOpen={clearOpen} onClose={() => setClearOpen(false)} title="Clear floor plan?" size="sm">
        <p className="mb-4 text-sm text-gray-600">
          This removes every table and structural element from {active.hallName}. This can&apos;t be undone once saved.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setClearOpen(false)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              pushHistory();
              setElements([]);
              setSelectedId(null);
              setClearOpen(false);
            }}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </Modal>
    </div>
  );
}
