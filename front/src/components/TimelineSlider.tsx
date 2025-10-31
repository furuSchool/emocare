"use client";

import { useMemo } from 'react';

export interface TimelineSliderProps {
  min: number | null; // epoch ms
  max: number | null; // epoch ms
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function fmt(ts: number | null) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function TimelineSlider({ min, max, value, onChange, disabled }: TimelineSliderProps) {
  const clamped = useMemo(() => {
    if (min == null || max == null || value == null) return null;
    return Math.min(Math.max(value, min), max);
  }, [min, max, value]);

  if (min == null || max == null) {
    return (
      <div className="w-full text-sm text-white">データがありません</div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2 text-white">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium whitespace-nowrap">時間軸選択:</label>
        <div className="flex-1">
          <input
            type="range"
            min={min}
            max={max}
            value={clamped ?? min}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-500"
            disabled={disabled}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-white/70">
        <span title={fmt(min)}>開始: {new Date(min).toLocaleDateString()}</span>
        <span className="text-white font-medium" title={fmt(clamped)}>
          選択中: {fmt(clamped)}
        </span>
        <span title={fmt(max)}>最新: {new Date(max).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
