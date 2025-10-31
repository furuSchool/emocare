"use client";

import { useMemo, useState } from 'react';
import { PLUTCHIK_CORE, PLUTCHIK_INTENSITY, normalizeEmotionKey, keyToPrimary, shadeColor, getEmotionIntensity } from '../lib/plutchik';
import type { ConversationSession } from '../types/conversation';
import Tooltip from './Tooltip';

export interface PlutchikWheelProps {
  sessions: ConversationSession[]; // selected subset (latest few), assume desc
}

const SIZE = 340;
const CX = SIZE / 2;
const CY = SIZE / 2;
const INNER_R = 60; // inner radius of the core ring
const OUTER_R = 115; // outer radius of the core ring
const OUTER2_R = 150; // outer radius of the sub ring
const SUB_BANDS = 3; // weak/base/strong

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export default function PlutchikWheel({ sessions }: PlutchikWheelProps) {
  const latest = sessions[0];
  const currentKey = normalizeEmotionKey(latest?.emotion_key ?? undefined) || undefined;

  const wedges = useMemo(() => {
    const entries = Object.entries(PLUTCHIK_CORE);
    const span = 360 / entries.length;
    return entries.map(([key, info], i) => ({ key, info, start: i * span, end: (i + 1) * span }));
  }, []);

  // Tooltip state
  const [tip, setTip] = useState<{ open: boolean; x: number; y: number; content: React.ReactNode }>({
    open: false,
    x: 0,
    y: 0,
    content: null,
  });

  function handleMarkerEnter(e: React.MouseEvent | React.FocusEvent, s: ConversationSession) {
    const rect = (e.currentTarget as any).ownerSVGElement?.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : (rect?.left ?? 0) + (e.target as any).cx.baseVal.value;
    const clientY = 'clientY' in e ? e.clientY : (rect?.top ?? 0) + (e.target as any).cy.baseVal.value;
    const ptX = clientX - (rect?.left ?? 0);
    const ptY = clientY - (rect?.top ?? 0);
    setTip({
      open: true,
      x: ptX,
      y: ptY,
      content: (
        <div>
          <div className="font-medium mb-1">{s.emotion_name ?? '不明'}</div>
          <div className="text-gray-200">{new Date(s.started_at).toLocaleString()}</div>
          {s.emotion_reason ? <div className="mt-1 whitespace-pre-wrap">{s.emotion_reason}</div> : null}
        </div>
      ),
    });
  }

  function handleMarkerLeave() {
    setTip((t) => ({ ...t, open: false }));
  }

  // marker radius per recency (latest inner)
  const markers = useMemo(() => {
    const maxN = Math.max(1, sessions.length);
    return sessions.map((s, idx) => {
      const kRaw = normalizeEmotionKey(s.emotion_key);
      const primary = keyToPrimary(kRaw) || (wedges[0].key as any);
      const wedge = wedges.find((w) => w.key === primary) || wedges[0];
      const angle = (wedge.start + wedge.end) / 2;
      
      // Get intensity level to determine which ring to place the marker
      const intensity = getEmotionIntensity(kRaw) || 'base';
      
      // Calculate radius based on intensity level
      let targetR: number;
      if (intensity === 'weak') {
        // Inner ring (weak emotions)
        targetR = INNER_R + 8 + (OUTER_R - INNER_R) * 0.3;
      } else if (intensity === 'base') {
        // Middle ring (base emotions)
        targetR = INNER_R + (OUTER_R - INNER_R) * 0.5;
      } else {
        // Outer ring (strong emotions)
        targetR = OUTER_R + (OUTER2_R - OUTER_R) * 0.5;
      }
      
      // Apply emotion_score variation if available (±10% around target)
      const score = typeof s.emotion_score === 'number' ? Math.min(1, Math.max(0, s.emotion_score)) : 0.5;
      const variation = (score - 0.5) * 0.2; // -0.1 to +0.1
      const r = targetR * (1 + variation);
      
      const pos = polarToCartesian(CX, CY, r, angle);
      return { s, x: pos.x, y: pos.y, color: PLUTCHIK_CORE[wedge.key].color, intensity };
    });
  }, [sessions, wedges]);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <defs>
          <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.25" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Base ring background */}
        <circle cx={CX} cy={CY} r={OUTER2_R} fill="#f8fafc" stroke="#e2e8f0" />
        <circle cx={CX} cy={CY} r={INNER_R} fill="white" stroke="#e2e8f0" />

        {/* Wedges */}
        {wedges.map(({ key, info, start, end }) => {
          const active = currentKey === key;
          const d = arcPath(CX, CY, INNER_R, OUTER_R, start, end);
          return (
            <path
              key={key}
              d={d}
              fill={`url(#grad-${key})`}
              opacity={active ? 0.95 : 0.35}
              stroke={active ? '#111827' : 'white'}
              strokeWidth={active ? 2 : 1}
              style={{ transition: 'opacity 250ms ease, stroke-width 250ms ease' }}
            />
          );
        })}

        {/* simple radial gradients per wedge to add depth */}
        {wedges.map(({ key, info }) => (
          <radialGradient id={`grad-${key}`} key={`grad-${key}`} cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor={shadeColor(info.color, 0.25)} />
            <stop offset="100%" stopColor={info.color} />
          </radialGradient>
        ))}

        {/* Sub-emotion ring split into 3 radial bands per primary */}
        {wedges.map(({ key, info, start, end }) => {
          const intens = PLUTCHIK_INTENSITY[key as keyof typeof PLUTCHIK_INTENSITY];
          if (!intens) return null;
          const baseColor = info.color;
          const bands = [
            { level: 'weak', color: shadeColor(baseColor, 0.25) },
            { level: 'base', color: baseColor },
            { level: 'strong', color: shadeColor(baseColor, -0.15) },
          ] as const;
          return bands.map((b, i) => {
            const r1 = OUTER_R + 5 + (i * (OUTER2_R - OUTER_R - 10)) / SUB_BANDS;
            const r2 = OUTER_R + 5 + ((i + 1) * (OUTER2_R - OUTER_R - 10)) / SUB_BANDS;
            const d = arcPath(CX, CY, r1, r2, start, end);
            return (
              <path
                key={`${key}-${b.level}`}
                d={d}
                fill={b.color}
                opacity={0.45}
                stroke="white"
                strokeWidth={0.5}
                style={{ transition: 'opacity 250ms ease' }}
              />
            );
          });
        })}

        {/* Session markers with tooltips */}
        {markers.map(({ s, x, y, color, intensity }) => {
          const r = 4 + (typeof s.emotion_score === 'number' ? s.emotion_score * 6 : 2);
          const opacity = 0.7 + (typeof s.emotion_score === 'number' ? s.emotion_score * 0.3 : 0);
          return (
            <circle
              key={s.id}
              cx={x}
              cy={y}
              r={r}
              fill={color}
              opacity={opacity}
              stroke="#111827"
              strokeWidth={1}
              tabIndex={0}
              role="button"
              aria-label={`${s.emotion_name ?? '不明'}: ${new Date(s.started_at).toLocaleString()}`}
              onMouseEnter={(e) => handleMarkerEnter(e, s)}
              onMouseLeave={handleMarkerLeave}
              onFocus={(e) => handleMarkerEnter(e, s)}
              onBlur={handleMarkerLeave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMarkerEnter(e as any, s);
                }
              }}
              style={{ transition: 'r 200ms ease, opacity 200ms ease' }}
              filter="url(#dropShadow)"
            />
          );
        })}
      </svg>

      {/* Tooltip anchored within SVG box */}
      <Tooltip open={tip.open} x={tip.x} y={tip.y}>
        {tip.content}
      </Tooltip>
    </div>
  );
}
