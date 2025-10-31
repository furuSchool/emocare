import type { ConversationSession } from '../types/conversation';

interface StatusChipsProps {
  sessions: ConversationSession[];
}

export default function StatusChips({ sessions }: StatusChipsProps) {
  const counts = new Map<string, { ja: string; key: string; count: number }>();
  for (const s of sessions) {
    const key = (s.emotion_key || 'unknown').toLowerCase();
    const ja = s.emotion_name || '不明';
    counts.set(key, { ja, key, count: (counts.get(key)?.count || 0) + 1 });
  }
  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  if (sorted.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((e, idx) => (
        <span
          key={e.key}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border border-white/25 ${
            idx === 0 ? 'bg-white/15' : 'bg-white/5'
          }`}
          aria-label={`${e.ja} ${e.count}件`}
        >
          <span className="font-semibold">{e.ja}</span>
          <span className="text-white/80">{e.count}件</span>
        </span>
      ))}
    </div>
  );
}

