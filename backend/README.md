# ECAI Backend - Django REST Framework API

Empathic Care AI（ECAI）のバックエンドAPI。

## 技術スタック

- **Python**: 3.12+
- **Framework**: Django 5.2+ / Django REST Framework 3.16+
- **Database**: PostgreSQL 15+
- **Package Manager**: uv
- **Task Queue**: Celery + Redis
- **WebSocket**: Django Channels


## セットアップ

### 1. uvのインストール

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 依存関係のインストール

```bash
cd backend
uv sync
```

### 3. 環境変数の設定

```bash
cp .env.example .env
# .envファイルを編集して、データベース接続情報などを設定
```

**重要**: Docker Composeを使用している場合、データベースホストは `db` に設定してください。
```bash
DB_HOST=db
DB_NAME=devdb
DB_USER=postgres
DB_PASSWORD=postgres
```

### 4. データベースのマイグレーション

`.env`ファイルの環境変数を読み込んでマイグレーションを実行します：

```bash
# 仮想環境をアクティブ化してからコマンドを実行
source .venv/bin/activate

# 環境変数を明示的に指定してマイグレーション実行
DB_HOST=db DB_NAME=devdb DB_USER=postgres DB_PASSWORD=postgres \
python manage.py makemigrations

DB_HOST=db DB_NAME=devdb DB_USER=postgres DB_PASSWORD=postgres \
python manage.py migrate
```

または、環境変数を一度エクスポートしてから実行：

```bash
source .venv/bin/activate
export DB_HOST=db
export DB_NAME=devdb
export DB_USER=postgres
export DB_PASSWORD=postgres

python manage.py makemigrations
python manage.py migrate
```

### 5. スーパーユーザーの作成

```bash
source .venv/bin/activate
export DB_HOST=db DB_NAME=devdb DB_USER=postgres DB_PASSWORD=postgres
python manage.py createsuperuser
```

### 6. 開発サーバーの起動

**WebSocket対応のため、Daphneを使用してサーバーを起動します：**

```bash
source .venv/bin/activate
export DB_HOST=db
export DB_NAME=devdb
export DB_USER=postgres
export DB_PASSWORD=postgres
uv run daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

API: http://localhost:8000/api/v1/
管理画面: http://localhost:8000/admin/

## 開発コマンド

### マイグレーション

**注意**: すべてのコマンドは環境変数を設定した状態で実行してください。

```bash
# 仮想環境をアクティブ化
source .venv/bin/activate

# 環境変数をエクスポート（セッション中は一度だけでOK）
export DB_HOST=db
export DB_NAME=devdb
export DB_USER=postgres
export DB_PASSWORD=postgres

# マイグレーションファイル作成
python manage.py makemigrations

# マイグレーション実行
python manage.py migrate

# マイグレーション確認
python manage.py showmigrations

# 特定のアプリのマイグレーション作成
python manage.py makemigrations patients
```

### テスト

```bash
# 環境変数設定済みの状態で実行
source .venv/bin/activate
export DB_HOST=db DB_NAME=devdb DB_USER=postgres DB_PASSWORD=postgres

# 全テスト実行
python manage.py test

# 特定アプリのテスト
python manage.py test apps.patients

# カバレッジ付きテスト（要coverage インストール）
coverage run --source='.' manage.py test
coverage report
```

### Django Shell

```bash
source .venv/bin/activate
export DB_HOST=db DB_NAME=devdb DB_USER=postgres DB_PASSWORD=postgres
python manage.py shell
```

### 静的ファイル収集

```bash
source .venv/bin/activate
export DB_HOST=db DB_NAME=devdb DB_USER=postgres DB_PASSWORD=postgres
python manage.py collectstatic
```

## 依存関係の追加

```bash
# パッケージ追加
uv add package-name

# 開発用パッケージ追加
uv add --dev package-name
```

## 環境変数

主な環境変数（`.env.example`参照）:

- `DJANGO_SECRET_KEY`: Djangoシークレットキー
- `DB_HOST`: データベースホスト（Docker Compose使用時は `db`）
- `DB_NAME`: データベース名（Docker Compose使用時は `devdb`）
- `DB_USER`: データベースユーザー（通常 `postgres`）
- `DB_PASSWORD`: データベースパスワード
- `DB_PORT`: データベースポート（デフォルト `5432`）
- `OPENAI_API_KEY`: OpenAI API キー（STT/TTS/LLM用）
- `REDIS_URL`: Redis接続URL

### Docker Compose使用時の設定例

`.devcontainer/docker-compose.yml`でPostgreSQLコンテナを使用している場合：

```bash
DB_HOST=db
DB_NAME=devdb
DB_USER=postgres
DB_PASSWORD=postgres
DB_PORT=5432
```

### ローカルPostgreSQL使用時の設定例

ローカルにインストールされたPostgreSQLを使用する場合：

```bash
DB_HOST=localhost
DB_NAME=emocare_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432
```

## トラブルシューティング

### データベース接続エラー

`django.db.utils.OperationalError: connection refused` エラーが出る場合：

1. 環境変数が正しく設定されているか確認
   ```bash
   echo $DB_HOST $DB_NAME $DB_USER
   ```

2. Docker ComposeのPostgreSQLコンテナが起動しているか確認
   ```bash
   docker ps | grep postgres
   # または
   PGPASSWORD=postgres psql -h db -U postgres -d devdb -c "SELECT 1;"
   ```

3. `.env`ファイルの設定を確認
   ```bash
   cat .env | grep DB_
   ```

