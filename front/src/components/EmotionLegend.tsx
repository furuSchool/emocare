export default function EmotionLegend() {
  const items = [
    { label: '喜び (joy)', color: '#FFE066' },
    { label: '信頼 (trust)', color: '#C7F464' },
    { label: '恐れ (fear)', color: '#88D8B0' },
    { label: '驚き (surprise)', color: '#8EE3EF' },
    { label: '悲しみ (sadness)', color: '#6C91BF' },
    { label: '嫌悪 (disgust)', color: '#9E7BB5' },
    { label: '怒り (anger)', color: '#FF6B6B' },
    { label: '期待 (anticipation)', color: '#F4A259' },
  ];
  
  const layers = [
    { label: '内側: 弱い感情', desc: '(穏やか・控えめな感情)' },
    { label: '中間: 基本感情', desc: '(通常レベルの感情)' },
    { label: '外側: 強い感情', desc: '(激しい・強烈な感情)' },
  ];
  
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-white">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: i.color }} />
            <span className="text-xs text-white">{i.label}</span>
          </div>
        ))}
      </div>
      
      <div className="border-t border-white/20 pt-3">
        <div className="text-xs text-white/70 mb-2">感情の強度レベル</div>
        <div className="flex flex-col gap-1.5">
          {layers.map((layer) => (
            <div key={layer.label} className="flex items-start gap-2 text-xs text-white/90">
              <span className="font-medium min-w-[100px]">{layer.label}</span>
              <span className="text-white/60">{layer.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
