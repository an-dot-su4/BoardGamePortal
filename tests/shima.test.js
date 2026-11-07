// 島ひらきのテスト
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../games/shima/logic.js';
import { seededRng } from '../js/util.js';
import { makePlayers } from './sim-helpers.js';

const rng = () => seededRng(5);

// 準備を CPU に済ませてもらい、遊べる状態にする
function ready(n = 2, seed = 1) {
  const r = seededRng(seed);
  const g = S.setup(makePlayers(n), r);
  while (g.phase === 'setup') {
    const p = g.setup.order[g.setup.idx];
    S.act(g, p, S.bot(g, p, r), r);
  }
  return g;
}
const give = (g, p, bag) => Object.assign(g.res[p], { wood: 0, stone: 0, rice: 0, salt: 0 }, bag);

test('人数: 2〜4人', () => {
  assert.throws(() => S.setup(makePlayers(1), rng()), /2〜4人/);
  assert.throws(() => S.setup(makePlayers(5), rng()), /2〜4人/);
  const g = S.setup(makePlayers(4), rng());
  assert.equal(g.tiles.length, 25);
  assert.equal(g.tiles.filter(t => t.t === 'waste').length, 1);
});

test('準備: 1→n→n→1 の順に村と道。2つ目の村で資源をもらう', () => {
  const g = S.setup(makePlayers(2), rng());
  const [a, b] = g.players;
  assert.deepEqual(g.setup.order, [a, b, b, a]);
  assert.throws(() => S.act(g, b, { type: 'village', at: '0,0' }), /番ではありません/);
  S.act(g, a, { type: 'village', at: '1,1' });
  assert.throws(() => S.act(g, a, { type: 'road', at: 'h:3,3' }), /つながる/);
  S.act(g, a, { type: 'road', at: 'h:1,1' });
  assert.throws(() => S.act(g, b, { type: 'village', at: '2,1' }), /置けません/, 'となりの角には置けない');
  S.act(g, b, { type: 'village', at: '4,4' });
  S.act(g, b, { type: 'road', at: 'v:4,3' });
  S.act(g, b, { type: 'village', at: '4,1' });
  const before = S.handSize(g, b);
  assert.equal(before, S.vertexTiles(g, '4,1').filter(t => S.TERRAIN[t.t].res).length);
  S.act(g, b, { type: 'road', at: 'h:4,1' });
  S.act(g, a, { type: 'village', at: '1,4' });
  S.act(g, a, { type: 'road', at: 'h:1,4' });
  assert.equal(g.phase, 'play');
  assert.ok(g.card, '最初の手番で季節札がめくられる');
});

test('季節札: 手番の人だけが、札の地形に接する村ごとに資源を得る', () => {
  const g = ready(2);
  const [a, b] = g.players;
  // a の村の地形に合う札を、次の手番に配る
  const va = Object.keys(g.villages).find(v => g.villages[v].p === a);
  const terr = S.vertexTiles(g, va).map(t => t.t).find(t => t !== 'waste');
  const other = ['forest', 'mountain', 'field', 'beach'].find(t => t !== terr);
  // いまの手番を a にして、次の札を差し込む
  g.turn = { p: b };
  g.deck.unshift({ kind: 'season', t: [terr, other] });
  give(g, a, {});
  give(g, b, {});
  S.act(g, b, { type: 'end' }, rng());
  assert.equal(g.turn.p, a);
  assert.ok(S.handSize(g, a) > 0, '手番の a は得る');
  assert.equal(S.handSize(g, b), 0, '手番でない b は得ない');
});

test('台風: 6枚以上の人は2枚失い、市場の値段が戻る', () => {
  const g = ready(2);
  const [a, b] = g.players;
  give(g, a, { wood: 5, stone: 1 });
  give(g, b, { wood: 2 });
  g.prices.wood = 5;
  g.turn = { p: b };
  g.deck.unshift({ kind: 'typhoon' });
  S.act(g, b, { type: 'end' }, rng());
  assert.equal(g.res[a].wood, 3);
  assert.equal(g.res[b].wood, 2);
  assert.equal(g.prices.wood, S.PRICE_BASE);
});

test('建てる: 道・村・城下町・寺社と点数', () => {
  const g = ready(2);
  const p = g.turn.p;
  give(g, p, { wood: 10, stone: 10, rice: 10, salt: 10 });
  const start = S.points(g, p);
  // 道をのばして、2つ先の角に村
  let built = false;
  for (let k = 0; k < 6 && !built; k++) {
    const spots = S.legalSpots(g, p, 'village');
    if (spots.length) {
      S.act(g, p, { type: 'village', at: spots[0] });
      built = true;
    } else S.act(g, p, { type: 'road', at: S.legalSpots(g, p, 'road')[0] });
  }
  assert.ok(built);
  assert.equal(S.points(g, p), start + 1);
  assert.throws(() => S.act(g, p, { type: 'temple' }), /城下町/);
  S.act(g, p, { type: 'town', at: S.legalSpots(g, p, 'town')[0] });
  assert.equal(S.points(g, p), start + 2);
  S.act(g, p, { type: 'temple' });
  assert.equal(S.points(g, p), start + 4);
  assert.throws(() => S.act(g, p, { type: 'temple' }), /1つまで/);
  give(g, p, {});
  assert.throws(() => S.act(g, p, { type: 'road', at: S.legalSpots(g, p, 'road')[0] }), /足りません/);
});

