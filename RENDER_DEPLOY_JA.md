# Render公開手順（日本語ガイド）

このアプリを他の人に共有するには、`https://...onrender.com` のような公開URLを作ります。

## 事前に必要なもの

- GitHubアカウント
- Renderアカウント
- このアプリを入れたGitHubリポジトリ

## 1. Renderにログイン

1. [Render Dashboard](https://dashboard.render.com) を開きます。
2. `Sign in` または `Get Started` を押します。
3. `Continue with GitHub` を選びます。

## 2. Web Serviceを作成

1. 画面右上または左上の `New +` を押します。
2. `Web Service` を選びます。
3. `Build and deploy from a Git repository` を選びます。
4. GitHubの接続画面が出たら、このアプリのリポジトリを選びます。

## 3. 設定項目

Renderの画面で以下のように入力します。

| Renderの表示 | 入れる内容 |
| --- | --- |
| Name | `marche-finder` |
| Region | `Singapore` または `Oregon` |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | 空欄のまま |
| Start Command | `node server.js` |
| Instance Type / Plan | `Free` |

## 4. 作成

1. 画面下の `Create Web Service` を押します。
2. 自動でデプロイが始まります。
3. 数分待って、ログに `Live` や `Deploy succeeded` のような表示が出たら完了です。
4. 画面上部に出る `https://...onrender.com` のURLが共有用URLです。

## 5. iPhoneでアプリのように使う

1. iPhoneのSafariで公開URLを開きます。
2. 共有ボタンを押します。
3. `ホーム画面に追加` を押します。
4. `追加` を押します。

## よくあるつまずき

### GitHubリポジトリが表示されない

RenderのGitHub連携で、対象リポジトリへのアクセス許可が必要です。

`Configure account` や `Configure GitHub App` が表示されたら、その中で対象リポジトリを選んで許可してください。

### Build Commandに何を入れるか分からない

このアプリでは空欄で大丈夫です。

### Start Commandに何を入れるか分からない

`node server.js` と入力してください。

### デプロイ後に検索できない

検索サイト側が自動アクセスを制限することがあります。時間を置いて再実行してください。将来的に安定させるなら、Google Custom Search APIやSerpAPIなどの検索APIに差し替えるのがおすすめです。
