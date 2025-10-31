# 会話管理API

## 概要
患者とAIの会話セッションを管理し、音声認識（STT）、感情分析（LLM）、音声合成（TTS）を統合したAPIです。

## 技術スタック
- **STT (Speech-to-Text)**: Deepgram API
- **LLM (感情分析・応答生成)**: OpenAI GPT-4
- **TTS (Text-to-Speech)**: Deepgram API
- **キャッシュ**: Redis

## APIエンドポイント

### 1. 会話セッション開始
```
POST /api/v1/conversation/start/
```

**リクエスト:**
```json
{
  "patient_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**レスポンス (201 Created):**
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "started_at": "2025-10-26T10:00:00Z",
  "status": "active"
}
```

### 2. セッション通信（STT処理）
```
POST /api/v1/conversation/session/
```

**リクエスト:**
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "audio_data": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC..."
}
```

**レスポンス (200 OK):**
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "transcribed_text": "今日は調子がいいです",
  "accumulated_text": "今日は調子がいいです",
  "confidence": 0.95
}
```

### 3. 会話終了・保存・解析
```
POST /api/v1/sessions/{session_id}/end/
```

**レスポンス (200 OK):**
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "patient_text": "今日は調子がいいです",
  "ai_response_text": "それは良かったですね。今日はどんなことがありましたか？",
  "ai_audio_base64": "SUQzBAAAAAAAI1RTU0UAAAA...",
  "emotion": {
    "id": "emotion-uuid",
    "name": "joy",
    "name_ja": "喜び"
  },
  "emotion_reason": "患者の発言から前向きで明るい気持ちが感じられます",
  "ended_at": "2025-10-26T10:05:00Z"
}
```

## 処理フロー

### 1. セッション開始時
1. ConversationSessionレコード作成（`started_at`のみ設定）
2. Redisキャッシュ初期化: `session:{session_id}:text` → ""

### 2. STT処理時
1. Base64エンコードされた音声データをデコード
2. Deepgram APIで音声→テキスト変換
3. Redisキャッシュに追加: `APPEND session:{session_id}:text "{text} "`
4. 累積テキストを返却

### 3. セッション終了時
1. Redisから累積テキスト取得
2. OpenAI GPT-4で並行処理:
   - 共感的応答生成
   - 52感情から最適な感情を選択
   - 感情選定理由生成
3. Deepgram APIでテキスト→音声変換（TTS）
4. DBに全データ保存:
   - `patient_text`: 累積テキスト
   - `ai_response_text`: LLM生成応答
   - `emotion`: 選択された感情
   - `emotion_reason`: 選定理由
   - `ended_at`: 終了時刻
5. Redisキャッシュクリア
6. レスポンス返却（音声データはBase64エンコード）

## 環境変数

`.env`ファイルに以下を設定してください：

```bash
# Deepgram API
DEEPGRAM_API_KEY=your-deepgram-api-key

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Redis
REDIS_URL=redis://redis:6379/1
```

## セットアップ

### 1. 依存関係インストール
```bash
cd backend
uv sync
```

### 2. 環境変数設定
```bash
cp .env.example .env
# .envを編集してAPIキーを設定
```

### 3. データベースマイグレーション
```bash
uv run python create_db.py
uv run python manage.py migrate
uv run python manage.py loaddata emotions
```

### 4. 開発サーバー起動
```bash
uv run python manage.py runserver
```

## テスト方法

### cURLでのテスト

#### 1. 患者登録
```bash
curl -X POST http://localhost:8000/api/v1/patients/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テスト患者",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 2. セッション開始
```bash
TOKEN="your-token-here"
PATIENT_ID="your-patient-id-here"

curl -X POST http://localhost:8000/api/v1/conversation/start/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d "{\"patient_id\": \"$PATIENT_ID\"}"
```

#### 3. STT処理（音声データ送信）
```bash
SESSION_ID="your-session-id-here"

# 音声ファイルをBase64エンコード
AUDIO_BASE64=$(base64 -w 0 audio.webm)

curl -X POST http://localhost:8000/api/v1/conversation/session/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"audio_data\": \"data:audio/webm;base64,$AUDIO_BASE64\"
  }"
```

#### 4. セッション終了
```bash
curl -X POST http://localhost:8000/api/v1/sessions/$SESSION_ID/end/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN"
```

### フロントエンドでのテスト
```
http://localhost:3000/test-conversation
```
詳細は`/front/src/app/test-conversation/README.md`を参照。

## サービス実装

### DeepgramService
- `transcribe(audio_data)`: 音声→テキスト変換（STT）
- `text_to_speech(text)`: テキスト→音声変換（TTS）

### LLMService
- `analyze_conversation(patient_text)`: 感情分析と応答生成

## エラーハンドリング

### 400 Bad Request
- `session_already_ended`: セッション既に終了
- `validation_error`: バリデーションエラー

### 404 Not Found
- `session_not_found`: セッション不存在

### 500 Internal Server Error
- `llm_processing_failed`: LLM処理失敗
- Deepgram APIエラー
- OpenAI APIエラー

## Redis キャッシュ

### セッションテキスト
- **Key**: `session:{session_id}:text`
- **Value**: 累積会話テキスト
- **TTL**: 3600秒（1時間）

### 確認方法
```bash
redis-cli
> KEYS session:*
> GET session:987fcdeb-51a2-43d7-89ab-123456789abc:text
```

## データベース

### ConversationSession
- `patient_id`: 患者ID (FK)
- `started_at`: 開始時刻
- `ended_at`: 終了時刻
- `patient_text`: 患者発話テキスト
- `ai_response_text`: AI応答テキスト
- `emotion_id`: 感情ID (FK)
- `emotion_reason`: 感情選定理由

## パフォーマンス

- STT処理: 約1-3秒（音声長による）
- LLM解析: 約2-5秒
- TTS生成: 約1-2秒
- 合計: 約4-10秒（セッション終了時）

## セキュリティ

- 認証: Token認証必須
- 本人確認: 患者IDとトークンの整合性チェック
- データ保護: HTTPS推奨（本番環境）
