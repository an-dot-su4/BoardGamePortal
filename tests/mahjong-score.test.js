import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../mahjong/tiles.js';
import { score, points } from '../mahjong/score.js';

const S = (hand, win, opts = {}) => score({ hand: parse(hand), winTile: win, ...opts });
const names = r => (r.yaku ?? []).map(y => y.name);

test('点数表（符と翻）', () => {
  assert.equal(points(1, 30, 0, false, false).ron, 1000);
  assert.equal(points(4, 30, 0, false, false).ron, 7700);
  assert.equal(points(3, 40, 0, true, false).ron, 7700);
  assert.equal(points(3, 30, 0, false, false).ron, 3900);
  assert.equal(points(2, 25, 0, false, false).ron, 1600);
  assert.equal(points(4, 40, 0, false, false).ron, 8000, '40符4翻は満貫');
  assert.equal(points(5, 30, 0, false, false).ron, 8000);
  assert.equal(points(6, 30, 0, false, false).ron, 12000);
  assert.equal(points(8, 30, 0, true, false).ron, 24000);
  assert.equal(points(11, 30, 0, false, false).ron, 24000);
  assert.equal(points(13, 30, 0, false, false).limit, '数え役満');
  const t = points(2, 20, 0, false, true);
  assert.deepEqual([t.fromOthers, t.fromDealer, t.total], [400, 700, 1500]);
  const d = points(5, 30, 0, true, true);
  assert.deepEqual([d.all, d.total], [4000, 12000]);
  assert.equal(points(1, 30, 0, false, false, 2).ron, 1600, '2本場は +600');
  assert.equal(points(1, 30, 0, false, true, 1).fromOthers, 400, '1本場のツモは各 +100');
});

test('平和・ツモ・断么九（20符）', () => {
  const r = S('234m456p678s23s55m 4s', '4s', { tsumo: true, seatWind: '2z' });
  // 14枚: 234m456p678s234s55m
  assert.ok(r.ok, r.reason);
  assert.deepEqual(names(r).sort(), ['平和', '断么九', '門前清自摸和'].sort());
  assert.equal(r.fu, 20);
  assert.equal(r.han, 3);
  assert.deepEqual([r.points.fromOthers, r.points.fromDealer], [700, 1300]);
});

test('リーチ・平和・断么九・ドラ1 のロン = 7700', () => {
  const r = S('234m456p678s234s55m', '4s', { riichi: true, seatWind: '3z', doraIndicators: ['3p'] });
  assert.ok(r.ok, r.reason);
  assert.equal(r.fu, 30);
  assert.equal(r.han, 4);
  assert.equal(r.points.ron, 7700);
});

test('親の中・リーチ・ドラ1 40符3翻 = 7700', () => {
  // 234m 567p 23s+4s 777z 99s。20 + 門前ロン10 + 中の暗刻8 = 38 → 40符
  const r = S('234m567p234s99s777z', '4s', { riichi: true, seatWind: '1z', doraIndicators: ['1m'] });
  assert.ok(r.ok, r.reason);
  assert.equal(r.fu, 40);
  assert.equal(r.han, 3);
  assert.equal(r.points.ron, 7700);
  assert.equal(r.wait, 'ryanmen');
});

test('七対子は25符', () => {
  const r = S('1199m2266p3355s77z', '7z', { seatWind: '2z' });
  assert.ok(r.ok, r.reason);
  assert.deepEqual(names(r), ['七対子']);
  assert.equal(r.fu, 25);
  assert.equal(r.points.ron, 1600);
});

test('二盃口は七対子より高く数える', () => {
  const r = S('223344m556677p88s', '8s', { seatWind: '2z' });
  assert.ok(names(r).includes('二盃口'));
  assert.ok(!names(r).includes('七対子'));
});

test('国士無双は役満', () => {
  const r = S('19m19p19s12345677z', '7z', { seatWind: '2z' });
  assert.equal(r.yakuman, 1);
  assert.equal(r.points.ron, 32000);
  const d = S('19m19p19s12345677z', '7z', { seatWind: '1z', tsumo: true });
  assert.equal(d.points.all, 16000);
});

test('喰いタン（鳴いた断么九）は20符でも30符', () => {
  const r2 = score({ hand: parse('234m456p55s678s'), winTile: '8s', melds: [{ type: 'chi', tile: '6p' }], seatWind: '2z' });
  assert.ok(r2.ok, r2.reason);
  assert.deepEqual(names(r2), ['断么九']);
  assert.equal(r2.fu, 30);
  assert.equal(r2.points.ron, 1000);
});

test('役がないとアガれない', () => {
  const r = score({ hand: parse('123m456p55s789s'), winTile: '9s', melds: [{ type: 'chi', tile: '1p' }], seatWind: '2z' });
  assert.equal(r.ok, false);
  assert.match(r.reason, /役がありません/);
  const r2 = S('123m456p789s11123z', '2z');
  assert.equal(r2.ok, false);
  assert.match(r2.reason, /アガリの形/);
});

