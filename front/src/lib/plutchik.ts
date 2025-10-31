// Minimal Plutchik mapping scaffold.
// TODO: Expand to full 32/48/52-emotion mapping as needed.

export type PlutchikKey =
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation';

export interface PlutchikInfo {
  key: PlutchikKey | string; // extended keys allowed
  labelJa: string;
  color: string; // base color
  angleDeg?: number; // position for primary segments
}

export interface PlutchikIntensity {
  weak: { key: string; labelJa: string };
  base: { key: string; labelJa: string };
  strong: { key: string; labelJa: string };
}

// Primary 8 with angle positions and base colors
export const PLUTCHIK_CORE: Record<string, PlutchikInfo> = {
  joy: { key: 'joy', labelJa: '喜び', color: '#FFE066', angleDeg: 0 },
  trust: { key: 'trust', labelJa: '信頼', color: '#C7F464', angleDeg: 45 },
  fear: { key: 'fear', labelJa: '恐れ', color: '#88D8B0', angleDeg: 90 },
  surprise: { key: 'surprise', labelJa: '驚き', color: '#8EE3EF', angleDeg: 135 },
  sadness: { key: 'sadness', labelJa: '悲しみ', color: '#6C91BF', angleDeg: 180 },
  disgust: { key: 'disgust', labelJa: '嫌悪', color: '#9E7BB5', angleDeg: 225 },
  anger: { key: 'anger', labelJa: '怒り', color: '#FF6B6B', angleDeg: 270 },
  anticipation: { key: 'anticipation', labelJa: '期待', color: '#F4A259', angleDeg: 315 },
};

// Intensity mapping (classic Plutchik 24 emotions)
export const PLUTCHIK_INTENSITY: Record<PlutchikKey, PlutchikIntensity> = {
  joy: {
    weak: { key: 'serenity', labelJa: '平静' },
    base: { key: 'joy', labelJa: '喜び' },
    strong: { key: 'ecstasy', labelJa: '恍惚' },
  },
  trust: {
    weak: { key: 'acceptance', labelJa: '受容' },
    base: { key: 'trust', labelJa: '信頼' },
    strong: { key: 'admiration', labelJa: '賞賛' },
  },
  fear: {
    weak: { key: 'apprehension', labelJa: '不安' },
    base: { key: 'fear', labelJa: '恐れ' },
    strong: { key: 'terror', labelJa: '恐怖' },
  },
  surprise: {
    weak: { key: 'distraction', labelJa: '気晴らし' },
    base: { key: 'surprise', labelJa: '驚き' },
    strong: { key: 'amazement', labelJa: '驚嘆' },
  },
  sadness: {
    weak: { key: 'pensiveness', labelJa: '物思い' },
    base: { key: 'sadness', labelJa: '悲しみ' },
    strong: { key: 'grief', labelJa: '悲嘆' },
  },
  disgust: {
    weak: { key: 'boredom', labelJa: '退屈' },
    base: { key: 'disgust', labelJa: '嫌悪' },
    strong: { key: 'loathing', labelJa: '嫌悪感' },
  },
  anger: {
    weak: { key: 'annoyance', labelJa: 'いらだち' },
    base: { key: 'anger', labelJa: '怒り' },
    strong: { key: 'rage', labelJa: '激怒' },
  },
  anticipation: {
    weak: { key: 'interest', labelJa: '興味' },
    base: { key: 'anticipation', labelJa: '期待' },
    strong: { key: 'vigilance', labelJa: '警戒' },
  },
};

