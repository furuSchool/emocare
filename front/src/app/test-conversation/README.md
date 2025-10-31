# 会話管理API テストページ

## 概要
このページは会話管理APIの動作を検証するためのテストページです。

## アクセス方法
開発サーバー起動後、以下のURLにアクセスしてください：
```
http://localhost:3000/test-conversation
```

## 事前準備

### 1. 環境変数の設定
`.env.local`ファイルを作成し、バックエンドAPIのURLを設定：
```bash
cp .env.local.example .env.local
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 2. Patient と Token の取得

#### Patient の作成
バックエンドで患者を作成します：
```bash
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
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

`id`（Patient ID）と`token`をコピーしてください。

#### ログイン（既存患者の場合）
```bash
curl -X POST http://localhost:8000/api/v1/patients/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 使用方法

### 1. テストページを開く
```
http://localhost:3000/test-conversation
```

### 2. Patient ID と Token を入力
- Patient ID: 患者登録時に取得したUUID
- 認証Token: ログイン/登録時に取得したトークン

### 3. セッション開始
「1. セッション開始」ボタンをクリックして会話セッションを開始します。

### 4. 録音
「2. 録音開始」ボタンをクリックして音声を録音します。
マイクへのアクセス許可を求められた場合は許可してください。

### 5. 録音停止・STT実行
「3. 録音停止 (STT実行)」ボタンをクリックします。
- 音声がDeepgram APIでテキスト化されます
- 変換されたテキストが「最後のSTT結果」に表示されます
- 累積テキストにも追加されます

### 6. 繰り返し（任意）
必要に応じて、手順4-5を繰り返して会話を続けることができます。

### 7. セッション終了・LLM解析
「4. セッション終了 (LLM解析)」ボタンをクリックします。
- OpenAI GPT-4で感情分析と共感的応答が生成されます
- Deepgram TTSで音声が生成されます
- 結果が表示されます：
  - AI応答テキスト
  - 検出された感情
  - 感情選定理由
  - AI音声（自動再生）

## 機能説明

### API エンドポイント
- `POST /api/v1/conversation/start/` - セッション開始
- `POST /api/v1/conversation/session/` - STT処理
- `POST /api/v1/sessions/{session_id}/end/` - セッション終了・LLM解析

### 主な機能
- **音声録音**: WebRTC MediaRecorder APIを使用
- **STT (Speech-to-Text)**: Deepgram APIで音声をテキスト化
- **LLM解析**: OpenAI GPT-4で感情分析と応答生成
- **TTS (Text-to-Speech)**: Deepgram APIでテキストを音声化
- **リアルタイムログ**: 各処理の実行状況をログ表示

## トラブルシューティング

### マイクが使えない
- ブラウザの設定でマイクへのアクセスを許可してください
- HTTPSまたはlocalhost環境でのみMediaRecorder APIが動作します

### セッション開始エラー
- Patient IDとTokenが正しいか確認してください
- バックエンドサーバーが起動しているか確認してください

### STT処理エラー
- Deepgram API キーが正しく設定されているか確認してください
- 音声データが正常に録音されているか確認してください

### LLM解析エラー
- OpenAI API キーが正しく設定されているか確認してください
- 感情マスターデータが投入されているか確認してください

## 開発環境
- Next.js 14+
- React 18+
- TypeScript
- Tailwind CSS
