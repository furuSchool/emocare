# emocare

## githubの使い方

CI/CDを利用するためデフォルトブランチはdevelopにしている。
mainブランチはリリース用に使う。動くまでがdevelopブランチで、動いたらmainにマージする。

## 開発方法

developブランチをチェックアウトして、そこから新しいブランチを切って開発する。
プルリクエストを作成して、レビューを受けてからdevelopにマージする。
プルリクエストは必ずレビューを受けること。自分でマージしないこと。
レビューは最低1人以上に依頼すること。自分で承認しないこと。

## 開発環境の要約

令和最新最速の開発環境を提供する。

Docker/Dockercompose/Devcontainer
uv + Ruff（Python側）
fnm + pnpm + Turbopack + Biome（Next.js側）
postgresql 

# インストール手順書　

以下の手順に従って開発環境はセットアップされている。
ただしこれは全てdevcontainer.jsonに組み込まれているので、devcontainerを使う場合はこの手順を踏む必要はない。

## フロントエンド インストール手順

```bash
# これをシェルの初期化ファイルに追加します。例えば、Bashを使用している場合は以下のようにします。
echo 'eval "$(fnm env)"' >> ~/.bashrc
```

### fnmの使用方法

```bash
# Node.jsのバージョンをインストールします。
fnm list-remote # 利用可能なNode.jsのバージョンを表示
fnm use -y v24.1.0 # 指定したバージョンを使用 .node-version ファイルがある場合は自動的にそのバージョンを使用します
fnm current # 現在使用しているNode.jsのバージョンを表示
```

### pnpmのインストール
frontディレクトリで
```bash
# pnpmをインストールします。
npm install -g pnpm@latest-10
pnpm install 
```


### フロントエンドのインストール
```bash 
npx create-next-app@latest front --disable-git 
```

## バックエンドインストール手順 (uv)

git initが起こらないようにする。

```bash
uv python install 3.11
uv python pin 3.11
uv init ai_agent
``` 

uvのシェル補完を有効にする
```bash 
echo 'eval "$(uv generate-shell-completion bash)"' >> ~/.bashrc
```


### pythonの構造作成
git init  が起こらないように作成

```bash 
uv init back --vcs none --app 

```

### バックエンドのインストール

backディレクトリに移動して、DjangoとDjango REST frameworkをインストールします。
```bash
uv sync
```

backエンドでインタプリンタとシンタックスハイライトが動作しなければ、コマンドパレットから「Python:Select interpreter」を実行します。


あとでdevconatainer.jsonに追加してなにもしなくても動くようにする。

### [重要] バックエンドの起動

バックエンドを起動するには、backディレクトリで以下のコマンドを実行します。


```bash
uv run daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### データベース（PostgreSQL）の起動と初期化

#### データベースサーバーの起動

```bash
sudo service postgresql start
```

#### データベースの初期化とマイグレーション

初回のみ、データベースを作成してマイグレーションを実行します：

```bash
cd backend
source .venv/bin/activate

# マイグレーションを実行
python manage.py migrate
```

#### サンプルデータの投入（Seedデータ）

データベースにサンプルデータを投入します：

```bash
cd backend
source .venv/bin/activate

# Seedデータを投入
python manage.py seed
```

このコマンドで以下のデータが投入されます：
- 感情データ（プルチックの52感情）: 49件
- 患者データ（サンプル患者）: 5人
- 会話セッションデータ（サンプル会話）: 8件

**注意**: 患者IDは数値型（AutoField）のため、数値の昇順に格納される。フロントエンドにて、id=2の患者の会話記録が見たい場合は以下のように、URLを指定する。

```
http://localhost:3000/doctors/patients/2/emotions?order=asc&limit=25
```

#### 起動しているPostgreSQLから登録されている会話記録がある患者のIDをCLIから確認する方法

##### 方法1: psqlコマンドで直接確認（推奨・最も簡単）

```bash
# 全患者を表示
sudo -u postgres psql -d devdb -c "SELECT id, name, email FROM patients;"

# 会話記録がある患者とセッション数を表示
sudo -u postgres psql -d devdb -c "
SELECT
  p.id as patient_id,
  p.name as patient_name,
  p.email,
  COUNT(cs.id) as session_count,
  MIN(cs.started_at) as first_session,
  MAX(cs.started_at) as last_session
FROM patients p
LEFT JOIN conversation_sessions cs ON p.id = cs.patient_id
GROUP BY p.id, p.name, p.email
HAVING COUNT(cs.id) > 0
ORDER BY session_count DESC;
"
```

##### 方法2: Djangoシェルを使う

```bash
cd backend
source .venv/bin/activate
python manage.py shell
```

シェル内で以下を実行：

```python
from apps.patients.models import Patient
from apps.conversations.models import ConversationSession

# 全患者を表示
for patient in Patient.objects.all():
    print(f"ID: {patient.id}, 名前: {patient.name}, メール: {patient.email}")

# 会話記録がある患者を表示
from django.db.models import Count
patients_with_sessions = Patient.objects.annotate(
    session_count=Count('conversationsession')
).filter(session_count__gt=0)

for patient in patients_with_sessions:
    print(f"ID: {patient.id}, 名前: {patient.name}, セッション数: {patient.session_count}")
```

##### 方法3: PostgreSQL CLIに対話的に接続

```bash
# PostgreSQLに接続
sudo -u postgres psql -d devdb

# SQLコマンドを実行
SELECT id, name, email FROM patients;

# 終了
\q
```

# デプロイ

## フロントエンド

Vercelにより、CI/CDを統合したデプロイを行う。

