# STEM Bot - Discord ニックネーム設定ボット

Discord サーバーでユーザーのニックネームを自動設定するボットです。ユーザーのロール（現役部員 or OB）に基づいて適切なフォーマットでニックネームを設定します。

TypeScript で開発されており、Discord.js v14 を使用しています。Koyeb での本番デプロイにも対応しています。

## 機能

- `/name` スラッシュコマンドによるニックネーム設定
- モーダルポップアップでの情報入力
- ユーザーロールの自動判定（現役部員 vs OB）
- 入力値の検証（学籍番号・期生）
- 適切なフォーマットでのニックネーム変更
- **Koyeb対応**: ヘルスチェックサーバー内蔵、定期的なセルフpingでスリープ防止

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成し、必要な値を設定してください：

```env
DISCORD_TOKEN=あなたのボットトークン
CLIENT_ID=アプリケーションID
GUILD_ID=サーバーID
CURRENT_MEMBER_ROLE_ID=現役部員ロールID
OB_ROLE_ID=OBロールID

# Koyeb設定（本番環境のみ）
PORT=8000
HEALTH_CHECK_URL=https://your-app-name.koyeb.app
```

### 3. Discord Bot の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. Bot タブでボットを作成し、トークンを取得
3. General Information タブで Application ID (CLIENT_ID) を取得
4. OAuth2 タブで以下の権限を設定：
   - `applications.commands` (スラッシュコマンド)
   - `bot` (ボット機能)
5. Bot Permissions で以下を選択：
   - `Manage Nicknames` (ニックネーム管理)
   - `Use Slash Commands` (スラッシュコマンド使用)

### 4. ボットの招待

OAuth2 URL Generator で生成されたリンクを使用してボットをサーバーに招待してください。

### 5. スラッシュコマンドの登録

**重要**: ボットを起動する前に、まずスラッシュコマンドを登録する必要があります：

```bash
npm run deploy
```

## 使用方法

### コマンド

- `/name` - ニックネーム設定モーダルを表示

### ニックネームフォーマット

- **現役部員**: `本名(学籍番号)` (例: `山田太郎(12345)`)
- **OB**: `本名(第○期卒業生)` (例: `田中花子(第5期卒業生)`)

### 入力検証

- **学籍番号**: 10101-30940 の範囲
- **期生**: 2以上の数字

## 実行

```bash
# TypeScriptをコンパイル
npm run build

# 本番環境で実行（Koyeb用）
npm start

# 開発環境で実行（TypeScript直接実行）
npm run dev

# スラッシュコマンドの登録/更新
npm run deploy
```

## Koyebデプロイ

### ヘルスチェック機能
- **ヘルスチェックエンドポイント**: `http://localhost:8000/`
- **自動スリープ防止**: 10分間隔で自己pingを実行
- **稼働状況監視**: JSON形式でステータス情報を返却

### 環境変数設定（Koyeb）
Koyebのダッシュボードで以下の環境変数を設定してください：

```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
CURRENT_MEMBER_ROLE_ID=your_current_member_role_id
OB_ROLE_ID=your_ob_role_id
PORT=8000
HEALTH_CHECK_URL=https://your-app-name.koyeb.app
```

## プロジェクト構造

```
stem_Bot/
├── src/
│   ├── index.ts                # メインボットファイル
│   ├── deploy-commands.ts      # スラッシュコマンド登録スクリプト
│   ├── server.ts              # Koyeb用ヘルスチェックサーバー
│   ├── cron.ts                # 定期ヘルスチェック機能
│   └── config.ts              # 設定ファイル
├── dist/                       # コンパイル後のJavaScriptファイル
├── package.json               # npm 設定
├── tsconfig.json              # TypeScript設定
├── .env.example              # 環境変数のテンプレート
├── .env                      # 実際の環境変数（gitignoreに含める）
├── README.md                 # このファイル
└── .github/
    └── copilot-instructions.md  # Copilot向けの指示
```

## 注意事項

- ボットには「ニックネームの管理」権限が必要です
- ユーザーは現役部員またはOBのロールを持っている必要があります
- すべての応答は ephemeral（本人のみ表示）です
- **スラッシュコマンドは初回起動前に `npm run deploy` で登録が必要です**

## トラブルシューティング

### よくあるエラー

1. **スラッシュコマンドが表示されない**: `npm run deploy` を実行してコマンドを登録してください
2. **権限不足エラー**: ボットに「ニックネームの管理」権限があることを確認
3. **ロールエラー**: ユーザーが適切なロール（現役部員/OB）を持っていることを確認
4. **入力値エラー**: 学籍番号や期生が指定範囲内であることを確認

## 開発

このプロジェクトは TypeScript と Discord.js v14 を使用しています。詳細な API ドキュメントは [Discord.js Guide](https://discordjs.guide/) を参照してください。