test('ロンで完成した刻子は暗刻にならない（三暗刻）', () => {
  const ron = S('111m333p555s77z 789s', '5s', { seatWind: '2z', riichi: true });
  // 111m 333p 555s 789s 77z（5s で双碰ロン）
  assert.ok(ron.ok, ron.reason);
  assert.ok(!names(ron).includes('三暗刻'), 'ロンなら暗刻は2つ');
  const ts = S('111m333p555s77z 789s', '5s', { seatWind: '2z', tsumo: true });
  assert.ok(names(ts).includes('三暗刻'));
});

test('鳴くと下がる役（一気通貫・混一色）', () => {
  const closed = S('123456789m11z55z5z', '5z', { seatWind: '2z' });
  assert.ok(names(closed).includes('一気通貫'));
  assert.equal(closed.yaku.find(y => y.name === '一気通貫').han, 2);
  assert.equal(closed.yaku.find(y => y.name === '混一色').han, 3);
  const open = score({ hand: parse('456789m11z555z'), winTile: '5z', melds: [{ type: 'chi', tile: '1m' }], seatWind: '2z' });
  assert.ok(open.ok, open.reason);
  assert.equal(open.yaku.find(y => y.name === '一気通貫').han, 1);
  assert.equal(open.yaku.find(y => y.name === '混一色').han, 2);
});

test('三色同順・清一色・役牌・場風と自風', () => {
  const r = S('123m123p123s456s99m', '9m', { seatWind: '2z' });
  assert.ok(names(r).includes('三色同順'));
  const c = S('12345678999p234p', '5p', { seatWind: '2z' });
  assert.ok(names(c).includes('清一色'));
  const w = S('123m456p789s11z222z', '2z', { seatWind: '2z', roundWind: '2z' });
  assert.ok(names(w).includes('自風 南') && names(w).includes('場風 南'));
});

test('不正な入力はわかる理由で断る', () => {
  assert.match(S('11111m456p789s111z', '1m').reason, /5枚以上/);
  assert.match(S('123m456p789s11z', '1m').reason, /14 枚/);
  assert.match(S('123m456p789s11122z', '5m').reason, /和了牌/);
  assert.match(S('123m456p789s11122z', '2z', { ippatsu: true }).reason, /一発/);
});

test('ランダムな14枚でも例外を出さない', () => {
  const all = [];
  for (const s of 'mps') for (let n = 1; n <= 9; n++) for (let k = 0; k < 4; k++) all.push(`${n}${s}`);
  for (let n = 1; n <= 7; n++) for (let k = 0; k < 4; k++) all.push(`${n}z`);
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const deck = [...all].sort(() => rnd() - 0.5).slice(0, 14);
    const r = score({ hand: deck, winTile: deck[0], tsumo: rnd() < 0.5, seatWind: '2z' });
    assert.equal(typeof r.ok, 'boolean');
  }
});

test('符: 嵌張・暗槓・連風牌の雀頭', () => {
  const k = S('123m456p123s789s55m', '2s', { riichi: true, seatWind: '2z' });
  assert.equal(k.wait, 'kanchan');
  assert.ok(!names(k).includes('平和'), '嵌張は平和にならない');
  assert.equal(k.fu, 40, '20 + 門前ロン10 + 嵌張2 = 32 → 40');
  assert.equal(k.points.ron, 1300);
  const a = score({ hand: parse('234m456p678s11z'), winTile: '1z', melds: [{ type: 'ankan', tile: '9s' }], seatWind: '1z', roundWind: '1z', riichi: true });
  assert.ok(a.ok, a.reason);
  // 20 + 門前ロン10 + 9s暗槓32 + 東東の雀頭（場風+自風）4 + 単騎2 = 68 → 70符
  assert.equal(a.fu, 70);
});

test('いろいろな役', () => {
  const has = (r, n) => assert.ok(names(r).includes(n), `${n} がない: ${JSON.stringify(r.yaku ?? r.reason)}`);
  has(S('222m222p222s789m55z', '5z', { seatWind: '2z', riichi: true }), '三色同刻');
  has(S('555z666z77z123m789p', '7z', { seatWind: '2z' }), '小三元');
  has(score({ hand: parse('999m22p'), winTile: '2p', melds: [{ type: 'pon', tile: '1m' }, { type: 'pon', tile: '5s' }, { type: 'pon', tile: '7z' }], seatWind: '2z' }), '対々和');
  has(S('123m789m123p789s11z', '1z', { seatWind: '2z', riichi: true }), '混全帯么九');
  has(S('123m789m123p789s99p', '9p', { seatWind: '2z', riichi: true }), '純全帯么九');
  has(S('111m999p111z22z333z', '3z', { seatWind: '4z', tsumo: false, riichi: true }), '混老頭');
  const dsg = S('555z666z777z123m99p', '9p', { seatWind: '2z' });
  assert.ok(names(dsg).includes('大三元') && dsg.yakuman === 1);
  const sa = S('111m333p555s777s99m', '9m', { seatWind: '2z' });
  assert.ok(names(sa).includes('四暗刻'), '単騎のロンなら四暗刻');
  const sp = S('111m333p555s777s99m', '7s', { seatWind: '2z' });
  assert.ok(!names(sp).includes('四暗刻') && names(sp).includes('三暗刻') && names(sp).includes('対々和'), '双碰のロンは三暗刻・対々和');
});