test('道は自分の村か道につながる所だけ。相手の村で途切れる', () => {
  const g = ready(2);
  const p = g.turn.p;
  give(g, p, { wood: 5, stone: 5 });
  const far = S.allEdges().find(e => !S.canPlaceRoad(g, p, e) && g.roads[e] === undefined);
  assert.throws(() => S.act(g, p, { type: 'road', at: far }), /置けません/);
});

test('市場: 値段の枚数を払って1枚。買うと値上がり、払うと値下がり', () => {
  const g = ready(2);
  const p = g.turn.p;
  give(g, p, { wood: 6 });
  S.act(g, p, { type: 'market', give: 'wood', get: 'stone' });
  assert.equal(g.res[p].stone, 1);
  assert.equal(g.res[p].wood, 3);
  assert.equal(g.prices.stone, 4);
  assert.equal(g.prices.wood, 2);
  assert.throws(() => S.act(g, p, { type: 'market', give: 'wood', get: 'stone' }), /4枚/);
  assert.throws(() => S.act(g, p, { type: 'market', give: 'wood', get: 'wood' }), /選んで/);
});

test('交換: 申し出・受ける・断る・資源の確認', () => {
  const g = ready(3);
  const [a, b, c] = g.players;
  g.turn = { p: a };
  give(g, a, { wood: 3 });
  give(g, b, { stone: 1 });
  give(g, c, {});
  assert.throws(() => S.act(g, b, { type: 'offer', give: { stone: 1 }, get: { wood: 1 } }), /手番/);
  assert.throws(() => S.act(g, a, { type: 'offer', give: { wood: 5 }, get: { stone: 1 } }), /足りません/);
  S.act(g, a, { type: 'offer', give: { wood: 2 }, get: { stone: 1 } });
  const id = g.offer.id;
  assert.throws(() => S.act(g, c, { type: 'accept', id }), /足りません/);
  S.act(g, b, { type: 'accept', id });
  assert.equal(g.res[a].stone, 1);
  assert.equal(g.res[b].wood, 2);
  assert.equal(g.offer, null);
  // 全員が断ると消える
  S.act(g, a, { type: 'offer', give: { wood: 1 }, get: { stone: 1 } });
  S.act(g, b, { type: 'decline', id: g.offer.id });
  assert.ok(g.offer);
  S.act(g, c, { type: 'decline', id: g.offer.id });
  assert.equal(g.offer, null);
});

test('資源の中身は本人にしか見えない', () => {
  const g = ready(2);
  const [a, b] = g.players;
  give(g, a, { wood: 7 });
  const vb = S.view(g, b);
  assert.notDeepEqual(vb.myRes, g.res[a]);
  assert.equal(vb.players.find(p => p.id === a).cards, 7);
  assert.ok(!('res' in vb));
  assert.equal(S.view(g, 'watcher').myRes, null);
  assert.throws(() => S.act(g, 'watcher', { type: 'end' }), /観戦/);
});

test('勝利点に届いたら終わる', () => {
  const g = ready(2);
  const p = g.turn.p;
  g.goal = S.points(g, p) + 1;
  give(g, p, { rice: 2, stone: 3 });
  S.act(g, p, { type: 'town', at: S.legalSpots(g, p, 'town')[0] });
  assert.equal(g.phase, 'over');
  assert.equal(g.winner, p);
  assert.throws(() => S.act(g, p, { type: 'end' }), /終わり/);
});

test('CPU 同士で何百試合しても必ず終わり、資源が負にならない', () => {
  for (let s = 0; s < 240; s++) {
    const n = 2 + (s % 3);
    const r = seededRng(1000 + s);
    const g = S.setup(makePlayers(n), r, { goal: S.GOALS[s % 3] });
    let steps = 0;
    while (g.phase !== 'over') {
      assert.ok(steps++ < 20000, '終わらない');
      const p = g.players.find(x => S.bot(g, x, r));
      assert.ok(p, '誰も操作できない');
      S.act(g, p, S.bot(g, p, r), r);
      for (const x of g.players) for (const res of S.RES) assert.ok(g.res[x][res] >= 0);
    }
    assert.ok(S.points(g, g.winner) >= g.goal);
  }
});
