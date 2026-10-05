# 制作完了報告

制作日：2026年10月5日。依頼文を実装仕様とし、添付ZIP内のUI見本6枚・画像素材10枚を制作前に確認しました。ZIP内に独立した依頼書ファイルはありませんでした。

## 1. 実装機能

待機ランキング → ニックネーム → 準備 → 3・2・1 → START → 計測 → STOP → 結果 → 上位10件保存を実装。
新記録・2位・3位・TOP10入り・圏外、再挑戦、Enter/Space操作、入力検証、多重開始/停止防止、再読み込み、JSON出力、管理画面、全画面表示、オフライン対応を含みます。

## 2. 技術

React、TypeScript、Vite、Three.js、@react-three/fiber、Framer Motion、Howler.js、canvas-confetti、ローカルNoto Sans JP、Playwright。
指定の@react-three/dreiは依存に含めていますが、3Dは手続き型の形状で構成したため現在は未使用です。
外部API・DB・ログイン・CDN・外部音源参照なし。

## 3. ディレクトリ

`src/`：画面・計測/保存・3D・音・スタイル・画像・SE。
`public/`：追加静的ファイル用。`tests/`：ブラウザ検証。
`docs/`：本報告、検証結果、実画面PNG、フォントライセンス。
`scripts/`：Windows/macOS/Linux用の当日起動補助。
package-lock、TypeScript/Vite/Playwright設定、index.html、README、.gitignoreを含みます。

## 4. 使用素材

| 画像                         | 使用画面                 |
| ---------------------------- | ------------------------ |
| bg_drone_race_arena.png      | 通常画面の背景           |
| bg_drone_race_victory.png    | 1位更新時の背景          |
| logo_drone_obstacle_race.png | すべての画面のタイトル   |
| btn_challenge.png            | ランキングの挑戦ボタン   |
| btn_next.png                 | ニックネーム入力の次へ   |
| btn_start.png                | スタート準備             |
| btn_stop.png                 | 計測中の停止             |
| btn_ranking.png              | 結果画面のランキングへ   |
| btn_retry.png                | 結果画面の再挑戦         |
| panel_main_frame.png         | 入力・準備画面のフレーム |

全10枚は元PNGのまま分類。UI見本の青・金・赤、表彰台、中央の大きなタイマーを再現し、文字・順位・記録はアプリが動的に描画します。

## 5. Three.js

待機中：小型ドローン1機、左右のネオンリング、青・シアンの粒子、微細なカメラ移動。
START：ドローン前進、ゲートの色変化、光ストリーク、軽いカメラ前進。
新記録：金色粒子、光柱、軽いカメラズーム。銀・銅の粒子にも対応。
粒子160点、dpr 1〜1.5、影・ポストプロセス・GLTFなし。
コードは遅延ロードし、演出のエラー境界を計測UIと分離。WebGL非対応・3Dコード取得失敗はコア機能に影響しません。
計測が落ち着いたら3Dを非表示とし、タイマーとSTOPに集中できるようにしています。

## 6. SE

hover / click / countdown / start / stop / finish / rank-in / new-record の合成WAV8種類を同梱。
Howlerで再生し、管理画面でON/OFF・音量変更。ファイル欠如でも計測継続。
BGMは任意のため未同梱・初期OFF。同名bgm音源を追加してビルドすれば待機時のみ再生します。

## 7. localStorage

`droneRaceRanking`：id / nickname / timeMs / createdAtの配列、速い順で最大10件。
`droneRaceSettings`：音・音量・3D・紙吹雪・アニメーション。
入力文字数はUnicodeコードポイントで12文字。空欄不可、前後の空白を削除。
破損データの上書きを止め、保存失敗時は結果を保持してJSON退避を促します。
データはURL・ブラウザごと。複数PC同期、計測中の再読み込み復旧は行いません。

## 8. 管理画面

`/?admin=1`または下部の「スタッフ設定」。ローカル運用では`/admin`も利用できます。JSON保存、確認付きの初期化、設定変更、全画面表示。
認証は設けていません。会場PCをスタッフが管理する前提です。
JSONは配列形式で `drone-race-ranking-YYYY-MM-DD.json` としてダウンロード。

## 9. 検証

検証結果の正確な件数・各項目は同梱 `validation.json` に記載。
実際のChromiumで、計測の一連操作、1位更新、2位、3位、TOP10、圏外、11件目の上位10保存、再読み込み、管理設定、JSON内容、初期化の確認/キャンセル、保存容量エラー、破損データ保護、オフライン再読み込みと計測、WebGL非対応、3Dコード失敗、SE/3D/アニメーションOFFを検証しました。
絵文字の12文字上限、390pxの画面幅、1366×768の挑戦/STOPボタン表示も確認。
npm install / npm run buildは成功。ZIPを新しいフォルダに再展開し、同じ手順での依存取得・ビルドも成功しました。
スクリーンショットの順位・ニックネームは検証用です。配布ソースに初期ランキングは入っていません。

## 10. 未実装・代替箇所

- BGM音源は未同梱。任意音源を追加できます。
- SEは合成電子音。専門制作の音源への差し替えが可能です。
- 3Dは軽量な形状を組み合わせたドローン・ゲートです。専用GLTFモデルではありません。
- JSONインポート、ランキングの複数端末同期、実機の自動ゴール検知は対象外です。
- 実際の会場PC、接続モニター、スピーカーでの最終確認は現地で必要です。

## 11. 当日の事前確認

- 前日までにNode.js、npm install、npm run buildを完了する。
- Chrome/Edgeの通常プロファイルを使い、同じURL/ポートを維持する。
- ローカルサーバーのウィンドウを閉じない。スリープ・自動更新による中断を避ける。
- 全画面で名前・タイム・STOPを遠方から確認。拡大率100%推奨。
- 音量、STARTの合図、Enter/Space操作を実機と合わせて練習する。
- 必要なら3Dや紙吹雪をOFFにする。
- オフライン準備完了後、ネット切断状態で再読み込みと1回の計測を試す。
- 練習記録をJSON保存してから初期化する。終了時にもJSONを別媒体へ保存する。
- 人手STOPの反応時間を含む測定なので、スタッフの操作ルールを揃える。

## 12. GitHubへのアップロード

ZIPを解凍し、drone-race-webの中身をリポジトリルートへ登録。
README記載のnpm install / npm run dev、またはnpm run buildで再現できます。
node_modules・dist・.env・OS生成ファイルはZIPから除外。
公開・デプロイは今回行っていません。GitHub Pagesのサブパス設定はREADME参照。

## GitHub Pages対応更新

- `.github/workflows/deploy-pages.yml`を追加。Pages設定でSourceをGitHub Actionsにすると、main/masterへのpushまたは手動実行で公開します。
- Pagesが返すbase_pathでビルドし、リポジトリ名の手動編集を不要にしました。
- 管理画面は`?admin=1`で遷移するため、Pagesでの再読み込み404を避けます。
- オフラインキャッシュを配置パスごとに分離し、同一ホストの別プロジェクトのキャッシュを削除しません。
- 本番サブパス`/drone-race/`で画像・管理画面再読み込み・オフライン再読み込み・START/STOP・ランキング保存をブラウザ検証しました。
- ローカルルートビルド、サブパスビルドとも成功。外部リポジトリの実デプロイは未実行です。
