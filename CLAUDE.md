# ボドゲポータル（BoardGamePortal）

部屋番号で集まって 2〜8 人で遊べるブラウザボードゲーム集。GitHub Pages で公開する静的サイトで、
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
tests/e2e.mjs               Playwright で5人分のタブを開いて通しで遊ぶ確認（共通部分・大富豪・嵐の航海）
tests/e2e-games.mjs         追加ゲームごとのブラウザ通し確認。新しいゲームはここにシナリオを足す
```

## 本人確認（再接続）

- ブラウザごとのプレイヤーID（localStorage）で同じ人を見分ける。同じIDなら同じ席に戻る。
- ゲーム中は、切断中の席と同じ名前で入ると、その席を引き継げる（端末の乗り換え用）。
- 合言葉（任意）を設定した席は、合言葉が一致しないと入れない（IDをまねても名前が同じでも不可）。
  合言葉は `passHash(部屋番号, 合言葉)` のハッシュにして、ホストを見つけてから**ホストにだけ**送る。
  ホストは各人に `locked`（🔒表示用）だけを送り、ハッシュ自体は他の参加者に送らない。テストは `tests/host.test.js`。

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
  同じメンバーでもう一度遊べるよう、`restart` や `next` の操作を用意するとよい。
- 任意で `export function normalizeOptions(o)` を定義すると、ホストがロビーでゲームの設定を変えられる
  （`setup(players, rng, options)` の3つ目に届く。ホストのブラウザにゲームごとに保存される）。
  `validateOptions(options, 人数)` がエラー文を返すと開始できない。設定欄の画面は ui.js の `renderOptions(root, options, { editable, onChange })`。
- 任意で `export function bot(state, playerId, rng)` を定義すると、ロビーに「CPUを追加」が出る。
  CPU が今できる操作を1つ返す（できなければ null）。ホストが少し待ってから実行する。CPU は players に `bot: true` で入る。
- 任意で `export function canChat(state, playerId)` を定義すると、false の人のチャットをホストが止める（人狼の夜・脱落者など）。

## 画面の約束事（ui.js）

```js
export function createUI(root, api) {   // api.send(action), api.toast(text), api.rules（registry のルール配列）
  return { update(view, ctx) {}, destroy() {} };  // ctx = { you, isHost, players }
}
```

- 名前やチャットなどユーザー入力は必ず `h()` の子要素（文字列）として渡す。`innerHTML` は使わない。
- 状態が届くたびに `update` が呼ばれる。選択中のカードなど画面だけの状態は createUI 内の変数で持つ。
- 入力中の文字や描きかけの絵があるゲームは、毎回作り直すと消えてしまう。作業エリアは必要なときだけ作り直す（`games/oekaki/ui.js` 参照）。
- 卓（`.table`）の上の `.btn` は明るい背景に濃い文字、`.btn.primary` は黄色になる。
- `element.replaceChildren(a, null)` は null を「null」という文字で表示してしまう。null を含みうるときは `h()` で包むか取り除く。

## 天下札（games/tenka）

- ドミニオン風のデッキ構築。**効果とセットのまとまりはドミニオン本家（各セットの初版）と同じ**にしている
  （平安＝基本25種・鎌倉＝海辺26種・室町＝繁栄25種・戦国＝暗黒時代35種・江戸＝ギルド13種）。名前・説明文・絵はオリジナル（本家の名称・文章は使わない）。
  BANがあるので、本家の構成から外したい札はホストがBANで外す。新しい時代を足すときも、本家の1セットと同じまとまりにする。
- `cards/` に時代ごとのカード定義（`index.js` の `SETS` で `ready: true` の時代だけ選べる）。効果は `engine.js` の命令スタックで処理し、
  選択は `e.ask(...)` で止めて `steps` で続ける（ask はハンドラの最後に呼ぶ）。攻撃は `e.attack(step)`、結界などの守りは自動で公開。
  `e.later(...)`・`e.step(...)` で積んだ命令は、先に積んだ `e.play`・`e.attack` より**先に**実行される。「〜のあとで」は later を先に呼ぶ。
  持続札は `next(e)`、廃棄されたときの効果は `steps.onTrash`、場にある間の購入時効果は `whileInPlay.onBuy`。
  買ったときの効果は `steps.onBuy`、片付けで場から捨てるときは `steps.onCleanup`、多く払ったときは `steps.overpay`（`data.n`）。
  獲得したときの反応は engine の `place()`（番所・御朱印・屍運び）、廃棄の反応は `trashCards()`（楽市）、攻撃を使う前の反応は `exec` の resolve（悪童・物乞い）。
  コストは必ず `e.cost(id)` / `costOf(g, id)` で読む（石切場・行商人・武者の山で変わる）。「この札」を場から動かすときは `e.self`（傾奇者が化けているとき実体が違う）。
  混ぜた山: `ruins`（落武者）と `bushi`（名のある武者）は `g.ruinsPile` / `g.knightsPile` の一番上を獲得する。
- `bot.js` の CPU はゲーム中の対戦相手とシミュレーションの両方で使う。新しいカードには `AI` の目安と、選択の答え方を足す。
- `art.js` と `art/<時代>.js` が SVG のイラスト。描いていない札は名前の一文字の仮の絵になる。一覧は `gallery.html`。
- バランス確認: `node tools/tenka-balance.mjs [試合数]`（各王国カードを軸にした CPU 対 お金だけの CPU の勝率）。
  組み合わせ前提の札（寺・御前・里など）は単体では低く出るのが正常（ドミニオンの同じ札も同様）。
- 天下札には**スマホ表示**がある（`ui.js` の `renderMobile`。画面いっぱいの3段: 上部バー／供給だけスクロール／選択・操作ボタン・手札）。
  PC表示（`renderPC`）とは☰メニュー・「📱スマホ表示」ボタンで切り替え、`tenkaLayout` に保存。auto はスマホ幅・タッチ端末・低い横画面でスマホ表示。
  画面を変えたら `MOBILE=1`（縦）と `LANDSCAPE=1`（横 844×390）の e2e のスクショも見る。再描画でスクロール位置を保つため、スクロールする要素には `dataset.scrollKey` を付ける。
- スマホ幅（390px 前後）で崩れないこと。共通のクラス（`.table` `.seats` `.seat` `.hand` `.result-box` `.game-actions` など）は `css/style.css` にある。

## テスト・確認

- `npm test` … ルールのテスト。新しいゲームには「ランダムに最後まで遊んで必ず終わる」「不正な操作が拒否される」「隠す情報が view に出ない」テストを必ず書く。協力ゲームは難易度のシミュレーションも。
- `npm run e2e` / `npm run e2e:games` … ブラウザで通し確認（要 `npm install`。この環境では Chromium が `/opt/pw-browsers` にある）。
  `SHOTS=<dir>` でスクリーンショットを保存、`MOBILE=1` でスマホ幅。スクショは必ず目で見て崩れを確認する。
- 手で確かめるとき: `npm run serve` → `http://localhost:8080/?local=1` を複数タブで開くと、1台で複数人として遊べる。

## 注意

- 市販ゲームの名前・アート・固有のテキストは使わない。定番のトランプ遊びや、着想を得たオリジナルにする。
- リポジトリは公開（Public）。秘密情報を置かない。
- `vendor/` は手で編集しない。
