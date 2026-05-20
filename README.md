# マルシェ出店先ファインダー

埼玉、茨城、東京、千葉のマルシェ出店者募集情報を、ボタンひとつで検索して一覧化する小さなWebアプリです。

## 起動

```bash
node server.js
```

ブラウザで `http://127.0.0.1:4174` を開き、`探す` ボタンを押します。

## Renderで公開する

日本語の詳しい手順は [RENDER_DEPLOY_JA.md](./RENDER_DEPLOY_JA.md) にまとめています。

1. このフォルダをGitHubリポジトリにアップロードします。
2. Renderで `New +` → `Web Service` を選びます。
3. GitHubリポジトリを接続します。
4. 以下の設定で作成します。

| 項目 | 値 |
| --- | --- |
| Runtime | Node |
| Build Command | 空欄 |
| Start Command | `node server.js` |
| Plan | Free |

`render.yaml` も入れてあるので、RenderがBlueprintとして認識した場合はそのまま作成できます。公開後に表示される `https://...onrender.com` のURLを共有してください。

## iPhoneアプリのように共有する

このアプリはPWA対応済みです。Renderで公開したURLを相手に送り、相手のiPhoneで次の操作をしてもらうとホーム画面からアプリのように開けます。

1. iPhoneのSafariで公開URLを開きます。
2. 共有ボタンを押します。
3. `ホーム画面に追加` を選びます。
4. `追加` を押します。

App Store配布やTestFlight配布をする場合は、Apple Developer Programへの登録とiOSアプリ化が別途必要です。

## できること

- 対象地域: 埼玉、茨城、東京、千葉
- 県別に表示
- 開催時期が近い順に並び替え
- 募集状況を `出店者募集中`、`募集開始前`、`情報なし` などで表示
- 出店費用をページ本文から推定して表示
- 元ページへのリンクを表示
- 通常検索とは別に `site:instagram.com` のInstagram専用検索を実行
- 結果カードに `Web` / `Instagram` の取得元を表示

## 注意

検索結果と各ページ本文から自動推定するため、募集状況や出店費用は必ずリンク先の公式情報で確認してください。検索サイト側の制限やページ構造によって、取得できない場合があります。
