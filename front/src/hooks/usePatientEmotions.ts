"use client";

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';
import type { ConversationSession, EmotionsQuery } from '../types/conversation';

export function usePatientEmotions(patientId: string, initial: EmotionsQuery = {}) {
  const [query, setQuery] = useState<EmotionsQuery>({ order: 'desc', ...initial });
  const [data, setData] = useState<ConversationSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<unknown>(
          '/sessions/',
          {
            patient_id: patientId,
            from: query.from,
            to: query.to,
            order: query.order ?? 'desc',
          },
        );
        let arr: ConversationSession[] = [];
        if (Array.isArray(res)) {
          arr = res as ConversationSession[];
        } else if (res && typeof res === 'object' && Array.isArray((res as any).results)) {
          arr = (res as any).results as ConversationSession[];
        }
        if (!cancelled) setData(arr);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to fetch');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (patientId) run();
    return () => {
      cancelled = true;
    };
  }, [patientId, query.from, query.to, query.order]);

  const range = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { min: null as number | null, max: null as number | null };
    if (!Array.isArray(data)) return { min: null as number | null, max: null as number | null };
    const times = data.map((d) => new Date(d.started_at).getTime());
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [data]);

  return {
    data,
    loading,
    error,
    query,
    setQuery,
    range,
  } as const;
}
