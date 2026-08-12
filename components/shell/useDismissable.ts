"use client";

import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * Closes a popover on outside click or Escape. Returns the ref to hang on the
 * popover's outermost element.
 */
export function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return ref;
}
