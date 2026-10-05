# ドローン障害物レース

高校文化祭向けタイムアタック計測・ランキングWebアプリ。
添付のUI見本を参考に、実際のアリーナ背景・ロゴ・ボタン・パネル画像を使用しています。

## 主な機能

- ランキングTOP10、金・銀・銅の表彰台
- ニックネーム（最大12文字・前後空白削除・空欄不可・絵文字対応）
- 準備 → 3・2・1 → START → 計測 → STOP → 結果 → 保存
- `performance.now()` による経過時間計測、100分の1秒表示、内部はミリ秒
- 1位更新・2位・3位・TOP10入り・圏外の結果表示
- 多重START / STOP防止、計測中は不要な操作ボタン非表示
- Three.js演出、紙吹雪、画面アニメーション、8種類のローカルSE
- 管理画面・JSONエクスポート・初期化確認・全画面表示
- ローカル保存、オフラインキャッシュ、保存失敗時のJSONバックアップ

## 使用技術

React / TypeScript / Vite / Three.js / @react-three/fiber / framer-motion / Howler.js / canvas-confetti。
@react-three/dreiは指定構成に合わせて依存に含めていますが、軽量な手続き型3Dのため現在は使用していません。
日本語フォントはNoto Sans JP（@fontsource）をアプリに同梱し、オフラインでも表示します。ブラウザテストはPlaywright。外部API、DB、ログイン、外部フォント配信、CDN参照はありません。

## セットアップ

Node.js 22.12以上（または24 LTS）とnpmを事前にインストールしてください。
**最初の依存パッケージ取得にはインターネットが必要です。文化祭の前日までに完了してください。**

```bash
cd drone-race-web
npm install
```

## 起動方法

```bash
npm run dev
```

表示されたURLを同じPCのChrome / Edgeで開きます。開発モードにはService Workerキャッシュはありません。

## ビルド方法

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

文化祭当日は `http://127.0.0.1:4173` での本番ビルド運用を推奨します。
依存パッケージ・ビルド済みファイルがPC上にあれば、上記のローカルサーバーはインターネット不要です。
サーバーを起動したターミナルは閉じないでください。Windowsでは `scripts/start-event.bat`、macOS/Linuxでは `sh scripts/start-event.sh` でも起動できます。`index.html` の直接ダブルクリック（file://）では動作しません。
`dist/`はビルド時に生成され、GitHub用ZIPには入っていません。

### オフラインキャッシュ

本番ビルドを localhost またはHTTPSで一度読み込むと、アプリ・全画像・SE・3Dコードをキャッシュします。
初回は読み込み完了まで待ち、ネットを切った状態で再読み込みと1回の計測を確認してください。
ローカル運用ではキャッシュの有無にかかわらず外部通信なしで動きます。
アプリ更新時は計測を終了し、同じサイトのタブを全部閉じて再度開いてください（計測中の自動更新・自動再読込はしません）。

## 管理画面

会場画面下部「スタッフ設定」、または `/?admin=1` を開きます。ローカルサーバーでは `/admin` も利用できます。

- ランキング確認 / JSONエクスポート / ランキング初期化
- SE・BGM・Three.js・紙吹雪・アニメーションのON/OFF
- SE・BGM音量 / 全画面表示 / 会場画面に戻る
- 初期化は確認後のみ実行。先にJSONをダウンロードしてください。
- 保存データが壊れている場合、「保存データのバックアップ」で元の文字列を退避できます。

ログインはなく、管理画面はスタッフの操作用です。同じブラウザのPCをスタッフが管理してください。
WindowsではF11でも全画面になります。OSが要求する全画面許可によってボタンが使えない場合があります。

## localStorageについて

ランキングキー：`droneRaceRanking`。設定キー：`droneRaceSettings`。

```ts
type RankingRecord = {
  id: string; // crypto.randomUUID()、非対応時は代替ID
  nickname: string;
  timeMs: number; // 内部の経過ミリ秒
  createdAt: string; // ISO日時
};
```

速い順で上位10件のみ保存。同一ニックネームの複数参加は可能です。
同一タイムのときは記録日時・IDで順番を安定させます。1位と同タイムは「新記録」になりません。
圏外の今回タイムは結果画面に表示されますが、永続保存はTOP10のみです。
再読み込み後はランキングへ戻ります。計測途中の復旧はしません。
破損した保存データは無断で上書きしません。保存容量不足・保存禁止時は警告とJSON退避ボタンを表示します。

**記録はブラウザ・プロファイル・URL（プロトコル/ホスト/ポート）ごとに別です。**
localhost と 127.0.0.1、開発サーバーと本番サーバーは別の記録です。当日は同じURLを使い続けてください。
ブラウザのサイトデータ削除・プライベートモード終了で消える場合があります。
複数PCのランキング同期はありません。計測は1つのタブで運用してください。
JSONはバックアップ用です。インポート・復元UIは現在ありません。

