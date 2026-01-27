#!/bin/bash

# 設定
APP_ID="2737488"
PEM_FILE="./ota-4th-idobata-manifest.2026-01-26.private-key.pem"

echo "🚀 GitHub App インストールチェックを開始します..."
echo ""
echo "📋 設定情報:"
echo "   App ID: $APP_ID"
echo "   秘密鍵: $PEM_FILE"
echo ""

# JWTトークンを生成（Node.jsを使用）
echo "🔐 JWTトークンを生成しています..."
JWT=$(node -e "
const fs = require('fs');
const crypto = require('crypto');
const appId = '$APP_ID';
const privateKey = fs.readFileSync('$PEM_FILE', 'utf8');
const now = Math.floor(Date.now() / 1000);
const payload = {
  iat: now - 60,
  exp: now + (10 * 60),
  iss: appId
};
const header = { alg: 'RS256', typ: 'JWT' };
const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature = crypto.createSign('RSA-SHA256').update(encodedHeader + '.' + encodedPayload).sign(privateKey, 'base64url');
console.log(encodedHeader + '.' + encodedPayload + '.' + signature);
")

if [ -z "$JWT" ]; then
  echo "❌ JWTトークンの生成に失敗しました"
  exit 1
fi

echo "✅ JWTトークンの生成が完了しました"
echo ""

# インストール一覧を取得
echo "🔍 インストール一覧を取得しています..."
RESPONSE=$(curl -s -H "Authorization: Bearer $JWT" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/app/installations)

echo "✅ レスポンス受信完了"
echo ""
echo "📌 インストール情報:"
echo "$RESPONSE" | jq -r '.[] | "ID: \(.id), Account: \(.account.login), Type: \(.account.type)"'
echo ""

# 対象アカウントのインストールを確認
INSTALLATION_ID=$(echo "$RESPONSE" | jq -r '.[] | select(.account.login == "tkgshn") | .id')

if [ -n "$INSTALLATION_ID" ]; then
  echo "✅ 個人アカウント 'tkgshn' へのインストールが見つかりました！"
  echo ""
  echo "💡 .envファイルに以下の値を設定してください:"
  echo "   GITHUB_INSTALLATION_ID=$INSTALLATION_ID"
  echo ""
  echo "   設定方法:"
  echo "   echo 'GITHUB_INSTALLATION_ID=$INSTALLATION_ID' >> idobata/.env"
else
  echo "⚠️  個人アカウント 'tkgshn' へのインストールが見つかりませんでした"
  echo ""
  echo "📝 手動インストールの手順:"
  echo "   1. 以下のURLにアクセスしてください:"
  echo "      https://github.com/apps/idobata-comment-integration/installations/new"
  echo "   2. 個人アカウント 'tkgshn' を選択"
  echo "   3. 'Only select repositories' を選択"
  echo "   4. 'ota-4th-idobata-manifest' を選択"
  echo "   5. 'Install' をクリック"
fi
