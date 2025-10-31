import { useMemo } from 'react';
import type { ConversationSession } from '../types/conversation';

interface EmotionFilterProps {
  sessions: ConversationSession[];
  value: string | 'all';
  onChange: (v: string | 'all') => void;
}

export default function EmotionFilter({ sessions, value, onChange }: EmotionFilterProps) {
  const emotions = useMemo(() => {
    const set = new Map<string, string>();
    for (const s of sessions) {
      if (s.emotion_key) set.set(s.emotion_key, s.emotion_name || s.emotion_key);
    }
    return Array.from(set.entries()).map(([key, name]) => ({ key, name }));
  }, [sessions]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm">感情フィルタ</label>
      <select
        className="border rounded px-2 py-1 text-sm bg-zinc-900 border-zinc-600 text-white"
        value={value}
        onChange={(e) => onChange((e.target.value || 'all') as any)}
      >
        <option className="bg-zinc-900" value="all">すべて</option>
        {emotions.map((e) => (
          <option className="bg-zinc-900" key={e.key} value={e.key}>{e.name}</option>
        ))}
      </select>
    </div>
  );
}

