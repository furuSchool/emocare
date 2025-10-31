import type { ConversationSession } from '../types/conversation';

interface EmotionSummaryProps {
  sessions: ConversationSession[];
  title?: string;
}

export default function EmotionSummary({ sessions, title = '感情サマリー' }: EmotionSummaryProps) {
  const counts = new Map<string, { nameJa: string; key: string; count: number }>();
  for (const s of sessions) {
    const key = (s.emotion_key || 'unknown').toLowerCase();
    const entry = counts.get(key) || { nameJa: s.emotion_name || '不明', key, count: 0 };
    entry.count += 1;
    // 保守的に日本語名を更新（あれば）
    if (s.emotion_name) entry.nameJa = s.emotion_name;
    counts.set(key, entry);
  }
  const total = sessions.length || 1;
  const rows = Array.from(counts.values()).sort((a, b) => b.count - a.count);
  const top = rows[0];

  return (
    <div className="w-full flex flex-col gap-3 text-white">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold text-base">{title}</h2>
        {top ? (
          <div className="text-sm">
            最多: <span className="font-semibold underline decoration-white/40 underline-offset-2">{top.nameJa}</span> ({Math.round((top.count / total) * 100)}%)
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const pct = r.count / total;
          return (
            <div key={r.key} className="flex items-center gap-3">
              <div className="w-24 text-sm truncate">{r.nameJa}</div>
              <div className="flex-1 h-3 bg-white/15 rounded">
                <div className="h-3 rounded bg-white" style={{ width: `${Math.max(6, pct * 100)}%` }} />
              </div>
              <div className="w-14 text-right text-xs">{r.count}件</div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="text-sm">データがありません</div>
        )}
      </div>
    </div>
  );
}
