---
name: add-game
description: ボドゲポータルに新しいゲームを追加する。ユーザーが「〇〇を追加して」「〇〇みたいなゲームを作って」「ゲームを増やして」と頼んだときに使う。
---

# ゲームを追加する

まず `CLAUDE.md` の「ゲームの約束事」「画面の約束事」を読む。既存のゲームが見本になる:
`daifugo`（手番制カード）、`arashi`（同時に伏せて出す協力）、`wordwolf`（話し合い→投票）、
`jinro`（隠れた役職・夜の行動・canChat）、`hoshi`（リアルタイム）、`sugoroku`（盤面とサイコロ）、`oekaki`（お絵描き・文字入力）。

## 1. 決める

- 依頼が市販ゲームの再現なら、名前・テーマを変えたオリジナルにする（ルールの骨組みは参考にしてよい）。その旨をユーザーに一言伝える。
- 人数（minPlayers〜maxPlayers）、対戦か協力か、1回の時間、ルールを箇条書きで決める。
- 曖昧な点はもっともらしい既定値で決めて進め、最後の報告で「こう決めた」と伝える。

## 2. 作る

1. `games/<id>/logic.js` … setup / act / view。隠す情報は view に入れない。
2. `games/<id>/ui.js` … createUI。スマホ幅でも遊べるように。
3. `games/registry.js` に1件追加（id, name, icon, mode, minPlayers, maxPlayers, time, summary, rules, logic, ui）。
4. `tests/<id>.test.js` … 最低限:
   - 各人数でランダムに最後まで遊んで必ず終わる（無限ループしない・例外が出ない）
   - 手番外・手札にないカード・観戦者などの不正操作が GameError になる
   - 他人の隠し情報が view に含まれない
   - 協力ゲームや得点のバランスが大事なゲームは、シミュレーションで勝率や偏りを確認する

## 3. 確かめる

```bash
npm test
npm install && npm run e2e   # 共通部分が壊れていないか
```

新しいゲームは `tests/e2e-games.mjs` の `scenarios` にシナリオを足し、
`SHOTS=<dir> node tests/e2e-games.mjs <id>` と `MOBILE=1` 付きで実際に遊ばせて、スクリーンショットを見てレイアウト崩れがないか確認する。

## 4. 公開する

main に push すると GitHub Actions がテストして GitHub Pages に公開する。
Actions の結果を確認し、ユーザーにはゲームの遊び方（ルール要約）と、こちらで決めた点を短く報告する。
