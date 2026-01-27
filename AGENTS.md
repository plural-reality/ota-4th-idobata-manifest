# Repository Guidelines

## プロジェクト構成とモジュール
- ルート直下に `frontend`（idea-discussion の React UI）、`policy-edit`（Policy Editor の frontend/backend/mcp）、`idea-discussion`（旧討論モジュール）、`python-service`、`admin`、`docs`、`docker-compose.yml`、`Makefile` が並んでいます。
- `policy-edit` はさらに `frontend`、`backend`、`mcp` に分かれ、各々が独立した `package.json` を持つ TypeScript + Biome/Vitest プロジェクトです。バイナリや設定は `policy-edit/backend/secrets/github-key.pem` や追加の `.env` で制御します。
- 開発ガイド・進捗は `docs/development-setup.md`、`docs/CONTRIBUTING.md`、`docs/project_status.md` に集約。実際の提案書はルートや `太田市提案書.md` のような Markdown で管理されます。

## ビルド・テスト・開発コマンド
- `docker compose up --build -d` で全サービス（frontend, policy-edit, idea-discussion, python-service 等）を起動。個別には `docker compose up policy-frontend policy-backend`、`docker compose up frontend idea-backend mongo admin` などを使い分けます。
- ルート `Makefile` には `make containers-start`/`make containers-stop`、`make lint`/`make test`/`make format`（各ディレクトリの `npm run {lint,test,format}` を順に実行）などショートカットがそろっています。
- 各パッケージでは `npm run dev`（Vite/Nodemon）、`npm run build`（tsc+Vite ビルド）、`npm run lint`（Biome）、`npm run test`（Vitest）、`npm run format`（Biome --write）を実行可能です。`make policy-edit-frontend-test` などを使えば該当ディレクトリでまとめて動きます。

## コーディングスタイルと命名規則
- TypeScript/React/Node.js のコードは **スペース2つ**、セミコロン省略、宣言は `const/let`、JSX は `PascalCase` コンポーネント命名、関数や変数は `camelCase` で統一しています。Markdown や設定ファイルは `snake_case`/`kebab-case` のファイル名を採用。
- フォーマットと静的解析は Biome: `npm run lint`（`biome check .`）と `npm run format`（`biome check --write .`）を実行し、コミット前に整形を済ませてください。
- 新しいユーティリティや API は明示的な名前空間（例: `policy-edit/backend/src/routes/chat.ts`）を意識し、関連するモジュールの `index.ts` でエクスポートを統一します。

## テストガイドライン
- テストランナーは Vitest。各パッケージの `npm run test`（`vitest run --passWithNoTests`）を実行し、テストがない場合も成功扱いになります。
- `make test` は全サービスのテストをまとめて走らせるので、差分を提出する前に `make test` または対象パッケージの `npm run test` を通すこと。
- テストファイルは `*.test.ts`/`*.spec.tsx` 形式で、対象コンポーネント名を含む説明的なクラス名にしてください。

## コミット＆プルリクエスト
- 作業前に Issue がない場合は `docs/CONTRIBUTING.md` のステップに沿って Issue を起票し、メンテナや他の参加者からリアクション（`good first issue` など）を得てから着手します。
- PR は `main` からブランチを切り、変更点・関連 Issue・テスト結果を日本語で記載してください。UI 変更がある場合はスクリーンショットや GIF を添えるとレビューがスムーズです。PR テンプレートの CLA 同意手順に従い、必要なら `CLA.md` へ同意済みコメントを付けます。
- コミットメッセージは簡潔な命令形（例: `fix: 説明` `feat: 新規...`）とし、「WIP」はマージ前に外しておきます。CI/レビューで指摘された点は逐次対応し、必要なリビジョンを PR コメントで通知してください。
- 疑問点は `docs/CONTRIBUTING.md` にある Slack `開発_idobata` チャンネルや、PR コメントでメンテナーに相談。承認を得たら該当メンテナーがマージまたは本人でマージします。

## 環境変数と設定
- `.env.template` をコピーして `.env` にし、`OPENROUTER_API_KEY`、`GITHUB_APP_ID` などを設定します。`policy-edit/backend/secrets/github-key.pem` には GitHub App の秘密鍵を配置し、実運用リポジトリへ鍵や `.env` を push しないでください。
- `docker-compose.yml` は `.env` を参照するため、各サービスを起動する前に `cp .env.template .env` で正しい値を設定し、`docker compose down` で停止したら再起動前に `docker compose build` でリビルドしてキャッシュを更新します。
