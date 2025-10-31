"use client";

import { useEffect, useRef } from 'react';

export interface TooltipProps {
  open: boolean;
  x: number;
  y: number;
  children: React.ReactNode;
}

export default function Tooltip({ open, x, y, children }: TooltipProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    // ensure within viewport of container
    const { offsetWidth, offsetHeight } = el;
    let left = x + 8;
    let top = y + 8;
    if (left + offsetWidth > 300) left = x - offsetWidth - 8;
    if (top + offsetHeight > 300) top = y - offsetHeight - 8;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [x, y, open]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute z-10 max-w-[220px] text-[11px] leading-snug bg-black/80 text-white px-2 py-1 rounded shadow"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

