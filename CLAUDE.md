# ボドゲポータル（BoardGamePortal）

部屋番号で集まって 2〜6 人で遊べるブラウザボードゲーム集。GitHub Pages で公開する静的サイトで、
サーバーは持たない。部屋を作った人（ホスト）のブラウザが進行役になり、参加者とは WebRTC（Trystero）で直接つながる。

ユーザーは「〇〇のゲームを追加して」と頼んでくる。そのときは `.claude/skills/add-game/SKILL.md` の手順に従う。
画面の文言・コメント・ドキュメントは日本語で書く。

## 構成

```
index.html / js/portal.js   ポータル（ゲーム一覧・部屋を作る・部屋番号で参加）
room.html  / js/room.js     部屋（ロビー・プレイヤー一覧・チャット・ホスト操作）。ゲーム中の画面は各ゲームの ui.js に任せる
js/host.js                  Host（ホスト側の進行役。正しい状態を持ち、各人に view だけ送る）と Guest（参加者側）
js/net.js                   通信。本番は Trystero、?local=1 なら同じブラウザのタブ間（BroadcastChannel）
js/storage.js               localStorage（?local=1 では sessionStorage）。プレイヤーID・名前・ホストの部屋の保存
js/util.js                  h()（DOM 生成）、shuffle、seededRng、GameError など
games/registry.js           ゲーム一覧（名前・人数・ルール説明・logic/ui の読み込み）
games/<id>/logic.js         ルール。DOM を使わない純粋なロジック
games/<id>/ui.js            画面
vendor/trystero.js          Trystero を1ファイルにまとめたもの（npm run build:vendor）
tests/*.test.js             node:test によるルールのテスト（CI で実行）
tests/e2e.mjs               Playwright で5人分のタブを開いて通しで遊ぶ確認（ローカルで実行）
```

ビルド工程はない。ファイルをそのまま配信する（`.github/workflows/pages.yml` が main への push でテスト→公開）。

## ゲームの約束事（logic.js）

```js
export function setup(players /* [{id, name}] */, rng) { return state; }      // state は JSON にできる値だけ
export function act(state, playerId, action, rng) { /* state を直接書き換える */ } // ルール違反は throw new GameError('日本語の理由')
export function view(state, playerId) { return {...}; }                          // その人に見せてよい情報だけ。playerId が null なら観戦者
```

- ホストは `structuredClone(state)` に対して `act` を実行し、例外なら捨てる。だから途中で throw しても安全。
- **他人の手札など隠す情報を `view` に入れない**（ブラウザの開発者ツールで見えてしまう）。テストで確認する。
- 参加者から届く `action` は信用しない。型・所有・手番をすべて `act` の中で検証する。
- 乱数は引数の `rng` を使う（テストで再現できるように）。
- 勝敗がついたら `view` の `phase` などで画面に伝える。「ロビーに戻る」はホストの共通ボタンにある。

## 画面の約束事（ui.js）

```js
export function createUI(root, api) {   // api.send(action), api.toast(text), api.rules（registry のルール配列）
  return { update(view, ctx) {}, destroy() {} };  // ctx = { you, isHost, players }
}
```

- 名前やチャットなどユーザー入力は必ず `h()` の子要素（文字列）として渡す。`innerHTML` は使わない。
- 状態が届くたびに `update` が呼ばれる。選択中のカードなど画面だけの状態は createUI 内の変数で持つ。
- スマホ幅（390px 前後）で崩れないこと。共通のクラス（`.table` `.seats` `.seat` `.hand` `.result-box` `.game-actions` など）は `css/style.css` にある。

## テスト・確認

- `npm test` … ルールのテスト。新しいゲームには「ランダムに最後まで遊んで必ず終わる」「不正な操作が拒否される」「隠す情報が view に出ない」テストを必ず書く。協力ゲームは難易度のシミュレーションも。
- `npm run e2e` … ブラウザで通し確認（要 `npm install`。この環境では Chromium が `/opt/pw-browsers` にある）。`SHOTS=<dir>` でスクリーンショットを保存。
- 手で確かめるとき: `npm run serve` → `http://localhost:8080/?local=1` を複数タブで開くと、1台で複数人として遊べる。

## 注意

- 市販ゲームの名前・アート・固有のテキストは使わない。定番のトランプ遊びや、着想を得たオリジナルにする。
- リポジトリは公開（Public）。秘密情報を置かない。
- `vendor/` は手で編集しない。
