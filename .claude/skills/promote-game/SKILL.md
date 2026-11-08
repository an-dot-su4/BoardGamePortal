---
name: promote-game
description: 試作ゲーム（lab.html に並ぶ trial: true のゲーム）をメインのポータルに昇格させる、または却下して取り除く。ユーザーが「〇〇をOK」「〇〇を採用」「〇〇はNG」「〇〇を消して」「試作の〇〇を直して」と言ったときに使う。
---

# 試作ゲームの昇格・却下

試作ゲームは `games/registry.js` で `trial: true, addedAt: 'YYYY-MM-DD'` が付いたもの（`daily-game` スキルが毎日作る）。
ユーザーが名前で指定したゲームを registry から探す（名前が曖昧なら試作一覧を見せて確認する）。

## OK（採用）

1. registry のその項目から `trial` と `addedAt` を消す。項目は配列の中で**メインのゲームの最後**（最初の試作ゲームより前）に移す。
2. README の「収録ゲーム」表に1行足す（既存の行の書き方に合わせる）。
3. `docs/daily-game-ideas.md` のその行の状態を `採用（YYYY-MM-DD）` にする。

## NG（却下）

1. `games/<id>/`、`tests/<id>.test.js`、`tests/e2e-games.mjs` のシナリオ、registry の項目を削除する。
2. `docs/daily-game-ideas.md` のその行の状態を `却下: <ユーザーの理由>` にする（同じ案・同じ失敗を繰り返さないため）。

## 直して（試作のまま修正）

指摘を直して試作のまま残す。`docs/daily-game-ideas.md` の一言説明の後ろに修正内容を短く足す。

## 共通: 確かめて公開

- `npm test`（`tests/registry.test.js` が、メインに addedAt が残っていないことなどを確認する）。
  採用・修正のときは `node tests/e2e-games.mjs <id>` も通す。
- commit → 作業ブランチに push → PR を作り、main に反映する（マージしてよいかはそのときのユーザーの指示に従う）。
- 報告: 何をしたか1〜2行と、ポータル https://an-dot-su4.github.io/BoardGamePortal/ （試作は lab.html）。
