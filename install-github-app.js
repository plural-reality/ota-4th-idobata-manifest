#!/usr/bin/env node
/**
 * GitHub Apps インストールスクリプト
 * 
 * このスクリプトは、GitHub Appsを特定のリポジトリにインストールし、
 * Installation IDを取得するためのツールです。
 * 
 * 使用方法:
 *   node install-github-app.js
 * 
 * 必要な環境変数:
 *   - GITHUB_APP_ID: GitHub AppのID
 *   - GITHUB_APP_PRIVATE_KEY_PATH: 秘密鍵ファイル（.pem）のパス
 *   - GITHUB_TARGET_OWNER: インストール先のリポジトリオーナー
 *   - GITHUB_TARGET_REPO: インストール先のリポジトリ名
 */

const fs = require('fs');
const path = require('path');

// 環境変数の読み込み
try {
  require('dotenv').config({ path: path.join(__dirname, 'idobata', '.env') });
} catch (error) {
  // dotenvがインストールされていない場合は無視
}

// @octokit/appの読み込み（オプショナル）
let App;
try {
  const octokitApp = require('@octokit/app');
  App = octokitApp.App || octokitApp.default?.App || octokitApp;

  if (!App || typeof App !== 'function') {
    throw new Error('App constructor not found');
  }
} catch (error) {
  console.error('❌ エラー: @octokit/app パッケージが見つかりません');
  console.error('   エラー詳細:', error.message);
  console.error('   以下のコマンドでインストールしてください:');
  console.error('   npm install @octokit/app dotenv');
  process.exit(1);
}

const APP_ID = process.env.GITHUB_APP_ID || '2737488';
const PRIVATE_KEY_PATH = process.env.GITHUB_APP_PRIVATE_KEY_PATH || process.argv[2];
const TARGET_OWNER = process.env.GITHUB_TARGET_OWNER || 'plural-reality';
const TARGET_REPO = process.env.GITHUB_TARGET_REPO || 'ota-4th-idobata-manifest';

/**
 * 秘密鍵ファイルを読み込む
 */
function loadPrivateKey() {
  if (!PRIVATE_KEY_PATH) {
    console.error('❌ エラー: 秘密鍵ファイルのパスが指定されていません');
    console.error('使用方法: node install-github-app.js <pem-file-path>');
    console.error('または、環境変数 GITHUB_APP_PRIVATE_KEY_PATH を設定してください');
    process.exit(1);
  }

  const keyPath = path.resolve(PRIVATE_KEY_PATH);
  
  if (!fs.existsSync(keyPath)) {
    console.error(`❌ エラー: 秘密鍵ファイルが見つかりません: ${keyPath}`);
    process.exit(1);
  }

  try {
    return fs.readFileSync(keyPath, 'utf8');
  } catch (error) {
    console.error(`❌ エラー: 秘密鍵ファイルの読み込みに失敗しました: ${error.message}`);
    process.exit(1);
  }
}

/**
 * インストール済みのリポジトリを確認
 */
async function checkExistingInstallation(app, owner, repo) {
  try {
    const installations = await app.octokit.request('GET /app/installations');
    
    for (const installation of installations.data) {
      // インストール先のリポジトリを確認
      const repos = await app.octokit.request(
        'GET /installation/repositories',
        {
          installation_id: installation.id,
        }
      );
      
      const hasTargetRepo = repos.data.repositories.some(
        (r) => r.owner.login === owner && r.name === repo
      );
      
      if (hasTargetRepo) {
        return installation;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ エラー: インストール情報の取得に失敗しました:', error.message);
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 GitHub Apps インストールスクリプトを開始します...\n');
  
  console.log('📋 設定情報:');
  console.log(`   App ID: ${APP_ID}`);
  console.log(`   対象リポジトリ: ${TARGET_OWNER}/${TARGET_REPO}`);
  console.log(`   秘密鍵パス: ${PRIVATE_KEY_PATH || '未指定'}\n`);

  // 秘密鍵の読み込み
  console.log('🔑 秘密鍵を読み込んでいます...');
  const privateKey = loadPrivateKey();
  console.log('✅ 秘密鍵の読み込みが完了しました\n');

  // GitHub Appの初期化
  console.log('🔧 GitHub Appを初期化しています...');
  const app = new App({
    appId: APP_ID,
    privateKey: privateKey,
  });
  console.log('✅ GitHub Appの初期化が完了しました\n');

  // 既存のインストールを確認
  console.log('🔍 既存のインストールを確認しています...');
  const existingInstallation = await checkExistingInstallation(
    app,
    TARGET_OWNER,
    TARGET_REPO
  );

  if (existingInstallation) {
    console.log('✅ 既にインストールされています！\n');
    console.log('📌 Installation ID:', existingInstallation.id);
    console.log(`📌 インストールURL: https://github.com/settings/installations/${existingInstallation.id}\n`);
    console.log('💡 .envファイルに以下の値を設定してください:');
    console.log(`   GITHUB_INSTALLATION_ID=${existingInstallation.id}`);
    return;
  }

  console.log('ℹ️  既存のインストールが見つかりませんでした\n');
  console.log('📝 手動インストールの手順:');
  console.log('   1. 以下のURLにアクセスしてください:');
  console.log(`      https://github.com/settings/apps/${APP_ID}`);
  console.log('   2. 左サイドバーの "Install App" をクリック');
  console.log('   3. "Only select repositories" を選択');
  console.log(`   4. "${TARGET_OWNER}/${TARGET_REPO}" を選択`);
  console.log('   5. "Install" をクリック');
  console.log('   6. インストール後、URLの末尾の数字が Installation ID です\n');
  console.log('   または、以下のコマンドでインストール情報を確認できます:');
  console.log(`   node install-github-app.js ${PRIVATE_KEY_PATH}`);
}

// スクリプトの実行
main().catch((error) => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});
