import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify, toCounts, doraFromIndicator, tileName } from '../mahjong/tiles.js';
import { isAgari, shanten, waits, decompose, discardOptions } from '../mahjong/hand.js';

const c = s => toCounts(parse(s));

test('牌の表記', () => {
  assert.deepEqual(parse('123m 5p 11z'), ['1m', '2m', '3m', '5p', '1z', '1z']);
  assert.equal(stringify(['5p', '1m', '1z', '3m']), '13m5p1z');
  assert.throws(() => parse('8z'));
  assert.throws(() => parse('12'));
  assert.equal(tileName('5m'), '五萬');
  assert.equal(tileName('6z'), '發');
});

test('ドラ表示牌の次がドラ', () => {
  assert.equal(doraFromIndicator('3m'), '4m');
  assert.equal(doraFromIndicator('9p'), '1p');
  assert.equal(doraFromIndicator('4z'), '1z');
  assert.equal(doraFromIndicator('7z'), '5z');
  assert.equal(doraFromIndicator('5z'), '6z');
});

test('和了の形', () => {
  assert.ok(isAgari(c('123m456p789s11122z')));
  assert.ok(isAgari(c('11223344556677m')), '七対子でも一盃口2つでもある');
  assert.ok(isAgari(c('19m19p19s12345677z')), '国士無双');
  assert.ok(!isAgari(c('123m456p789s11123z')));
  assert.ok(isAgari(c('123m456p11z'), 2), '鳴きが2つなら8枚で判定');
  assert.equal(decompose(c('111222333m11p456s')).length, 2, '三暗刻と三連順子の2通り');
});

test('向聴数', () => {
  assert.equal(shanten(c('123m456p789s1122z')), 0);
  assert.equal(shanten(c('123m456p789s11122z')), -1);
  assert.equal(shanten(c('13m46p79s1234567z')), 4, '国士なら9種あるので4向聴');
  assert.equal(shanten(c('19m19p19s1234567z')), 0, '国士の13面待ち');
  assert.equal(shanten(c('1122334455667m')), 0);
  assert.equal(shanten(c('147m258p369s1234z')), 6);
});

test('待ち牌', () => {
  assert.deepEqual(waits(c('1112345678999m')), ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'], '九蓮宝燈');
  assert.deepEqual(waits(c('23m456p789s11122z')), ['1m', '4m']);
  assert.deepEqual(waits(c('13m456p789s11122z')), ['2m']);
  assert.deepEqual(waits(c('123m456p789s1112z')), ['2z']);
});

test('切る候補', () => {
  const opts = discardOptions(parse('123m456p789s1122z5s'));
  assert.equal(opts[0].shanten, 0);
  assert.equal(opts[0].tile, '5s');
});
