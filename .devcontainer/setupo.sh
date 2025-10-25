#!/usr/bin/env bash
set -euxo pipefail

echo "DevContainer 環境セットアップ開始: $(date)"

# ---------- 共通設定 ----------
cd /workspaces/emocare

# uv 補完設定（重複を避けて追加）
if ! grep -q 'uv generate-shell-completion' ~/.bashrc; then
  echo 'eval "$(uv generate-shell-completion bash)"' >> ~/.bashrc
fi

# ---------- Backend: Python ----------
if [ -d "back" ]; then
  echo "🐍 Python Backend Setup 開始..."
  cd back

  # 依存関係を同期
  if command -v uv &> /dev/null; then
    uv sync
  else
    echo "uv が見つかりません。pip 経由で暫定インストールしません"
  fi
  cd ..
else
  echo "back ディレクトリが見つかりません。スキップします。"
fi

# ---------- Frontend: Node.js ----------
if [ -d "front" ]; then
  echo "Frontend Setup 開始..."
  cd front

  # fnm 環境を有効化
  if command -v fnm &> /dev/null; then
    eval "$(fnm env)"
    fnm install v24.1.0 || true
    fnm use -- v24.1.0 
  else
    echo "fnm が見つかりません。スキップします"
  fi

  # pnpm のインストール（グローバル）
  if ! command -v pnpm &> /dev/null; then
    echo "pnpm をインストール中..."
    npm install -g pnpm@latest-10
  fi

  # 依存関係インストール
  pnpm install
  cd ..
else
  echo "front ディレクトリが見つかりません。スキップします。"
fi

# ---------- Claude Code CLI ----------
if ! command -v claude &> /dev/null; then
  echo "Claude Code CLI をインストール中..."
  curl -fsSL https://claude.ai/install.sh | bash
  # PATHを更新（インストールスクリプトが~/.bashrcに追加する）
  export PATH="$HOME/.local/bin:$PATH"
else
  echo "Claude Code CLI は既にインストールされています。"
fi

# ---------- Summary ----------
echo "すべてのセットアップが完了しました！"
echo "Python / Node / pnpm / uv / fnm / Claude Code CLI が自動構築されました。"