// Extended emotion mappings from database
export const EXTENDED_EMOTION_MAP: Record<string, { primary: PlutchikKey; intensity: 'weak' | 'base' | 'strong' }> = {
  // joy family
  'serenity': { primary: 'joy', intensity: 'weak' },
  'contentment': { primary: 'joy', intensity: 'weak' },
  'happiness': { primary: 'joy', intensity: 'base' },
  'joy': { primary: 'joy', intensity: 'base' },
  'ecstasy': { primary: 'joy', intensity: 'strong' },
  
  // trust family
  'acceptance': { primary: 'trust', intensity: 'weak' },
  'trust': { primary: 'trust', intensity: 'base' },
  'admiration': { primary: 'trust', intensity: 'strong' },
  
  // fear family
  'apprehension': { primary: 'fear', intensity: 'weak' },
  'anxiety': { primary: 'fear', intensity: 'weak' },
  'fear': { primary: 'fear', intensity: 'base' },
  'terror': { primary: 'fear', intensity: 'strong' },
  
  // surprise family
  'distraction': { primary: 'surprise', intensity: 'weak' },
  'confusion': { primary: 'surprise', intensity: 'weak' },
  'surprise': { primary: 'surprise', intensity: 'base' },
  'amazement': { primary: 'surprise', intensity: 'strong' },
  'awe': { primary: 'surprise', intensity: 'strong' },
  
  // sadness family
  'pensiveness': { primary: 'sadness', intensity: 'weak' },
  'loneliness': { primary: 'sadness', intensity: 'weak' },
  'sadness': { primary: 'sadness', intensity: 'base' },
  'depression': { primary: 'sadness', intensity: 'base' },
  'grief': { primary: 'sadness', intensity: 'strong' },
  'remorse': { primary: 'sadness', intensity: 'strong' },
  
  // disgust family
  'boredom': { primary: 'disgust', intensity: 'weak' },
  'disapproval': { primary: 'disgust', intensity: 'weak' },
  'disgust': { primary: 'disgust', intensity: 'base' },
  'contempt': { primary: 'disgust', intensity: 'base' },
  'loathing': { primary: 'disgust', intensity: 'strong' },
  
  // anger family
  'annoyance': { primary: 'anger', intensity: 'weak' },
  'frustration': { primary: 'anger', intensity: 'weak' },
  'anger': { primary: 'anger', intensity: 'base' },
  'aggressiveness': { primary: 'anger', intensity: 'base' },
  'rage': { primary: 'anger', intensity: 'strong' },
  
  // anticipation family
  'interest': { primary: 'anticipation', intensity: 'weak' },
  'anticipation': { primary: 'anticipation', intensity: 'base' },
  'hope': { primary: 'anticipation', intensity: 'base' },
  'optimism': { primary: 'anticipation', intensity: 'base' },
  'vigilance': { primary: 'anticipation', intensity: 'strong' },
  
  // complex emotions mapped to closest primary
  'love': { primary: 'joy', intensity: 'strong' },
  'compassion': { primary: 'trust', intensity: 'base' },
  'gratitude': { primary: 'trust', intensity: 'base' },
  'submission': { primary: 'trust', intensity: 'weak' },
  'guilt': { primary: 'sadness', intensity: 'base' },
  'shame': { primary: 'sadness', intensity: 'strong' },
  'disappointment': { primary: 'sadness', intensity: 'weak' },
  'envy': { primary: 'anger', intensity: 'weak' },
  'jealousy': { primary: 'anger', intensity: 'base' },
  'pride': { primary: 'joy', intensity: 'base' },
  'relief': { primary: 'joy', intensity: 'weak' },
};

export function normalizeEmotionKey(key?: string | null): string | null {
  if (!key) return null;
  return key.trim().toLowerCase();
}

export function keyToPrimary(key?: string | null): PlutchikKey | null {
  const k = normalizeEmotionKey(key);
  if (!k) return null;
  
  // Check extended mapping first
  const extended = EXTENDED_EMOTION_MAP[k];
  if (extended) return extended.primary;
  
  // Fallback to intensity mapping
  const entries = Object.entries(PLUTCHIK_INTENSITY) as [PlutchikKey, PlutchikIntensity][];
  for (const [p, intens] of entries) {
    if (intens.base.key === k || intens.weak.key === k || intens.strong.key === k || p === (k as PlutchikKey)) {
      return p;
    }
  }
  return null;
}

export function getEmotionIntensity(key?: string | null): 'weak' | 'base' | 'strong' | null {
  const k = normalizeEmotionKey(key);
  if (!k) return null;
  
  // Check extended mapping first
  const extended = EXTENDED_EMOTION_MAP[k];
  if (extended) return extended.intensity;
  
  // Check intensity mapping
  const entries = Object.entries(PLUTCHIK_INTENSITY) as [PlutchikKey, PlutchikIntensity][];
  for (const [, intens] of entries) {
    if (intens.weak.key === k) return 'weak';
    if (intens.base.key === k) return 'base';
    if (intens.strong.key === k) return 'strong';
  }
  
  return 'base'; // default to base if not found
}

export function shadeColor(hex: string, amt: number) {
  // amt: -0.5..0.5 to darken/lighten
  const col = hex.replace('#', '');
  const num = parseInt(col, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * amt)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * amt)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * amt)));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

