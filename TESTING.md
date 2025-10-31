# 会話管理API 検証手順

このドキュメントでは、会話管理APIの完全な検証手順を説明します。

## 📋 目次
1. [事前準備](#事前準備)
2. [バックエンド起動](#バックエンド起動)
3. [フロントエンド起動](#フロントエンド起動)
4. [動作確認](#動作確認)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🔧 事前準備

### 1. 必要なサービス
以下のサービスが起動していることを確認：
- PostgreSQL (ポート5432)
- Redis (ポート6379)

### 2. APIキーの取得

#### Deepgram API キー
1. https://deepgram.com/ にアクセス
2. アカウント作成/ログイン
3. API キーを取得

#### OpenAI API キー  
1. https://platform.openai.com/ にアクセス
2. アカウント作成/ログイン
3. API キーを取得

### 3. 環境変数の設定

#### バックエンド
```bash
cd backend
cp .env.example .env
```

`.env`を編集：
```bash
# Deepgram API
DEEPGRAM_API_KEY=your-deepgram-api-key-here

# OpenAI API  
OPENAI_API_KEY=your-openai-api-key-here

# Database
DB_NAME=emocare_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/1
```

#### フロントエンド
```bash
cd front
cp .env.local.example .env.local
```

`.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🚀 バックエンド起動

### 1. データベースセットアップ
```bash
cd backend

# 依存関係インストール
uv sync

# データベース作成
uv run python create_db.py

# マイグレーション
uv run python manage.py migrate

# 感情マスターデータ投入
uv run python manage.py loaddata emotions
```

### 2. テスト患者の作成
```bash
# 患者登録
curl -X POST http://localhost:8000/api/v1/patients/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テスト患者",
    "email": "test@example.com",
    "password": "password123"
  }'
```

レスポンス例：
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "テスト患者",
  "email": "test@example.com",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "created_at": "2025-10-26T10:00:00Z"
}
```

**重要**: `id`（Patient ID）と`token`をメモしておいてください！

### 3. 開発サーバー起動
```bash
uv run python manage.py runserver
```

起動確認：
```
http://localhost:8000/admin/
```

---

## 💻 フロントエンド起動

```bash
cd front

# 依存関係インストール（初回のみ）
npm install

# 開発サーバー起動
npm run dev
```

起動確認：
```
http://localhost:3000
```

---

## ✅ 動作確認

### 方法1: フロントエンドUI（推奨）

1. **テストページにアクセス**
   ```
   http://localhost:3000/test-conversation
   ```

2. **Patient IDとTokenを入力**
   - Patient ID: 患者登録時に取得したUUID
   - 認証Token: 患者登録時に取得したトークン

3. **セッション開始**
   - 「1. セッション開始」ボタンをクリック
   - Session IDが表示されることを確認

4. **録音**
   - 「2. 録音開始」ボタンをクリック
   - マイクへのアクセスを許可
   - 何か話す（例: 「今日は調子がいいです」）

5. **録音停止・STT実行**
   - 「3. 録音停止 (STT実行)」ボタンをクリック
   - STT結果と累積テキストが表示されることを確認

6. **繰り返し（任意）**
   - 必要に応じて手順4-5を繰り返す

7. **セッション終了・LLM解析**
   - 「4. セッション終了 (LLM解析)」ボタンをクリック
   - 以下が表示されることを確認：
     - AI応答テキスト
     - 検出された感情
     - 感情選定理由
     - AI音声（自動再生）

### 方法2: cURL

#### 1. セッション開始
```bash
TOKEN="your-token-here"
PATIENT_ID="your-patient-id-here"

curl -X POST http://localhost:8000/api/v1/conversation/start/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d "{\"patient_id\": \"$PATIENT_ID\"}"
```

#### 2. STT処理（音声送信）
```bash
SESSION_ID="your-session-id-here"

# 音声ファイルをBase64エンコード
AUDIO_BASE64=$(base64 -w 0 test_audio.webm)

curl -X POST http://localhost:8000/api/v1/conversation/session/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"audio_data\": \"data:audio/webm;base64,$AUDIO_BASE64\"
  }"
```

#### 3. セッション終了
```bash
curl -X POST http://localhost:8000/api/v1/sessions/$SESSION_ID/end/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token $TOKEN"
```

---

## 🔍 確認ポイント

### ✅ STT処理
- [ ] 音声が正しくテキスト化される
- [ ] 信頼度(confidence)が0.8以上
- [ ] 累積テキストに追加される

### ✅ LLM解析
- [ ] 共感的な応答が生成される（50文字以内）
- [ ] 感情が52感情から選択される
- [ ] 感情選定理由が明確（100文字以内）

### ✅ TTS生成
- [ ] AI応答の音声が生成される
- [ ] 音声が再生可能（MP3形式）

### ✅ データ保存
```bash
# Djangoシェルで確認
uv run python manage.py shell

>>> from apps.conversations.models import ConversationSession
>>> session = ConversationSession.objects.latest('created_at')
>>> print(f"Patient Text: {session.patient_text}")
>>> print(f"AI Response: {session.ai_response_text}")
>>> print(f"Emotion: {session.emotion.name_ja}")
>>> print(f"Reason: {session.emotion_reason}")
```

### ✅ Redisキャッシュ
```bash
redis-cli

# セッション進行中
> KEYS session:*
> GET session:987fcdeb-51a2-43d7-89ab-123456789abc:text

# セッション終了後（キャッシュクリアされる）
> KEYS session:*
(empty array)
```

---

## 🐛 トラブルシューティング

### エラー: "DEEPGRAM_API_KEY is not set"
**原因**: Deepgram APIキーが設定されていない  
**解決**: `.env`ファイルに正しいAPIキーを設定

### エラー: "OPENAI_API_KEY is not set"
**原因**: OpenAI APIキーが設定されていない  
**解決**: `.env`ファイルに正しいAPIキーを設定

### エラー: "session_not_found"
**原因**: セッションIDが無効  
**解決**: セッション開始APIを実行してSession IDを取得

### エラー: "authentication_failed"
**原因**: トークンが無効または期限切れ  
**解決**: 患者登録/ログインAPIで新しいトークンを取得

### マイクが使えない
**原因**: ブラウザのマイク権限がない  
**解決**: 
- ブラウザ設定でマイクへのアクセスを許可
- HTTPS または localhost でアクセス

### 音声が認識されない
**原因**: 音声データが空またはDeepgram APIエラー  
**解決**: 
- 十分な長さ（1秒以上）の音声を録音
- Deepgram APIキーの有効性を確認
- バックエンドのログを確認

### AI応答が生成されない
**原因**: OpenAI APIエラーまたは感情データ未投入  
**解決**: 
- OpenAI APIキーの有効性を確認
- `python manage.py loaddata emotions`を実行
- バックエンドのログを確認

---

## 📊 パフォーマンス目安

| 処理 | 所要時間 |
|------|----------|
| セッション開始 | ~100ms |
| STT処理 | 1-3秒 |
| LLM解析 | 2-5秒 |
| TTS生成 | 1-2秒 |
| **合計（セッション終了時）** | **4-10秒** |

---

## 📚 参考資料

- [Deepgram API ドキュメント](https://developers.deepgram.com/)
- [OpenAI API ドキュメント](https://platform.openai.com/docs/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js ドキュメント](https://nextjs.org/docs)

---

## ✨ 次のステップ

検証が完了したら：
1. エラーハンドリングの改善
2. パフォーマンス最適化
3. WebSocket統合（リアルタイム通信）
4. セキュリティ強化
5. 本番環境デプロイ準備
