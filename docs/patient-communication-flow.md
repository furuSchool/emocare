# 患者の通信フロー（現在の実装）

```mermaid
graph TD
A1[患者 EndUser]

subgraph "患者用フロントエンド Next.js"
B1[患者音声録音UI]
B2[AI応答音声の再生]
B3[会話のスタートボタン]
B4[会話のストップボタン]
B5[WebSocketクライアント]
end

subgraph "バックエンド Django + Channels"
L0[WebSocket接続<br/>ws://localhost:8000/ws/conversation/]
L1[ConversationConsumer<br/>WebSocketハンドラー]
L2[Deepgram STT Service<br/>音声→テキスト変換]
L3[Deepgram TTS Service<br/>テキスト→音声変換]
L4[LLM Service<br/>感情分析 + AI応答生成]
L5[Redis Cache<br/>セッションテキスト蓄積]
L6[ConversationSession Model<br/>DB保存]
end

subgraph "外部サービス"
E1[Deepgram API<br/>STT + TTS]
E2[OpenAI API<br/>GPT-4o感情分析 + 応答生成]
E3[PostgreSQL Database<br/>会話履歴・感情データ]
E4[Redis<br/>セッション一時データ]
end

%% 会話開始フロー
A1 -->|クリック| B3
B3 -->|WebSocket接続確立| L0
L0 --> B5
B5 -->|メッセージ送信<br/>type: start_session<br/>patient_id| L1
L1 -->|セッション作成| L6
L6 --> E3
L1 -->|Redisキャッシュ初期化<br/>session:ID:text| L5
L5 --> E4
L1 -->|session_started応答| B5
B5 -->|セッション情報表示| B3

%% 音声録音・送信フロー
A1 -->|音声入力開始| B1
B1 -->|MediaRecorder録音| B1
A1 -->|音声入力停止| B1
B1 -->|WebSocketで音声送信<br/>type: process_audio<br/>audio_data: base64<br/>session_id| B5
B5 --> L1
L1 -->|音声データデコード| L1
L1 -->|STT処理| L2
L2 -->|API呼び出し| E1
E1 -->|文字起こし結果 + 信頼度| L2
L2 --> L1
L1 -->|Redisにテキスト追加| L5
L5 --> E4
L1 -->|audio_processed応答<br/>transcribed_text<br/>accumulated_text<br/>confidence| B5
B5 -->|文字起こし結果表示| B1

%% 会話終了フロー
A1 -->|クリック| B4
B4 -->|WebSocket送信<br/>type: end_session<br/>session_id| B5
B5 --> L1
L1 -->|Redisから全テキスト取得| L5
L5 --> E4
E4 -->|patient_text| L1
L1 -->|感情分析 + AI応答生成| L4
L4 -->|GPT-4o API呼び出し| E2
E2 -->|emotion, response, reason| L4
L4 --> L1
L1 -->|TTS音声生成| L3
L3 -->|API呼び出し| E1
E1 -->|音声データ| L3
L3 -->|ai_audio_base64| L1
L1 -->|DB保存<br/>patient_text<br/>ai_response_text<br/>emotion<br/>emotion_reason<br/>ended_at| L6
L6 --> E3
L1 -->|Redisキャッシュ削除| L5
L5 --> E4
L1 -->|session_ended応答<br/>patient_text<br/>ai_response_text<br/>ai_audio_base64<br/>emotion<br/>emotion_reason| B5
B5 -->|AI応答テキスト表示| B2
B5 -->|音声データ再生| B2
B2 -->|HTMLAudioElement再生| A1

%% WebSocket常時接続
L0 -.双方向通信.- B5

style L0 fill:#e1f5ff
style L1 fill:#e1f5ff
style B5 fill:#fff4e1
style E1 fill:#ffe1e1
style E2 fill:#ffe1e1
style E3 fill:#ffe1e1
style E4 fill:#ffe1e1
```

## 主要な変更点

### 1. **WebSocket通信方式**
- 従来の設計: REST API + ポーリング
- 現在の実装: **WebSocket双方向通信** (`ws://localhost:8000/ws/conversation/`)
- 利点: リアルタイム通信、低レイテンシ、サーバープッシュ可能

### 2. **メッセージタイプ**
WebSocketで送受信される3つのメッセージタイプ:

#### 送信メッセージ
1. `start_session` - セッション開始
2. `process_audio` - 音声データ送信（STT処理）
3. `end_session` - セッション終了（LLM + TTS処理）

#### 受信メッセージ
1. `connection_established` - 接続確立
2. `session_started` - セッション開始完了
3. `audio_processed` - 音声処理完了（文字起こし結果）
4. `session_ended` - セッション終了完了（AI応答 + 音声）
5. `error` - エラー発生

### 3. **データフロー**

#### セッション開始
```
患者 → start_session(patient_id) → ConversationConsumer
→ DB: ConversationSession作成
→ Redis: session:{id}:text 初期化
→ session_started応答
```

#### 音声処理（繰り返し可能）
```
患者 → process_audio(session_id, audio_data) → ConversationConsumer
→ Deepgram STT API
→ Redis: テキスト蓄積
→ audio_processed応答(transcribed_text, accumulated_text)
```

#### セッション終了
```
患者 → end_session(session_id) → ConversationConsumer
→ Redis: 蓄積テキスト取得
→ OpenAI GPT-4o: 感情分析 + AI応答生成
→ Deepgram TTS API: 音声生成
→ DB: 会話履歴保存
→ Redis: キャッシュ削除
→ session_ended応答(ai_response_text, ai_audio_base64, emotion)
```

### 4. **外部API統合**

| サービス | 用途 | タイミング |
|---------|------|-----------|
| Deepgram STT | 音声→テキスト | 音声送信時（process_audio） |
| Deepgram TTS | テキスト→音声 | セッション終了時（end_session） |
| OpenAI GPT-4o | 感情分析 + AI応答生成 | セッション終了時（end_session） |

### 5. **データベース構造**

#### ConversationSession Model
```python
- id: UUID
- patient: ForeignKey(Patient)
- started_at: DateTime
- ended_at: DateTime (nullable)
- patient_text: Text (会話全文)
- ai_response_text: Text
- emotion: ForeignKey(Emotion)
- emotion_reason: Text
- is_active: Boolean (ended_at == None)
```

### 6. **Redis使用**
- キー: `session:{session_id}:text`
- 値: 蓄積されたテキスト（スペース区切り）
- TTL: 3600秒（1時間）
- 目的: 複数の音声チャンクを1つのセッションにまとめる

### 7. **フロントエンド実装**
- ファイル: `/front/src/app/test-conversation/page.tsx`
- 技術: Next.js 15 + WebSocket API
- 音声録音: MediaRecorder API
- 音声再生: HTMLAudioElement
- 認証: localStorage (token, patientId, patientName)

### 8. **認証フロー**
```
患者 → /login → 認証成功
→ localStorage保存(token, patientId, patientName)
→ /test-conversation
→ WebSocket接続（認証情報なし、今後実装予定）
```
