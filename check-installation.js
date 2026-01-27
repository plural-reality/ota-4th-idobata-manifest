#!/usr/bin/env node
/**
 * GitHub Apps インストール状況確認スクリプト
 * 
 * このスクリプトは、GitHub Appsのインストール状況を確認し、
 * 組織のリポジトリへのインストールが可能かどうかをチェックします。
 * 
 * 使用方法:
 *   node check-installation.js <pem-file-path>
 */

const fs = require('fs');
const path = require('path');

// 環境変数の読み込み
try {
  require('dotenv').config({ path: path.join(__dirname, 'idobata', '.env') });
} catch (error) {
  // dotenvがインストールされていない場合は無視
}

// @octokit/appの読み込み
// まず、ワークスペース内のnode_modulesを確認

let App;
const possiblePaths = [
  path.join(__dirname, 'idobata', 'policy-edit', 'mcp', 'node_modules', '@octokit', 'app'),
  path.join(__dirname, 'node_modules', '@octokit', 'app'),
];

let appPath = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    appPath = possiblePath;
    break;
  }
}

if (appPath) {
  App = require(appPath).App;
} else {
  try {
    App = require('@octokit/app').App;
  } catch (error) {
    console.error('❌ エラー: @octokit/app パッケージが見つかりません');
    console.error('   以下のコマンドでインストールしてください:');
    console.error('   cd idobata/policy-edit/mcp && npm install');
    process.exit(1);
  }
}

const APP_ID = process.env.GITHUB_APP_ID || '2737488';
const PRIVATE_KEY_PATH = process.argv[2] || process.env.GITHUB_APP_PRIVATE_KEY_PATH;
const TARGET_OWNER = process.env.GITHUB_TARGET_OWNER || 'plural-reality';
const TARGET_REPO = process.env.GITHUB_TARGET_REPO || 'ota-4th-idobata-manifest';

/**
 * 秘密鍵ファイルを読み込む
 */
function loadPrivateKey() {
  if (!PRIVATE_KEY_PATH) {
    console.error('❌ エラー: 秘密鍵ファイルのパスが指定されていません');
    console.error('使用方法: node check-installation.js <pem-file-path>');
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
 * すべてのインストールを取得
 */
async function getAllInstallations(app) {
  try {
    const response = await app.octokit.request('GET /app/installations');
    return response.data;
  } catch (error) {
    console.error('❌ エラー: インストール情報の取得に失敗しました:', error.message);
    if (error.response) {
      console.error('   レスポンス:', error.response.data);
    }
    return [];
  }
}

/**
 * インストールの詳細情報を取得
 */
async function getInstallationDetails(app, installationId) {
  try {
    const octokit = await app.getInstallationOctokit(installationId);
    const repos = await octokit.request('GET /installation/repositories');
    return repos.data.repositories;
  } catch (error) {
    console.error(`❌ エラー: インストール ${installationId} の詳細取得に失敗:`, error.message);
    return [];
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🔍 GitHub Apps インストール状況を確認します...\n');
  
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

  // すべてのインストールを取得
  console.log('📦 インストール一覧を取得しています...');
  const installations = await getAllInstallations(app);
  
  if (installations.length === 0) {
    console.log('⚠️  インストールが見つかりませんでした\n');
    console.log('💡 インストール方法:');
    console.log('   1. 組織のオーナー/管理者に依頼する（推奨）');
    console.log('   2. 個人アカウントのリポジトリにフォークしてインストール');
    console.log('   詳細は ORGANIZATION_INSTALLATION_GUIDE.md を参照してください\n');
    return;
  }

  console.log(`✅ ${installations.length} 件のインストールが見つかりました\n`);

  // 各インストールの詳細を確認
  let foundTarget = false;
  for (const installation of installations) {
    console.log(`📌 Installation ID: ${installation.id}`);
    console.log(`   アカウント: ${installation.account?.login || '不明'}`);
    console.log(`   タイプ: ${installation.account?.type || '不明'}`);
    console.log(`   状態: ${installation.suspended_at ? '停止中' : 'アクティブ'}`);
    
    // インストール先のリポジトリを確認
    try {
      const repos = await getInstallationDetails(app, installation.id);
      console.log(`   リポジトリ数: ${repos.length}`);
      
      if (repos.length > 0) {
        console.log('   リポジトリ一覧:');
        repos.slice(0, 10).forEach(repo => {
          const isTarget = repo.owner.login === TARGET_OWNER && repo.name === TARGET_REPO;
          const marker = isTarget ? ' ✅' : '';
          console.log(`     - ${repo.owner.login}/${repo.name}${marker}`);
        });
        if (repos.length > 10) {
          console.log(`     ... 他 ${repos.length - 10} 件`);
        }
        
        const hasTarget = repos.some(
          r => r.owner.login === TARGET_OWNER && r.name === TARGET_REPO
        );
        if (hasTarget) {
          foundTarget = true;
          console.log(`\n   🎉 対象リポジトリが見つかりました！`);
          console.log(`   💡 .envファイルに以下の値を設定してください:`);
          console.log(`      GITHUB_INSTALLATION_ID=${installation.id}`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  リポジトリ情報の取得に失敗: ${error.message}`);
    }
    
    console.log('');
  }

  if (!foundTarget) {
    console.log('⚠️  対象リポジトリへのインストールが見つかりませんでした\n');
    console.log('💡 解決方法:');
    console.log('   1. 組織のオーナー/管理者に依頼してインストールしてもらう');
    console.log('   2. 個人アカウントにフォークしてインストール（開発・テスト用）');
    console.log('   詳細は ORGANIZATION_INSTALLATION_GUIDE.md を参照してください\n');
  }
}

// スクリプトの実行
main().catch((error) => {
  console.error('❌ 予期しないエラーが発生しました:', error);
  if (error.response) {
    console.error('   レスポンス:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});