## 画像・SE素材の配置場所

```text
src/assets/
├── backgrounds/  # arena / victory（添付素材そのまま）
├── buttons/      # challenge / next / start / stop / ranking / retry
├── logo/         # logo_drone_obstacle_race.png
├── ui/           # panel_main_frame.png
└── sounds/       # 8種類の合成WAV・差し替え説明
```

全10枚の画像を実画面で使っています。元のPNGは変更していません。
同梱のSEは本アプリ用に生成した短い電子音です。実際の音量は会場スピーカーで調整してください。
`hover`, `click`, `countdown`, `start`, `stop`, `finish`, `rank-in`, `new-record` を同名の wav/mp3/oggで差し替え可能です。
`bgm.wav`（またはmp3/ogg）を追加して再ビルドすると、ランキング待機中のみループします。
BGMは未同梱のため、初期設定はOFFです。音源を削除した場合も計測は動作します。

## 文化祭当日の操作方法

1. 同じPC・同じChrome/Edge・同じURLで開きます。画面拡大率100%を推奨。
2. `/admin`で音量と3Dを確認。軽いPCではThree.jsや紙吹雪をOFFにしてください。
3. 練習記録をJSON保存してから初期化。会場画面を全画面表示します。
4. 「挑戦する」→ニックネーム→「次へ」。本名を入れなくて構いません。
5. スタッフの合図で「スタート」またはEnter。
6. **3・2・1の後のSTARTが計測開始です。** その合図で実機を走らせてください。
7. 実機がゴールしたら「ストップ」またはSpace。結果が自動保存されます。
8. 「ランキングを見る」または「もう一度挑戦」で継続します。
9. 休憩ごと・終了時にJSONをエクスポートして別の媒体にも保管してください。

ブラウザでの人手計測です。ドローンやゲートの自動検知機能はありません。
表示は0.01秒単位ですが、スタッフの反応時間・入力機器による誤差があります。スリープに入らない設定にしてください。

## ディレクトリ構成

```text
drone-race-web/
├── .github/workflows/  # GitHub Pages自動公開
├── src/
│   ├── App.tsx          # 状態・画面・スタッフ操作
│   ├── model.ts         # 計測表示・保存データの検証
│   ├── Scene.tsx        # 独立した3D演出とエラーバウンダリ
│   ├── audio.ts         # 任意音源を検出して再生
│   ├── style.css
│   └── assets/
├── public/
├── tests/               # 一連のブラウザ検証
├── docs/                # 完成報告・操作画像
├── scripts/
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts       # 本番時のオフラインキャッシュ生成
├── playwright.config.ts
├── index.html
├── .gitignore
└── README.md
```

## ブラウザテスト

```bash
npm run build
npx playwright install chromium
npm test
```

Playwrightのブラウザ取得は開発用のみで、文化祭運用には不要です。

## GitHubへのアップロード手順

ZIPを解凍し、`drone-race-web`の**中身**をリポジトリルートへアップロードします。
GitHubの「Add file → Upload files」、またはGitからpushできます。
`.gitignore`などの隠しファイルと`package-lock.json`も含めてください。
`node_modules/`, `dist/`, `.env` はアップロード不要です。

```bash
git init
git add .
git commit -m "Add drone race time attack app"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

GitHubへソースを置いただけではサイトは公開されません。ローカルで `npm install` → `npm run dev` またはビルドして運用できます。
## GitHub Pagesで公開する

1. ZIPを解凍し、フォルダの中身をリポジトリルートへアップロードします。**`.github/workflows/deploy-pages.yml` と `.gitignore`も必ず含めてください。**
2. リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選択します。
3. **Actions → Deploy Drone Race to GitHub Pages → Run workflow** を実行します。main/masterへの次のpushからは自動公開されます。
4. 完了後、Settings → Pagesに表示されるURLを開きます。

ActionsがPagesのbase_pathを取得してビルドするため、リポジトリ名の書き換えは不要です。ユーザーサイト・通常のプロジェクトサイト・Pagesのカスタムドメインに対応します。
管理画面は `https://ユーザー名.github.io/リポジトリ名/?admin=1`。スタッフ設定ボタンもこのURLを使い、再読み込み時の404を避けます。
ローカルでサブパスのビルドを確認する場合は `npm run build -- --base=/YOUR_REPOSITORY/`。プレビューも `npm run preview -- --base=/YOUR_REPOSITORY/` とし、同じサブパスのURLを開きます。
公開前はGitHub Actionsの成功と実際のURLでのSTART/STOP・音・再読み込みを確認してください。今回、外部リポジトリへのpushやPagesの実デプロイは行っていません。

Pagesとローカルサーバーは別URLなので、ランキングも別になります。当日は使用するURLを固定してください。初回アクセス時に「オフライン準備完了」を確認すると、切断後も再読み込みと計測ができます。
