# Empathic Care AI（ECAI）開発設計書 - 詳細版

## 目次
1. [概要](#概要)
2. [データベース設計](#データベース設計)
3. [API設計](#api設計)
4. [認証・セキュリティ](#認証セキュリティ)
5. [実装詳細](#実装詳細)
6. [エラーハンドリング](#エラーハンドリング)
7. [Djangoディレクトリ構成](#djangoディレクトリ構成)
8. [開発ワークフロー](#開発ワークフロー)

---

## 概要

本ドキュメントは、AI感情可視化・共感ケア支援システム（ECAI）のバックエンド開発における詳細設計を記述します。

### システム概要

患者が音声で話しかけ、AIが共感的に応答し、その会話から患者の感情を分析・可視化するシステム。医療従事者は患者の感情履歴を確認し、適切なケアを提供できます。

### 技術スタック

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Django | 5.2+ | Webフレームワーク |
| Django REST Framework | 3.16+ | REST API構築 |
| PostgreSQL | 15+ | リレーショナルDB |
| Redis | 7.0+ | キャッシュ・セッション管理 |
| OpenAI Whisper | - | 音声→テキスト変換（STT） |
| OpenAI GPT-4o-mini | - | LLM応答生成・感情分析 |
| OpenAI TTS | - | テキスト→音声変換 |
| uv | 0.9+ | Pythonパッケージ管理 |
| Next.js | 15+ | フロントエンド |
| React | 19+ | UIライブラリ |

### アーキテクチャ概要

```
┌─────────────┐         ┌──────────────┐
│   Patient   │◄───────►│ Backend API  │
│  Frontend   │         │  (Django)    │
│  (React)    │         └──────┬───────┘
└─────────────┘                │
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐         ┌───────▼────┐        ┌──────▼─────┐
   │  Redis  │         │ PostgreSQL │        │ External   │
   │ (Cache) │         │    (DB)    │        │  APIs      │
   └─────────┘         └────────────┘        │ ・OpenAI   │
                                             │  (STT/TTS) │
                                             │  (LLM)     │
                                             └────────────┘
```

---

## データベース設計

### ER図

```mermaid
erDiagram
    Patient ||--o{ ConversationSession : has
    ConversationSession }o--|| Emotion : references
    Staff ||--o{ PatientStaffRelation : manages
    Patient ||--o{ PatientStaffRelation : managed_by

    Patient {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password
        DATE birth_date
        VARCHAR gender
        DATE admission_date
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    ConversationSession {
        UUID id PK
        UUID patient_id FK
        TIMESTAMP started_at
        TIMESTAMP ended_at
        TEXT patient_text
        TEXT ai_response_text
        UUID emotion_id FK
        TEXT emotion_reason
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    Emotion {
        UUID id PK
        VARCHAR name UK
        VARCHAR name_ja
        TIMESTAMP created_at
    }

    Staff {
        UUID id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password
        VARCHAR department
        VARCHAR role
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
```

### テーブル詳細設計

#### 1. Patient（患者）

**テーブル目的**: 患者の基本情報と認証情報を一元管理。メールアドレスとパスワードでログイン認証を行う。

| カラム名 | 型 | 制約 | デフォルト値 | 説明 |
|---------|-----|------|------------|------|
| id | UUID | PRIMARY KEY | uuid.uuid4() | 患者ID（自動生成） |
| name | VARCHAR(100) | NOT NULL | - | 患者名（フルネーム） |
| email | VARCHAR(255) | UNIQUE, NOT NULL | - | メールアドレス（ログインID） |
| password | VARCHAR(255) | NOT NULL | - | パスワード（bcryptでハッシュ化） |
| birth_date | DATE | NULL | - | 生年月日 |
| gender | VARCHAR(10) | NULL | - | 性別（male/female/other） |
| admission_date | DATE | NULL | - | 入院日 |
| created_at | TIMESTAMP | NOT NULL | now() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | now() | 更新日時 |

**インデックス**:
- `email` (UNIQUE) - ログイン時の高速検索
- `created_at` - 新規登録患者の検索用

**バリデーションルール**:
- `email`: RFC 5322準拠のメールアドレス形式
- `password`: 最低8文字、英数字混在
- `name`: 1〜100文字
- `gender`: "male", "female", "other"のいずれか

**セキュリティ考慮事項**:
- パスワードは必ずbcryptでハッシュ化して保存
- emailは小文字に正規化して保存
- 個人情報のため、APIレスポンスでは慎重に扱う

---

#### 2. ConversationSession（会話セッション）

**テーブル目的**: 患者とAIの1回の会話セッション全体を記録。会話テキスト、AI応答、感情分析結果を統合管理。

| カラム名 | 型 | 制約 | デフォルト値 | 説明 |
|---------|-----|------|------------|------|
| id | UUID | PRIMARY KEY | uuid.uuid4() | セッションID |
| patient_id | UUID | FOREIGN KEY, NOT NULL | - | 患者ID（Patientテーブル） |
| started_at | TIMESTAMP | NOT NULL | - | 会話開始日時 |
| ended_at | TIMESTAMP | NULL | - | 会話終了日時（終了時に更新） |
| patient_text | TEXT | NULL | - | 患者発話テキスト全文（STT結果） |
| ai_response_text | TEXT | NULL | - | AI応答テキスト（LLM生成） |
| emotion_id | UUID | FOREIGN KEY, NULL | - | 感情ID（Emotionテーブル） |
| emotion_reason | TEXT | NULL | - | 感情を選んだ理由（LLM生成） |
| created_at | TIMESTAMP | NOT NULL | now() | レコード作成日時 |
| updated_at | TIMESTAMP | NOT NULL | now() | レコード更新日時 |

**インデックス**:
- `(patient_id, started_at)` (複合) - 患者ごとの時系列検索用
- `emotion_id` - 感情別の集計用
- `started_at` - 時系列ソート用

**外部キー制約**:
- `patient_id` → `Patient.id` (ON DELETE CASCADE)
- `emotion_id` → `Emotion.id` (ON DELETE SET NULL)

**ライフサイクル**:
1. **セッション開始**: `started_at`のみ設定、他はNULL
2. **会話中**: Redisキャッシュに音声テキストを蓄積
3. **セッション終了**: `ended_at`, `patient_text`, `ai_response_text`, `emotion_id`, `emotion_reason`を一括更新

**データ例**:
```sql
INSERT INTO conversation_sessions (
  id, patient_id, started_at, ended_at,
  patient_text, ai_response_text, emotion_id, emotion_reason
) VALUES (
  '987fcdeb-51a2-43d7-89ab-123456789abc',
  '123e4567-e89b-12d3-a456-426614174000',
  '2025-10-25 10:30:00',
  '2025-10-25 10:35:00',
  '今日は調子がいいです。でも、なんだかまた痛くなるんじゃないかって怖いんです',
  '怖い気持ちが強いのですね。何が一番不安ですか？',
  'emotion-fear-uuid',
  '患者は痛みの再発を恐れており、不安感が強く表れています。'
);
```

---

#### 3. Emotion（感情マスター）

**テーブル目的**: プルチックの52感情をマスターデータとして管理。LLMが感情分析時に参照する。

| カラム名 | 型 | 制約 | デフォルト値 | 説明 |
|---------|-----|------|------------|------|
| id | UUID | PRIMARY KEY | uuid.uuid4() | 感情ID |
| name | VARCHAR(50) | UNIQUE, NOT NULL | - | 感情名（英語、小文字） |
| name_ja | VARCHAR(50) | NOT NULL | - | 感情名（日本語） |
| created_at | TIMESTAMP | NOT NULL | now() | 作成日時 |

**インデックス**:
- `name` (UNIQUE) - 感情名での高速検索

**データ仕様**:
- プルチックの感情の輪に基づく52感情
- 基本8感情（basic）+ 二次感情（dyad）+ 三次感情（triad）

**初期データ（抜粋）**:
```sql
-- 基本8感情
INSERT INTO emotions (name, name_ja) VALUES
('joy', '喜び'),
('trust', '信頼'),
('fear', '恐れ'),
('surprise', '驚き'),
('sadness', '悲しみ'),
('disgust', '嫌悪'),
('anger', '怒り'),
('anticipation', '期待');

-- 二次感情（基本感情の組み合わせ）
INSERT INTO emotions (name, name_ja) VALUES
('love', '愛'),           -- joy + trust
('submission', '服従'),   -- trust + fear
('awe', '畏敬'),          -- fear + surprise
('disapproval', '不承認'), -- surprise + sadness
('remorse', '自責'),      -- sadness + disgust
('contempt', '軽蔑'),     -- disgust + anger
('aggressiveness', '攻撃性'), -- anger + anticipation
('optimism', '楽観');     -- anticipation + joy

-- 三次感情（さらに複雑な組み合わせ）
INSERT INTO emotions (name, name_ja) VALUES
('guilt', '罪悪感'),
('pride', '誇り'),
('anxiety', '不安'),
('hope', '希望'),
('despair', '絶望'),
('shame', '恥'),
('envy', '羨望'),
('gratitude', '感謝');
-- ... 合計52感情
```

**データロード方法**:
```bash
# fixtureファイルから一括投入
uv run python manage.py loaddata emotions
```

---

#### 4. Staff（スタッフ）※優先度低

**テーブル目的**: 医療従事者の情報管理。将来的に患者ケア担当者の管理に使用。

| カラム名 | 型 | 制約 | デフォルト値 | 説明 |
|---------|-----|------|------------|------|
| id | UUID | PRIMARY KEY | uuid.uuid4() | スタッフID |
| name | VARCHAR(100) | NOT NULL | - | スタッフ名 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | - | メールアドレス |
| password | VARCHAR(255) | NOT NULL | - | パスワード（ハッシュ化） |
| department | VARCHAR(100) | NULL | - | 所属診療科 |
| role | VARCHAR(50) | NOT NULL | - | 役割（doctor/nurse/psychologist） |
| created_at | TIMESTAMP | NOT NULL | now() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | now() | 更新日時 |

**インデックス**:
- `email` (UNIQUE)
- `role` - 役割別の検索用

**注意**: 現フェーズでは実装優先度低。将来拡張用に設計のみ記載。

---

### Djangoモデル定義

#### apps/patients/models.py

```python
import uuid
from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class Patient(models.Model):
    """患者モデル

    患者の基本情報と認証情報を管理。
    メールアドレスとパスワードでログイン認証を行う。
    """

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='患者ID'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='患者名'
    )
    email = models.EmailField(
        unique=True,
        verbose_name='メールアドレス',
        help_text='ログインIDとして使用'
    )
    password = models.CharField(
        max_length=255,
        verbose_name='パスワード',
        help_text='bcryptでハッシュ化して保存'
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='生年月日'
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        null=True,
        blank=True,
        verbose_name='性別'
    )
    admission_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='入院日'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )

    class Meta:
        db_table = 'patients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='idx_patient_email'),
            models.Index(fields=['created_at'], name='idx_patient_created'),
        ]
        verbose_name = '患者'
        verbose_name_plural = '患者'

    @property
    def is_authenticated(self):
        """常に認証済みとして扱う（Django User互換性）"""
        return True

    @property
    def is_anonymous(self):
        """匿名ユーザーではない（Django User互換性）"""
        return False

    def set_password(self, raw_password):
        """パスワードをハッシュ化して保存

        Args:
            raw_password (str): 平文パスワード
        """
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        """パスワード検証

        Args:
            raw_password (str): 検証する平文パスワード

        Returns:
            bool: パスワードが一致すればTrue
        """
        return check_password(raw_password, self.password)

    def __str__(self):
        return f"{self.name} ({self.email})"
```

#### apps/conversations/models.py

```python
import uuid
from django.db import models
from apps.patients.models import Patient
from apps.emotions.models import Emotion


class ConversationSession(models.Model):
    """会話セッションモデル

    患者とAIの1回の会話セッション全体を記録。
    会話テキスト、AI応答、感情分析結果を統合管理。
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='セッションID'
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name='患者'
    )
    started_at = models.DateTimeField(
        verbose_name='開始日時'
    )
    ended_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='終了日時'
    )
    patient_text = models.TextField(
        null=True,
        blank=True,
        verbose_name='患者発話テキスト',
        help_text='STTで変換されたテキスト全文'
    )
    ai_response_text = models.TextField(
        null=True,
        blank=True,
        verbose_name='AI応答テキスト',
        help_text='LLMが生成した共感的応答'
    )
    emotion = models.ForeignKey(
        Emotion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
        verbose_name='感情'
    )
    emotion_reason = models.TextField(
        null=True,
        blank=True,
        verbose_name='感情選定理由',
        help_text='LLMが感情を選んだ理由'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新日時'
    )

    class Meta:
        db_table = 'conversation_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(
                fields=['patient', 'started_at'],
                name='idx_session_patient_started'
            ),
            models.Index(fields=['emotion'], name='idx_session_emotion'),
            models.Index(fields=['started_at'], name='idx_session_started'),
        ]
        verbose_name = '会話セッション'
        verbose_name_plural = '会話セッション'

    def __str__(self):
        return f"Session {self.id} - {self.patient.name} ({self.started_at})"

    @property
    def is_active(self):
        """セッションがアクティブかどうか"""
        return self.ended_at is None

    @property
    def duration(self):
        """会話時間（秒）を計算"""
        if self.ended_at and self.started_at:
            return (self.ended_at - self.started_at).total_seconds()
        return None
```

#### apps/emotions/models.py

```python
import uuid
from django.db import models


class Emotion(models.Model):
    """感情マスターモデル

    プルチックの52感情をマスターデータとして管理。
    LLMが感情分析時に参照する。
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='感情ID'
    )
    name = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='感情名',
        help_text='英語名（小文字）'
    )
    name_ja = models.CharField(
        max_length=50,
        verbose_name='感情名（日本語）'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='作成日時'
    )

    class Meta:
        db_table = 'emotions'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name'], name='idx_emotion_name'),
        ]
        verbose_name = '感情'
        verbose_name_plural = '感情'

    def __str__(self):
        return f"{self.name_ja} ({self.name})"
```

---

## API設計

### 認証方式

**Token認証**を採用:
- ログイン時にトークン発行
- Redisにトークンと患者IDを保存
- 各APIリクエストのAuthorizationヘッダーでトークン検証

**トークンの形式**:
```
Authorization: Token {32文字のランダム文字列}
```

**トークンのライフサイクル**:
1. ログイン成功時にトークン生成・Redis保存（有効期限24時間）
2. リクエストごとにRedisでトークン検証
3. ログアウト時にRedisからトークン削除

---

### APIエンドポイント一覧

#### 1. 患者認証・管理API

| メソッド | エンドポイント | 説明 | 認証 | レート制限 |
|---------|--------------|------|------|----------|
| POST | `/api/v1/patients/register/` | 患者新規登録 | 不要 | 5回/時 |
| POST | `/api/v1/patients/login/` | 患者ログイン | 不要 | 10回/時 |
| POST | `/api/v1/patients/logout/` | 患者ログアウト | 必須 | - |
| GET | `/api/v1/patients/{patient_id}/` | 患者情報取得 | 必須 | - |

#### 2. 会話管理API

| メソッド | エンドポイント | 説明 | 認証 | 備考 |
|---------|--------------|------|------|------|
| POST | `/api/v1/conversation/start/` | 会話セッション開始 | 必須 | Redisキャッシュ初期化 |
| POST | `/api/v1/conversation/session/` | セッション通信（STT） | 必須 | リアルタイムSTT処理 |
| POST | `/api/v1/sessions/{session_id}/end/` | 会話終了・保存・解析 | 必須 | LLM処理・DB保存 |

#### 3. 感情データ取得API

| メソッド | エンドポイント | 説明 | 認証 | 備考 |
|---------|--------------|------|------|------|
| GET | `/api/v1/emotions/history/` | 患者の感情履歴取得 | 必須 | ページネーション対応 |
| GET | `/api/v1/emotions/` | 感情マスター一覧取得 | 必須 | キャッシュ推奨 |

---

### API詳細仕様

#### 1. 患者新規登録

**エンドポイント**: `POST /api/v1/patients/register/`

**目的**: 新規患者アカウントを作成し、ログイントークンを発行する。

**リクエスト**:
```http
POST /api/v1/patients/register/
Content-Type: application/json

{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "password": "SecurePass123!",
  "birth_date": "1990-01-01",
  "gender": "male",
  "admission_date": "2025-10-20"
}
```

**リクエストバリデーション**:

| フィールド | 必須 | 型 | 制約 |
|----------|------|-----|------|
| name | ✓ | string | 1〜100文字 |
| email | ✓ | string | RFC 5322準拠、未登録 |
| password | ✓ | string | 8文字以上、英数字混在 |
| birth_date | ✗ | string | YYYY-MM-DD形式 |
| gender | ✗ | string | male/female/other |
| admission_date | ✗ | string | YYYY-MM-DD形式 |

**成功レスポンス (201 Created)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "birth_date": "1990-01-01",
  "gender": "male",
  "admission_date": "2025-10-20",
  "created_at": "2025-10-25T10:00:00Z",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**エラーレスポンス**:

```json
// 400 Bad Request - バリデーションエラー
{
  "error": "validation_error",
  "message": "入力内容に誤りがあります",
  "details": {
    "email": ["このメールアドレスは既に登録されています"],
    "password": ["パスワードは8文字以上である必要があります"]
  }
}

// 429 Too Many Requests - レート制限
{
  "error": "rate_limit_exceeded",
  "message": "リクエスト回数の上限に達しました。1時間後に再試行してください"
}
```

**処理フロー**:
1. リクエストデータのバリデーション
2. メールアドレスの重複チェック
3. パスワードをbcryptでハッシュ化
4. Patientレコード作成
5. トークン生成（32文字のランダム文字列）
6. Redis保存: `token:{token}` → `patient_id` (TTL: 24時間)
7. レスポンス返却

---

#### 2. 患者ログイン

**エンドポイント**: `POST /api/v1/patients/login/`

**目的**: メールアドレスとパスワードで認証し、ログイントークンを発行する。

**リクエスト**:
```http
POST /api/v1/patients/login/
Content-Type: application/json

{
  "email": "yamada@example.com",
  "password": "SecurePass123!"
}
```

**成功レスポンス (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "山田太郎",
  "email": "yamada@example.com",
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**エラーレスポンス**:
```json
// 401 Unauthorized - 認証失敗
{
  "error": "authentication_failed",
  "message": "メールアドレスまたはパスワードが正しくありません"
}
```

**処理フロー**:
1. メールアドレスで患者検索
2. パスワード検証（`Patient.check_password()`）
3. トークン生成
4. Redis保存: `token:{token}` → `patient_id` (TTL: 24時間)
5. レスポンス返却

---

#### 3. 患者ログアウト

**エンドポイント**: `POST /api/v1/patients/logout/`

**目的**: ログイントークンを無効化する。

**リクエスト**:
```http
POST /api/v1/patients/logout/
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**成功レスポンス (200 OK)**:
```json
{
  "message": "ログアウトしました"
}
```

**処理フロー**:
1. Authorizationヘッダーからトークン取得
2. Redisから削除: `token:{token}`
3. レスポンス返却

---

#### 4. 患者情報取得

**エンドポイント**: `GET /api/v1/patients/{patient_id}/`

**目的**: 患者の基本情報を取得する（パスワード・メールアドレスを除く）。

**リクエスト**:
```http
GET /api/v1/patients/123e4567-e89b-12d3-a456-426614174000/
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**成功レスポンス (200 OK)**:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "山田太郎",
  "birth_date": "1990-01-01",
  "gender": "male",
  "admission_date": "2025-10-20",
  "created_at": "2025-10-25T10:00:00Z"
}
```

**セキュリティ**:
- パスワードとメールアドレスは返さない
- 自分の情報のみ取得可能（他患者の情報はアクセス拒否）

---

#### 5. 会話セッション開始

**エンドポイント**: `POST /api/v1/conversation/start/`

**目的**: 新しい会話セッションを開始し、Redisキャッシュを初期化する。

**リクエスト**:
```http
POST /api/v1/conversation/start/
Content-Type: application/json
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

{
  "patient_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**成功レスポンス (201 Created)**:
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "started_at": "2025-10-25T10:30:00Z",
  "status": "active"
}
```

**処理フロー**:
1. トークン認証
2. `patient_id`が認証ユーザーと一致するか確認
3. ConversationSessionレコード作成（`started_at`のみ設定）
4. Redisキャッシュ初期化: `session:{session_id}:text` → "" (TTL: 1時間)
5. レスポンス返却

---

#### 6. セッション通信（STT）

**エンドポイント**: `POST /api/v1/conversation/session/`

**目的**: 患者の音声データをリアルタイムでテキスト化し、Redisに蓄積する。

**リクエスト**:
```http
POST /api/v1/conversation/session/
Content-Type: application/json
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "audio_data": "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQo..."
}
```

**リクエストパラメータ**:
- `session_id`: セッションID
- `audio_data`: Base64エンコードされた音声データ（WebM/Opus形式）

**成功レスポンス (200 OK)**:
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "transcribed_text": "なんだかまた痛くなるんじゃないかって怖いんです",
  "accumulated_text": "今日は調子がいいです。でも、なんだかまた痛くなるんじゃないかって怖いんです",
  "confidence": 0.95
}
```

**処理フロー**:
1. トークン認証
2. セッションの存在確認・アクティブ状態確認
3. Base64デコード → 音声ファイル
4. **OpenAI Whisper API**でSTT実行
5. Redisキャッシュに追加: `APPEND session:{session_id}:text "{transcribed_text} "`
6. 累積テキスト取得: `GET session:{session_id}:text`
7. レスポンス返却

**OpenAI統合例**:
```python
from openai import OpenAI

def transcribe_audio(audio_data):
    """OpenAI Whisper APIで音声をテキスト化"""
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # 音声ファイルを一時保存
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
        temp_audio.write(audio_data)
        temp_audio_path = temp_audio.name

    # Whisper APIで文字起こし
    with open(temp_audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="ja"
        )

    # 一時ファイル削除
    os.unlink(temp_audio_path)

    return transcript.text, 1.0  # confidenceは常に1.0を返す
```

---

#### 7. 会話終了・保存・解析

**エンドポイント**: `POST /api/v1/sessions/{session_id}/end/`

**目的**: 会話を終了し、LLMで応答生成・感情分析を行い、結果をDBに保存する。

**リクエスト**:
```http
POST /api/v1/sessions/987fcdeb-51a2-43d7-89ab-123456789abc/end/
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**成功レスポンス (200 OK)**:
```json
{
  "session_id": "987fcdeb-51a2-43d7-89ab-123456789abc",
  "patient_text": "今日は調子がいいです。でも、なんだかまた痛くなるんじゃないかって怖いんです",
  "ai_response_text": "怖い気持ちが強いのですね。何が一番不安ですか？",
  "ai_audio_url": "https://storage.example.com/audio/session_987fcdeb.mp3",
  "emotion": {
    "id": "emotion-fear-uuid",
    "name": "fear",
    "name_ja": "恐れ"
  },
  "emotion_reason": "患者は痛みの再発を恐れており、不安感が強く表れています。",
  "ended_at": "2025-10-25T10:35:00Z"
}
```

**処理フロー**:

1. **トークン認証**
2. **セッション存在確認**
3. **Redisから会話テキスト取得**
   ```python
   patient_text = cache.get(f"session:{session_id}:text") or ""
   ```

4. **LLMで並行処理実行**（OpenAI GPT-4o-mini）
   - 非批判的な応答生成
   - 52感情から最適な感情1つを選択
   - 感情選定理由の生成

   **LLMプロンプト例**:
   ```python
   prompt = f"""
   患者の会話テキスト: {patient_text}

   以下のタスクを同時に実行してください:
   1. 患者に対する非批判的で共感的な応答を生成してください（50文字以内）
   2. 患者の感情を以下の52感情から1つ選んでください: {emotions_list}
   3. その感情を選んだ理由を簡潔に説明してください（100文字以内）

   JSON形式で返答してください:
   {{
     "response": "応答テキスト",
     "emotion": "感情名（英語）",
     "reason": "感情選定理由"
   }}
   """
   ```

5. **感情マスターから感情取得**
   ```python
   emotion = Emotion.objects.get(name=llm_result['emotion'])
   ```

6. **TTS音声生成**（OpenAI TTS）
   ```python
   audio_url = tts_service.generate(llm_result['response'])
   ```

7. **DB保存**
   ```python
   session.ended_at = timezone.now()
   session.patient_text = patient_text
   session.ai_response_text = llm_result['response']
   session.emotion = emotion
   session.emotion_reason = llm_result['reason']
   session.save()
   ```

8. **Redisキャッシュクリア**
   ```python
   cache.delete(f"session:{session_id}:text")
   ```

9. **WebSocketでリアルタイム配信**（オプション）
   ```python
   channel_layer.group_send(
       f'session_{session_id}',
       {'type': 'session_response', 'data': response_data}
   )
   ```

10. **レスポンス返却**

**エラーハンドリング**:
```json
// 404 Not Found - セッション不存在
{
  "error": "session_not_found",
  "message": "指定されたセッションが見つかりません"
}

// 400 Bad Request - セッション既に終了
{
  "error": "session_already_ended",
  "message": "このセッションは既に終了しています"
}

// 500 Internal Server Error - LLM API エラー
{
  "error": "llm_processing_failed",
  "message": "感情分析処理に失敗しました。再試行してください"
}
```

---

#### 8. 患者の感情履歴取得

**エンドポイント**: `GET /api/v1/emotions/history/`

**目的**: 患者の過去の会話セッションの感情データを時系列で取得する。

**リクエスト**:
```http
GET /api/v1/emotions/history/?patient_id=123e4567&limit=10&before=2025-10-25T12:00:00Z
Authorization: Token a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**クエリパラメータ**:
| パラメータ | 必須 | 型 | デフォルト | 説明 |
|-----------|------|-----|-----------|------|
| patient_id | ✓ | UUID | - | 患者ID |
| limit | ✗ | integer | 20 | 取得件数（最大100） |
| before | ✗ | datetime | now() | この日時より前のデータを取得 |

**成功レスポンス (200 OK)**:
```json
{
  "patient_id": "123e4567-e89b-12d3-a456-426614174000",
  "count": 10,
  "next": "/api/v1/emotions/history/?patient_id=123e4567&limit=10&before=2025-10-24T10:00:00Z",
  "history": [
    {
      "session_id": "session-uuid-1",
      "started_at": "2025-10-25T10:30:00Z",
      "ended_at": "2025-10-25T10:35:00Z",
      "emotion": {
        "id": "emotion-uuid",
        "name": "fear",
        "name_ja": "恐れ"
      },
      "emotion_reason": "患者は痛みの再発を恐れており、不安感が強く表れています。",
      "patient_text": "なんだかまた痛くなるんじゃないかって怖いんです"
    },
    {
      "session_id": "session-uuid-2",
      "started_at": "2025-10-24T15:20:00Z",
      "ended_at": "2025-10-24T15:25:00Z",
      "emotion": {
        "id": "emotion-uuid-2",
        "name": "joy",
        "name_ja": "喜び"
      },
      "emotion_reason": "家族の訪問があり、明るい気持ちになっています。",
      "patient_text": "家族が来てくれて嬉しかったです"
    }
  ]
}
```

**処理フロー**:
1. トークン認証
2. `patient_id`が認証ユーザーと一致するか確認
3. 会話セッション取得（`ended_at IS NOT NULL`, `started_at < before`, 降順, limit）
4. 関連する感情データをJOIN
5. ページネーション対応
6. レスポンス返却

**SQL例**:
```sql
SELECT
  cs.id, cs.started_at, cs.ended_at, cs.patient_text, cs.emotion_reason,
  e.id AS emotion_id, e.name AS emotion_name, e.name_ja AS emotion_name_ja
FROM conversation_sessions cs
LEFT JOIN emotions e ON cs.emotion_id = e.id
WHERE cs.patient_id = '123e4567-e89b-12d3-a456-426614174000'
  AND cs.ended_at IS NOT NULL
  AND cs.started_at < '2025-10-25 12:00:00'
ORDER BY cs.started_at DESC
LIMIT 10;
```

---

## 認証・セキュリティ

### Token認証実装

**apps/core/authentication.py**

```python
import secrets
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.core.cache import cache
from apps.patients.models import Patient


class PatientTokenAuthentication(BaseAuthentication):
    """患者用Token認証

    Redisにトークンと患者IDを保存し、リクエストごとに検証。
    """

    def authenticate(self, request):
        """リクエストを認証する

        Args:
            request: DRF Request object

        Returns:
            tuple: (user, token) or None

        Raises:
            AuthenticationFailed: 認証失敗時
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header.startswith('Token '):
            return None

        token = auth_header.split(' ')[1]

        return self.authenticate_credentials(token)

    def authenticate_credentials(self, token):
        """トークンを検証し、患者を取得

        Args:
            token (str): 認証トークン

        Returns:
            tuple: (patient, token)

        Raises:
            AuthenticationFailed: トークン無効時
        """
        # Redisからpatient_idを取得
        patient_id = cache.get(f"token:{token}")

        if not patient_id:
            raise AuthenticationFailed('無効なトークンです')

        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            # トークンは存在するが患者が削除されている
            cache.delete(f"token:{token}")
            raise AuthenticationFailed('ユーザーが見つかりません')

        return (patient, token)


def generate_token():
    """セキュアなトークンを生成

    Returns:
        str: 32文字のランダム文字列
    """
    return secrets.token_urlsafe(24)[:32]


def save_token(patient_id, token, ttl=86400):
    """トークンをRedisに保存

    Args:
        patient_id (UUID): 患者ID
        token (str): トークン
        ttl (int): 有効期限（秒）デフォルト24時間
    """
    cache.set(f"token:{token}", str(patient_id), timeout=ttl)


def delete_token(token):
    """トークンをRedisから削除

    Args:
        token (str): トークン
    """
    cache.delete(f"token:{token}")
```

### パーミッション制御

**apps/core/permissions.py**

```python
from rest_framework.permissions import BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """自分のリソースのみ編集可能"""

    def has_object_permission(self, request, view, obj):
        # GETリクエストは許可
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # 患者モデルの場合
        if hasattr(obj, 'id'):
            return obj.id == request.user.id

        # セッションモデルの場合
        if hasattr(obj, 'patient'):
            return obj.patient.id == request.user.id

        return False


class IsPatientOwner(BasePermission):
    """患者本人のみアクセス可能"""

    def has_permission(self, request, view):
        patient_id = view.kwargs.get('patient_id') or view.kwargs.get('pk')

        if patient_id:
            return str(request.user.id) == str(patient_id)

        return True
```

### セキュリティチェックリスト

- [ ] **パスワード**: bcryptでハッシュ化（Django `make_password`）
- [ ] **Token**: 32文字ランダム文字列、Redis保存（TTL 24時間）
- [ ] **HTTPS**: 本番環境では必須
- [ ] **CORS**: フロントエンドオリジンのみ許可
- [ ] **レート制限**: ログイン・登録APIに適用
- [ ] **CSRFトークン**: POST/PUT/DELETEリクエストで検証
- [ ] **SQL Injection**: Django ORMで防御
- [ ] **XSS**: DRFのデフォルトエスケープで防御
- [ ] **個人情報**: ログに出力しない、暗号化通信

---

## 実装詳細

### Serializers

**apps/patients/serializers.py**

```python
from rest_framework import serializers
from .models import Patient
from apps.core.authentication import generate_token, save_token
import re


class PatientRegisterSerializer(serializers.ModelSerializer):
    """患者登録用シリアライザ"""

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    token = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'email', 'password',
            'birth_date', 'gender', 'admission_date',
            'created_at', 'token'
        ]
        read_only_fields = ['id', 'created_at', 'token']

    def validate_email(self, value):
        """メールアドレスのバリデーション"""
        # 小文字に正規化
        value = value.lower()

        # 重複チェック
        if Patient.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "このメールアドレスは既に登録されています"
            )

        return value

    def validate_password(self, value):
        """パスワードのバリデーション"""
        if len(value) < 8:
            raise serializers.ValidationError(
                "パスワードは8文字以上である必要があります"
            )

        # 英数字混在チェック
        if not re.search(r'[A-Za-z]', value) or not re.search(r'\d', value):
            raise serializers.ValidationError(
                "パスワードは英字と数字を含む必要があります"
            )

        return value

    def create(self, validated_data):
        """患者作成とトークン発行"""
        password = validated_data.pop('password')
        patient = Patient(**validated_data)
        patient.set_password(password)
        patient.save()

        # トークン生成・保存
        token = generate_token()
        save_token(patient.id, token)

        # トークンを追加して返す
        patient.token = token
        return patient


class PatientLoginSerializer(serializers.Serializer):
    """患者ログイン用シリアライザ"""

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, data):
        """認証検証"""
        email = data.get('email', '').lower()
        password = data.get('password', '')

        try:
            patient = Patient.objects.get(email=email)
        except Patient.DoesNotExist:
            raise serializers.ValidationError(
                "メールアドレスまたはパスワードが正しくありません"
            )

        if not patient.check_password(password):
            raise serializers.ValidationError(
                "メールアドレスまたはパスワードが正しくありません"
            )

        # トークン生成
        token = generate_token()
        save_token(patient.id, token)

        data['patient'] = patient
        data['token'] = token
        return data


class PatientSerializer(serializers.ModelSerializer):
    """患者情報取得用シリアライザ（機密情報除外）"""

    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'birth_date', 'gender',
            'admission_date', 'created_at'
        ]
        # email, password は除外
```

**apps/conversations/serializers.py**

```python
from rest_framework import serializers
from .models import ConversationSession
from apps.emotions.serializers import EmotionSerializer


class ConversationSessionCreateSerializer(serializers.ModelSerializer):
    """会話セッション作成用"""

    class Meta:
        model = ConversationSession
        fields = ['patient', 'started_at']

    def create(self, validated_data):
        """セッション作成時にRedisキャッシュ初期化"""
        from django.core.cache import cache
        from django.utils import timezone

        validated_data['started_at'] = timezone.now()
        session = super().create(validated_data)

        # Redisキャッシュ初期化
        cache.set(f"session:{session.id}:text", "", timeout=3600)

        return session


class ConversationSessionSerializer(serializers.ModelSerializer):
    """会話セッション詳細用"""

    emotion = EmotionSerializer(read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)

    class Meta:
        model = ConversationSession
        fields = [
            'id', 'patient', 'patient_name',
            'started_at', 'ended_at',
            'patient_text', 'ai_response_text',
            'emotion', 'emotion_reason',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AudioChunkSerializer(serializers.Serializer):
    """音声チャンクシリアライザ"""
    
    session_id = serializers.UUIDField()
    audio_data = serializers.CharField(help_text="Base64エンコードされた音声データ")

    def validate_audio_data(self, value):
        """音声データのバリデーション"""
        import base64

        # Data URL形式の場合、カンマ以降を取得
        if value.startswith('data:audio'):
            value = value.split(',', 1)[1] if ',' in value else value

        try:
            # Base64デコード確認
            decoded = base64.b64decode(value)
            if len(decoded) == 0:
                raise serializers.ValidationError("音声データが空です")
        except Exception as e:
            raise serializers.ValidationError(f"無効な音声データ形式です: {str(e)}")

        return value
```

**apps/emotions/serializers.py**

```python
from rest_framework import serializers
from .models import Emotion
from apps.conversations.models import ConversationSession


class EmotionSerializer(serializers.ModelSerializer):
    """感情マスターシリアライザ"""

    class Meta:
        model = Emotion
        fields = ['id', 'name', 'name_ja']


class EmotionHistorySerializer(serializers.Serializer):
    """感情履歴用シリアライザ"""

    session_id = serializers.UUIDField()
    started_at = serializers.DateTimeField()
    ended_at = serializers.DateTimeField()
    emotion = EmotionSerializer()
    emotion_reason = serializers.CharField()
    patient_text = serializers.CharField()
```

---

### Views

**apps/patients/views.py**

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Patient
from .serializers import (
    PatientRegisterSerializer,
    PatientLoginSerializer,
    PatientSerializer
)
from apps.core.authentication import delete_token


class PatientViewSet(viewsets.ModelViewSet):
    """患者ViewSet"""

    queryset = Patient.objects.all()

    def get_serializer_class(self):
        if self.action == 'register':
            return PatientRegisterSerializer
        elif self.action == 'login':
            return PatientLoginSerializer
        return PatientSerializer

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """患者新規登録

        POST /api/v1/patients/register/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()

        return Response({
            'id': patient.id,
            'name': patient.name,
            'email': patient.email,
            'birth_date': patient.birth_date,
            'gender': patient.gender,
            'admission_date': patient.admission_date,
            'created_at': patient.created_at,
            'token': patient.token
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """患者ログイン

        POST /api/v1/patients/login/
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        patient = serializer.validated_data['patient']
        token = serializer.validated_data['token']

        return Response({
            'id': patient.id,
            'name': patient.name,
            'email': patient.email,
            'token': token
        })

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """患者ログアウト

        POST /api/v1/patients/logout/
        """
        # Authorizationヘッダーからトークン取得
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Token '):
            token = auth_header.split(' ')[1]
            delete_token(token)

        return Response({'message': 'ログアウトしました'})

    def retrieve(self, request, pk=None):
        """患者情報取得

        GET /api/v1/patients/{id}/
        """
        # 本人確認
        if str(request.user.id) != str(pk):
            return Response(
                {'error': 'アクセス権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        patient = self.get_object()
        serializer = self.get_serializer(patient)
        return Response(serializer.data)
```

**apps/conversations/views.py**

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.cache import cache
from .models import ConversationSession
from .serializers import (
    ConversationSessionCreateSerializer,
    ConversationSessionSerializer,
    AudioChunkSerializer
)
from .services.conversation_pipeline import ConversationPipeline


class ConversationViewSet(viewsets.ViewSet):
    """会話ViewSet"""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='start')
    def start_session(self, request):
        """会話セッション開始

        POST /api/v1/conversation/start/
        """
        patient_id = request.data.get('patient_id')

        # 本人確認
        if str(request.user.id) != str(patient_id):
            return Response(
                {'error': 'アクセス権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ConversationSessionCreateSerializer(data={
            'patient': patient_id,
            'started_at': timezone.now()
        })
        serializer.is_valid(raise_exception=True)
        session = serializer.save()

        return Response({
            'session_id': session.id,
            'patient_id': session.patient.id,
            'started_at': session.started_at,
            'status': 'active'
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='session')
    def process_audio(self, request):
        """セッション通信（STT）

        POST /api/v1/conversation/session/
        """
        serializer = AudioChunkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data['session_id']
        audio_data = serializer.validated_data['audio_data']

        # セッション存在確認
        try:
            session = ConversationSession.objects.get(id=session_id)
        except ConversationSession.DoesNotExist:
            return Response(
                {'error': 'セッションが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 本人確認
        if session.patient.id != request.user.id:
            return Response(
                {'error': 'アクセス権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        # アクティブ確認
        if session.ended_at is not None:
            return Response(
                {'error': 'セッションは既に終了しています'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # STT処理
        from .services.stt_service import STTService
        stt_service = STTService()
        transcribed_text, confidence = stt_service.transcribe(audio_data)

        # Redisに追加
        cache_key = f"session:{session_id}:text"
        current_text = cache.get(cache_key, "")
        updated_text = f"{current_text} {transcribed_text}".strip()
        cache.set(cache_key, updated_text, timeout=3600)

        return Response({
            'session_id': str(session_id),
            'transcribed_text': transcribed_text,
            'accumulated_text': updated_text,
            'confidence': confidence
        })


class SessionViewSet(viewsets.ViewSet):
    """セッションViewSet"""

    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='end')
    def end_session(self, request, pk=None):
        """会話終了・保存・解析

        POST /api/v1/sessions/{session_id}/end/
        """
        session_id = pk

        # セッション存在確認
        try:
            session = ConversationSession.objects.get(id=session_id)
        except ConversationSession.DoesNotExist:
            return Response(
                {'error': 'セッションが見つかりません'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 本人確認
        if session.patient.id != request.user.id:
            return Response(
                {'error': 'アクセス権限がありません'},
                status=status.HTTP_403_FORBIDDEN
            )

        # アクティブ確認
        if session.ended_at is not None:
            return Response(
                {'error': 'セッションは既に終了しています'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 会話処理パイプライン実行
        pipeline = ConversationPipeline()
        try:
            result = pipeline.end_session(session_id)
        except Exception as e:
            return Response(
                {'error': 'LLM processing_failed', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(result)
```

**apps/emotions/views.py**

```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_datetime
from .models import Emotion
from .serializers import EmotionSerializer, EmotionHistorySerializer
from apps.conversations.models import ConversationSession


class EmotionViewSet(viewsets.ReadOnlyModelViewSet):
    """感情ViewSet"""

    queryset = Emotion.objects.all()
    serializer_class = EmotionSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def history(self, request):
        """患者の感情履歴取得

        GET /api/v1/emotions/history/?patient_id=xxx&limit=10&before=2025-10-25T12:00:00Z
        """
        patient_id = request.query_params.get('patient_id')
        limit = int(request.query_params.get('limit', 20))
        before = request.query_params.get('before')

        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=400
            )

        # 本人確認
        if str(request.user.id) != str(patient_id):
            return Response(
                {'error': 'アクセス権限がありません'},
                status=403
            )

        # 最大件数制限
        limit = min(limit, 100)

        # 会話セッション取得
        queryset = ConversationSession.objects.filter(
            patient_id=patient_id,
            ended_at__isnull=False  # 終了済みのみ
        ).select_related('emotion').order_by('-started_at')

        if before:
            before_dt = parse_datetime(before)
            queryset = queryset.filter(started_at__lt=before_dt)

        sessions = queryset[:limit]

        # シリアライズ
        history = []
        for session in sessions:
            history.append({
                'session_id': str(session.id),
                'started_at': session.started_at,
                'ended_at': session.ended_at,
                'emotion': EmotionSerializer(session.emotion).data if session.emotion else None,
                'emotion_reason': session.emotion_reason,
                'patient_text': session.patient_text
            })

        # ページネーション用next URL生成
        next_url = None
        if len(sessions) == limit:
            last_started = sessions[limit - 1].started_at.isoformat()
            next_url = f"/api/v1/emotions/history/?patient_id={patient_id}&limit={limit}&before={last_started}"

        return Response({
            'patient_id': patient_id,
            'count': len(history),
            'next': next_url,
            'history': history
        })
```

---

### Services

**apps/conversations/services/stt_service.py**

```python
import base64
import os
import tempfile
from django.conf import settings
from openai import OpenAI


class STTService:
    """OpenAI Whisper STTサービス"""

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)

    def transcribe(self, audio_chunk_base64):
        """音声をテキストに変換

        Args:
            audio_chunk_base64 (str): Base64エンコードされた音声データ

        Returns:
            tuple: (transcribed_text, confidence)
        """
        # Base64デコード
        if audio_chunk_base64.startswith('data:audio'):
            audio_chunk_base64 = audio_chunk_base64.split(',')[1]

        audio_data = base64.b64decode(audio_chunk_base64)

        # 音声ファイルを一時保存
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
            temp_audio.write(audio_data)
            temp_audio_path = temp_audio.name

        try:
            # OpenAI Whisper APIで文字起こし
            with open(temp_audio_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="ja"
                )

            return transcript.text, 1.0
        finally:
            # 一時ファイル削除
            os.unlink(temp_audio_path)
```

**apps/conversations/services/llm_service.py**

```python
import json
import openai
from django.conf import settings
from apps.emotions.models import Emotion


class LLMService:
    """OpenAI LLMサービス"""

    def __init__(self):
        self.client = openai.Client(api_key=settings.OPENAI_API_KEY)

    def analyze_conversation(self, patient_text):
        """会話テキストを分析し、応答と感情を生成

        Args:
            patient_text (str): 患者の会話テキスト

        Returns:
            dict: {
                'response': AI応答テキスト,
                'emotion': 感情名（英語）,
                'reason': 感情選定理由
            }
        """
        # 52感情のリスト取得
        emotions_list = list(Emotion.objects.values_list('name', flat=True))

        prompt = f"""
あなたは共感的で非批判的な医療AIアシスタントです。

患者の会話テキスト:
{patient_text}

以下のタスクを同時に実行してください:
1. 患者に対する共感的で非批判的な応答を生成してください（50文字以内）
2. 患者の感情を以下の52感情から1つ選んでください:
   {', '.join(emotions_list)}
3. その感情を選んだ理由を簡潔に説明してください（100文字以内）

JSON形式で返答してください:
{{
  "response": "応答テキスト",
  "emotion": "感情名（英語）",
  "reason": "感情選定理由"
}}
"""

        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "あなたは共感的な医療AIアシスタントです。"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        result = json.loads(response.choices[0].message.content)
        return result
```

**apps/conversations/services/tts_service.py**

```python
import os
import uuid
import openai
from django.conf import settings


class TTSService:
    """OpenAI TTSサービス"""

    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    def generate(self, text):
        """テキストを音声に変換

        Args:
            text (str): 音声化するテキスト

        Returns:
            str: 音声ファイルURL
        """
        # OpenAI TTS API呼び出し
        response = self.client.audio.speech.create(
            model="tts-1",
            voice="alloy",  # 落ち着いた声
            input=text
        )

        # 音声ファイルを保存（S3等）
        # 実装簡略化のため、ローカル保存例
        audio_filename = f"audio_{uuid.uuid4()}.mp3"
        audio_path = os.path.join(settings.MEDIA_ROOT, 'audio', audio_filename)

        os.makedirs(os.path.dirname(audio_path), exist_ok=True)
        response.stream_to_file(audio_path)

        # URLを返す
        audio_url = f"{settings.MEDIA_URL}audio/{audio_filename}"
        return audio_url
```

**apps/conversations/services/conversation_pipeline.py**

```python
import json
from django.core.cache import cache
from django.utils import timezone
from ..models import ConversationSession
from apps.emotions.models import Emotion
from .llm_service import LLMService
from .tts_service import TTSService


class ConversationPipeline:
    """会話処理パイプライン"""

    def __init__(self):
        self.llm_service = LLMService()
        self.tts_service = TTSService()

    def end_session(self, session_id):
        """会話終了処理

        Args:
            session_id (UUID): セッションID

        Returns:
            dict: 処理結果
        """
        # 1. Redisから会話テキスト取得
        cache_key = f"session:{session_id}:text"
        patient_text = cache.get(cache_key, "")

        if not patient_text:
            raise ValueError("会話テキストが見つかりません")

        # 2. LLMで応答と感情分析
        llm_result = self.llm_service.analyze_conversation(patient_text)

        # 3. 感情マスターから該当する感情を取得
        try:
            emotion = Emotion.objects.get(name=llm_result['emotion'])
        except Emotion.DoesNotExist:
            # フォールバック: neutral感情
            emotion = Emotion.objects.filter(name='neutral').first()

        # 4. TTS音声生成
        ai_audio_url = self.tts_service.generate(llm_result['response'])

        # 5. DB保存
        session = ConversationSession.objects.get(id=session_id)
        session.ended_at = timezone.now()
        session.patient_text = patient_text
        session.ai_response_text = llm_result['response']
        session.emotion = emotion
        session.emotion_reason = llm_result['reason']
        session.save()

        # 6. Redisキャッシュクリア
        cache.delete(cache_key)

        # 7. レスポンス構築
        result = {
            'session_id': str(session_id),
            'patient_text': patient_text,
            'ai_response_text': llm_result['response'],
            'ai_audio_url': ai_audio_url,
            'emotion': {
                'id': str(emotion.id),
                'name': emotion.name,
                'name_ja': emotion.name_ja
            },
            'emotion_reason': llm_result['reason'],
            'ended_at': session.ended_at.isoformat()
        }

        return result
```

---

## エラーハンドリング

### エラーレスポンス形式

全てのエラーは以下の統一形式で返却:

```json
{
  "error": "error_code",
  "message": "ユーザー向けエラーメッセージ",
  "details": {
    // オプション: 詳細情報
  }
}
```

### エラーコード一覧

| HTTPステータス | error_code | 説明 |
|---------------|-----------|------|
| 400 | validation_error | バリデーションエラー |
| 400 | session_already_ended | セッション既に終了 |
| 401 | authentication_failed | 認証失敗 |
| 403 | permission_denied | アクセス権限なし |
| 404 | not_found | リソース不存在 |
| 404 | session_not_found | セッション不存在 |
| 429 | rate_limit_exceeded | レート制限超過 |
| 500 | internal_server_error | サーバーエラー |
| 500 | llm_processing_failed | LLM処理失敗 |

### カスタム例外ハンドラ

**apps/core/exceptions.py**

```python
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """カスタム例外ハンドラ"""
    response = exception_handler(exc, context)

    if response is not None:
        # DRFのデフォルトエラーを統一形式に変換
        error_data = {
            'error': getattr(exc, 'default_code', 'error'),
            'message': str(exc),
        }

        if hasattr(exc, 'detail'):
            error_data['details'] = exc.detail

        response.data = error_data

    return response
```

**config/settings/base.py に追加**:
```python
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    ...
}
```

---

## Djangoディレクトリ構成

```
backend/
├── manage.py
├── config/                         # プロジェクト設定
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py                # 共通設定
│   │   ├── development.py         # 開発環境
│   │   └── production.py          # 本番環境
│   ├── urls.py
│   ├── routing.py                 # WebSocket routing
│   ├── asgi.py
│   └── wsgi.py
│
├── apps/                           # Djangoアプリケーション
│   ├── __init__.py
│   │
│   ├── core/                       # 共通ユーティリティ
│   │   ├── __init__.py
│   │   ├── models.py              # 抽象ベースモデル
│   │   ├── authentication.py      # Token認証
│   │   ├── permissions.py         # カスタムパーミッション
│   │   └── exceptions.py          # カスタム例外ハンドラ
│   │
│   ├── patients/                   # 患者管理
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── tests.py
│   │
│   ├── conversations/              # 会話管理
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── services/              # ビジネスロジック
│   │   │   ├── __init__.py
│   │   │   ├── stt_service.py     # OpenAI Whisper STT
│   │   │   ├── tts_service.py     # OpenAI TTS
│   │   │   ├── llm_service.py     # OpenAI GPT-4o-mini
│   │   │   └── conversation_pipeline.py
│   │   └── tests.py
│   │
│   ├── emotions/                   # 感情マスター管理
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── fixtures/
│   │   │   └── emotions.json      # 52感情マスターデータ
│   │   └── tests.py
│   │
│   └── staff/                      # スタッフ管理（優先度低）
│       ├── __init__.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       └── admin.py
│
├── media/                          # アップロードファイル
│   └── audio/                     # TTS音声ファイル
│
├── staticfiles/                    # 静的ファイル
│
├── .env                            # 環境変数（gitignore）
├── .env.example                   # 環境変数サンプル
├── pyproject.toml                 # uvプロジェクト設定
├── uv.lock                        # uvロックファイル
└── README.md
```

---

## 開発ワークフロー

### 1. 初期セットアップ

```bash
# 1. リポジトリクローン
cd /workspaces/emocare/backend

# 2. uvで依存関係インストール
uv sync

# 3. 環境変数設定
cp .env.example .env
# .envを編集してAPI キー等を設定
# 必須: OPENAI_API_KEY（STT/TTS/LLMで使用）

# 4. データベース作成・接続確認
# create_db.pyを使用してデータベースを作成
uv run python create_db.py

# PostgreSQLに接続してデータベースの存在を確認
psql -h ${DB_HOST:-db} -U ${DB_USER:-postgres} -c "\l" | grep emocare_db

# 5. データベースマイグレーション
uv run python manage.py makemigrations
uv run python manage.py migrate

# 6. 感情マスターデータ投入
uv run python manage.py seed_emotions

# 7. スーパーユーザー作成
uv run python manage.py createsuperuser

# 8. 開発サーバー起動

```
uv run daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### 2. 感情マスターデータの投入

プルチックの52感情をデータベースに投入する方法:

```bash
# 感情データをシード（初回セットアップ時）
uv run python manage.py seed_emotions

# 実行結果例:
# Created: joy (喜び)
# Created: trust (信頼)
# Created: fear (恐れ)
# ...
# Seeding complete: 52 created, 0 updated
# Total emotions in database: 52

# データが既に存在する場合は重複せずにスキップされます
# 日本語名が変更されている場合は自動更新されます
```

**確認方法**:
```bash
# Djangoシェルで確認
uv run python manage.py shell

>>> from apps.emotions.models import Emotion
>>> Emotion.objects.count()
52
>>> Emotion.objects.filter(name='joy').first()
<Emotion: 喜び (joy)>
>>> exit()

# または、Django管理画面で確認
# http://localhost:8000/admin/emotions/emotion/

```

### 3. データベース接続確認

データベースの接続状態を確認する手順:

```bash
# 1. create_db.pyでデータベースが正しく作成されているか確認
uv run python create_db.py
# 出力例: Database 'emocare_db' already exists (既存の場合)
# 出力例: Database 'emocare_db' created successfully (新規作成の場合)

# 2. PostgreSQLに直接接続してデータベース一覧を確認
psql -h ${DB_HOST:-db} -U ${DB_USER:-postgres} -l

# 3. 特定のデータベースに接続
psql -h ${DB_HOST:-db} -U ${DB_USER:-postgres} -d ${DB_NAME:-emocare_db}

# 4. Django経由でデータベース接続を確認
uv run python manage.py dbshell
# PostgreSQLプロンプトが表示されれば接続成功
# 終了: \q

# 5. Django管理コマンドでテーブル一覧を確認
uv run python manage.py dbshell -c "\dt"

# 6. Djangoのデータベース設定を確認
uv run python manage.py shell
# >>> from django.db import connection
# >>> connection.ensure_connection()
# >>> print(connection.settings_dict)
# >>> exit()
```

### 3. マイグレーションワークフロー

```bash
# モデル変更後
uv run python manage.py makemigrations

# マイグレーション確認
uv run python manage.py showmigrations

# マイグレーション実行
uv run python manage.py migrate

# マイグレーションのロールバック（必要時）
uv run python manage.py migrate app_name migration_name
```

### 4. テスト実行

```bash
# 全テスト実行
uv run python manage.py test

# 特定アプリのテスト
uv run python manage.py test apps.patients

# カバレッジ付きテスト
uv run coverage run --source='apps' manage.py test
uv run coverage report
```

### 5. Redisキャッシュ確認

```bash
# Redisクライアント接続
redis-cli

# キャッシュ確認
KEYS session:*
GET session:{session_id}:text

# トークン確認
KEYS token:*
GET token:{token}
```

---

## まとめ

本設計書では、以下を詳細に定義しました:

### データベース
- **4テーブル**: Patient, ConversationSession, Emotion, Staff
- **完全なモデル定義**: バリデーション、インデックス、メタ情報

### API
- **8エンドポイント**: 患者認証3、会話管理3、感情データ2
- **詳細な仕様**: リクエスト/レスポンス、エラーハンドリング、処理フロー

### 実装
- **Serializers**: バリデーションロジック込み
- **Views**: 権限制御、エラーハンドリング
- **Services**: STT/LLM/TTS統合

### セキュリティ
- Token認証（Redis）
- パスワードハッシュ化（bcrypt）
- 権限制御（本人確認）

次のステップ:
1. モデルマイグレーション実行
2. 認証システムテスト
3. STT/LLM/TTSサービス実装
4. WebSocket通信実装
5. フロントエンド連携テスト
