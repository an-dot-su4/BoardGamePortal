// 役・符・点数の計算。ルールは一般的なリーチ麻雀（赤ドラなし・喰いタンあり・切り上げ満貫なし・ダブル役満なし・
// 数え役満あり・連風牌の雀頭は4符）。DOM は使わない。
import { decompose, isChiitoi, isKokushi, shanten } from './hand.js';
import {
  toIndex, toCounts, fromIndex, isHonor, isTerminal, isYaochu, isDragon, isWind, doraFromIndicator, tileName,
} from './tiles.js';

const WAIT_NAME = { ryanmen: '両面待ち', kanchan: '嵌張待ち', penchan: '辺張待ち', shanpon: '双碰待ち', tanki: '単騎待ち' };
export { WAIT_NAME };

// 鳴き面子: { type: 'pon' | 'chi' | 'minkan' | 'ankan', tile: '5m' }（チーは一番小さい牌）
export function meldTiles(meld) {
  const i = toIndex(meld.tile);
  if (meld.type === 'chi') return [fromIndex(i), fromIndex(i + 1), fromIndex(i + 2)];
  const n = meld.type === 'pon' ? 3 : 4;
  return new Array(n).fill(meld.tile);
}

function checkMeld(meld) {
  if (!['pon', 'chi', 'minkan', 'ankan'].includes(meld?.type)) return '鳴きの種類が正しくありません';
  let i;
  try { i = toIndex(meld.tile); } catch { return '鳴きの牌が正しくありません'; }
  if (meld.type === 'chi' && (i >= 27 || i % 9 > 6)) return 'チーは同じ種類の数牌3枚の並び（一番小さい牌が1〜7）です';
  return null;
}

/**
 * 和了の点数を計算する。
 * input = {
 *   hand: ['1m', ...]   手の内の牌（和了牌を含む。14 − 3 × 鳴きの数 枚）
 *   melds: [{ type, tile }], winTile: '5m', tsumo: boolean,
 *   seatWind: '1z'〜'4z', roundWind: '1z'〜'4z',
 *   riichi, doubleRiichi, ippatsu, haitei（ツモなら海底・ロンなら河底）, rinshan, chankan, tenhou, chiihou,
 *   doraIndicators: [], uraIndicators: [], honba: 0,
 * }
 * 返り値: { ok: true, yaku: [{ name, han }], han, fu, fuParts, yakuman, dora, limit, points, wait, dealer }
 *        または { ok: false, reason, shanten? }
 */
export function score(input) {
  const melds = input.melds ?? [];
  const hand = input.hand ?? [];
  const seatWind = input.seatWind ?? '1z';
  const roundWind = input.roundWind ?? '1z';
  const dealer = seatWind === '1z';
  const tsumo = !!input.tsumo;

  for (const m of melds) { const e = checkMeld(m); if (e) return fail(e); }
  if (melds.length > 4) return fail('鳴きは4つまでです');
  let counts;
  try { counts = toCounts(hand); } catch (e) { return fail(e.message); }
  const need = 14 - melds.length * 3;
  if (hand.length !== need) return fail(`手の内の牌は和了牌を含めて ${need} 枚にしてください（今 ${hand.length} 枚）`);
  if (!input.winTile || !hand.includes(input.winTile)) return fail('和了牌は手の内の牌から選んでください');
  const all = [...hand, ...melds.flatMap(meldTiles)];
  const allCounts = toCounts(all);
  for (const t of [...(input.doraIndicators ?? []), ...(input.uraIndicators ?? [])]) allCounts[toIndex(t)]++;
  const over = allCounts.findIndex(n => n > 4);
  if (over >= 0) return fail(`${tileName(fromIndex(over))} が5枚以上あります（同じ牌は4枚まで）`);

  const menzen = melds.every(m => m.type === 'ankan');
  const hasKan = melds.some(m => m.type === 'minkan' || m.type === 'ankan');
  if ((input.riichi || input.doubleRiichi) && !menzen) return fail('リーチは鳴いていない（門前の）ときだけできます');
  if (input.ippatsu && !(input.riichi || input.doubleRiichi)) return fail('一発はリーチしたときだけつきます');
  if (input.rinshan && (!tsumo || !hasKan)) return fail('嶺上開花はカンしたあとのツモでアガったときだけです');
  if (input.chankan && tsumo) return fail('槍槓はロンのときだけです');
  if (input.rinshan && input.haitei) return fail('嶺上開花と海底摸月は同時につきません');
  if ((input.tenhou || input.chiihou) && (!tsumo || melds.length)) return fail('天和・地和は鳴いていない最初のツモでアガったときだけです');
  if (input.tenhou && !dealer) return fail('天和は親だけ、子の場合は地和です');
  if (input.chiihou && dealer) return fail('親の最初のツモでのアガリは天和です');

  const ctx = {
    input, melds, menzen, tsumo, dealer, seatWind: toIndex(seatWind), roundWind: toIndex(roundWind),
    winTile: toIndex(input.winTile), allCounts: toCounts(all), counts,
  };

  const forms = [];
  for (const d of decompose(counts, 4 - melds.length)) forms.push(...withWaits(ctx, d));
  if (!melds.length && isChiitoi(counts)) forms.push({ kind: 'chiitoi', wait: 'tanki' });
  if (!melds.length && isKokushi(counts)) forms.push({ kind: 'kokushi', wait: counts[ctx.winTile] === 2 ? 'juusanmen' : 'tanki' });
  if (!forms.length) {
    const s = shanten(counts, melds.length);
    return fail(s <= 0 ? 'アガリの形ではありません（面子4つと雀頭1つ、七対子、国士無双のどれかにします）'
      : `アガリの形ではありません（あと ${s} 枚の入れ替えでテンパイ）`, s);
  }

  let best = null;
  let noYakuForm = null;
  for (const f of forms) {
    const r = evaluate(ctx, f);
    if (!r) { noYakuForm ??= f; continue; }
    if (!best || r.points.total > best.points.total || (r.points.total === best.points.total && r.han > best.han)) best = r;
  }
  if (!best) return fail('役がありません。アガるには役が1つ以上必要です（ドラだけでは役になりません）');
  return best;
}

function fail(reason, s) { return { ok: false, reason, ...(s !== undefined ? { shanten: s } : {}) }; }

// 和了牌がどの面子に入ったかで待ちの形が変わるので、ありうる組み合わせを全部作る
function withWaits(ctx, d) {
  const w = ctx.winTile;
  const base = {
    kind: 'normal',
    pair: d.pair,
    sets: [
      ...d.sets.map(s => ({ ...s, open: false, concealed: true })),
      ...ctx.melds.map(m => ({
        type: m.type === 'chi' ? 'shuntsu' : m.type === 'pon' ? 'koutsu' : 'kantsu',
        tile: toIndex(m.tile), open: m.type !== 'ankan', concealed: m.type === 'ankan', meld: true,
      })),
    ],
  };
  const out = [];
  const seen = new Set();
  const push = (f) => {
    const key = f.wait + ':' + f.sets.map(s => `${s.type}${s.tile}${s.concealed ? 'c' : ''}`).sort().join();
    if (!seen.has(key)) { seen.add(key); out.push(f); }
  };
  if (d.pair === w) push({ ...base, wait: 'tanki' });
  base.sets.forEach((s, idx) => {
    if (s.meld) return;
    if (s.type === 'koutsu' && s.tile === w) {
      const sets = base.sets.map((x, j) => j === idx ? { ...x, concealed: ctx.tsumo, ronKou: !ctx.tsumo } : x);
      push({ ...base, sets, wait: 'shanpon' });
    }
    if (s.type === 'shuntsu' && w >= s.tile && w <= s.tile + 2) {
      const pos = w - s.tile;
      const n = (s.tile % 9) + 1;
      let wait = 'ryanmen';
      if (pos === 1) wait = 'kanchan';
      else if ((pos === 0 && n === 7) || (pos === 2 && n === 1)) wait = 'penchan';
      push({ ...base, wait });
    }
  });
  return out;
}

function countDora(ctx) {
  const c = ctx.allCounts;
  let dora = 0, ura = 0;
  for (const t of ctx.input.doraIndicators ?? []) dora += c[toIndex(doraFromIndicator(t))];
  if (ctx.input.riichi || ctx.input.doubleRiichi) {
    for (const t of ctx.input.uraIndicators ?? []) ura += c[toIndex(doraFromIndicator(t))];
  }
  return { dora, ura };
}

// 1つの形について役・符・点数を出す。役がなければ null
function evaluate(ctx, f) {
  const { input, menzen, tsumo } = ctx;
  const yaku = [];
  const yakuman = [];
  const add = (name, han) => yaku.push({ name, han });
  const c = ctx.allCounts;
  const tilesIdx = [];
  c.forEach((n, i) => { if (n) tilesIdx.push(i); });
  const allHonor = tilesIdx.every(isHonor);
  const allTermHonor = tilesIdx.every(isYaochu);
  const suits = new Set(tilesIdx.filter(i => !isHonor(i)).map(i => Math.floor(i / 9)));
  const hasHonor = tilesIdx.some(isHonor);

  // 役満
  if (input.tenhou) yakuman.push('天和');
  if (input.chiihou) yakuman.push('地和');
  if (f.kind === 'kokushi') yakuman.push('国士無双');
  if (allHonor) yakuman.push('字一色');
  if (tilesIdx.every(i => [19, 20, 21, 23, 25, 32].includes(i))) yakuman.push('緑一色');
  if (f.kind === 'normal') {
    const kou = f.sets.filter(s => s.type !== 'shuntsu');
    const concealedKou = kou.filter(s => s.concealed).length;
    if (concealedKou === 4) yakuman.push('四暗刻');
    if ([31, 32, 33].every(t => kou.some(s => s.tile === t))) yakuman.push('大三元');
    const windKou = kou.filter(s => isWind(s.tile)).length;
    if (windKou === 4) yakuman.push('大四喜');
    else if (windKou === 3 && isWind(f.pair)) yakuman.push('小四喜');
    if (tilesIdx.every(isTerminal)) yakuman.push('清老頭');
    if (f.sets.filter(s => s.type === 'kantsu').length === 4) yakuman.push('四槓子');
    if (menzen && !ctx.melds.length && suits.size === 1 && !hasHonor) {
      const s0 = [...suits][0] * 9;
      const pat = [3, 1, 1, 1, 1, 1, 1, 1, 3];
      if (pat.every((n, k) => c[s0 + k] >= n)) yakuman.push('九蓮宝燈');
    }
  }

  const dora = countDora(ctx);
  if (yakuman.length) {
    const list = yakuman.map(name => ({ name, han: '役満' }));
    const pts = points(0, 0, yakuman.length, ctx.dealer, tsumo, input.honba ?? 0);
    return {
      ok: true, yaku: list, yakuman: yakuman.length, han: 0, fu: 0, fuParts: [], dora: { dora: 0, ura: 0 },
      limit: pts.limit, points: pts, wait: f.wait, dealer: ctx.dealer, form: describe(f),
    };
  }

  // 1翻〜
  if (input.doubleRiichi) add('ダブル立直', 2);
  else if (input.riichi) add('立直', 1);
  if (input.ippatsu) add('一発', 1);
  if (menzen && tsumo) add('門前清自摸和', 1);
  if (input.haitei) add(tsumo ? '海底摸月' : '河底撈魚', 1);
  if (input.rinshan) add('嶺上開花', 1);
  if (input.chankan) add('槍槓', 1);
  if (tilesIdx.every(i => !isYaochu(i))) add('断么九', 1);

  let pinfu = false;
  if (f.kind === 'chiitoi') {
    add('七対子', 2);
  } else {
    const shun = f.sets.filter(s => s.type === 'shuntsu');
    const kou = f.sets.filter(s => s.type !== 'shuntsu');
    const pairYakuhai = isDragon(f.pair) || f.pair === ctx.seatWind || f.pair === ctx.roundWind;
    pinfu = menzen && shun.length === 4 && !pairYakuhai && f.wait === 'ryanmen';
    if (pinfu) add('平和', 1);
    // 一盃口・二盃口（門前のみ）
    if (menzen) {
      const byTile = {};
      for (const s of shun) byTile[s.tile] = (byTile[s.tile] ?? 0) + 1;
      const peikou = Object.values(byTile).reduce((a, n) => a + Math.floor(n / 2), 0);
      if (peikou >= 2) add('二盃口', 3);
      else if (peikou === 1) add('一盃口', 1);
    }
    // 役牌
    for (const s of kou) {
      if (s.tile === 31) add('役牌 白', 1);
      if (s.tile === 32) add('役牌 發', 1);
      if (s.tile === 33) add('役牌 中', 1);
      if (s.tile === ctx.seatWind) add(`自風 ${tileName(fromIndex(s.tile))}`, 1);
      if (s.tile === ctx.roundWind) add(`場風 ${tileName(fromIndex(s.tile))}`, 1);
    }
    // 三色同順・一気通貫・三色同刻
    const kui = (closed, open) => (menzen ? closed : open);
    for (let n = 0; n < 7; n++) {
      if ([0, 1, 2].every(su => shun.some(s => s.tile === su * 9 + n))) { add('三色同順', kui(2, 1)); break; }
    }
    for (let su = 0; su < 3; su++) {
      if ([0, 3, 6].every(k => shun.some(s => s.tile === su * 9 + k))) { add('一気通貫', kui(2, 1)); break; }
    }
    for (let n = 0; n < 9; n++) {
      if ([0, 1, 2].every(su => kou.some(s => s.tile === su * 9 + n))) { add('三色同刻', 2); break; }
    }
    if (kou.length === 4) add('対々和', 2);
    if (kou.filter(s => s.concealed).length === 3) add('三暗刻', 2);
    if (kou.filter(s => s.type === 'kantsu').length === 3) add('三槓子', 2);
    // 小三元
    if (isDragon(f.pair) && kou.filter(s => isDragon(s.tile)).length === 2) add('小三元', 2);
    // 混全帯么九・純全帯么九（どの面子と雀頭にも么九牌。順子が1つ以上）
    const blockHasYaochu = s => (s.type === 'shuntsu' ? isTerminal(s.tile) || isTerminal(s.tile + 2) : isYaochu(s.tile));
    if (shun.length && isYaochu(f.pair) && f.sets.every(blockHasYaochu)) {
      if (hasHonor) add('混全帯么九', kui(2, 1));
      else add('純全帯么九', kui(3, 2));
    }
  }
  if (allTermHonor && hasHonor) add('混老頭', 2);
  if (suits.size === 1 && hasHonor) add('混一色', menzen ? 3 : 2);
  if (suits.size === 1 && !hasHonor) add('清一色', menzen ? 6 : 5);

  if (!yaku.length) return null;

  const fuInfo = calcFu(ctx, f, pinfu);
  let han = yaku.reduce((a, y) => a + y.han, 0);
  if (dora.dora) yaku.push({ name: 'ドラ', han: dora.dora, dora: true });
  if (dora.ura) yaku.push({ name: '裏ドラ', han: dora.ura, dora: true });
  han += dora.dora + dora.ura;
  const pts = points(han, fuInfo.fu, 0, ctx.dealer, tsumo, input.honba ?? 0);
  return {
    ok: true, yaku, yakuman: 0, han, fu: fuInfo.fu, fuRaw: fuInfo.raw, fuParts: fuInfo.parts, dora,
    limit: pts.limit, points: pts, wait: f.wait, dealer: ctx.dealer, form: describe(f),
  };
}

function calcFu(ctx, f, pinfu) {
  const { menzen, tsumo } = ctx;
  if (f.kind === 'chiitoi') return { fu: 25, raw: 25, parts: [{ label: '七対子（いつも25符）', fu: 25 }] };
  if (pinfu && tsumo) return { fu: 20, raw: 20, parts: [{ label: '平和ツモ（いつも20符）', fu: 20 }] };
  const parts = [{ label: '副底（はじめから）', fu: 20 }];
  if (menzen && !tsumo) parts.push({ label: '門前でロン', fu: 10 });
  if (tsumo && !pinfu) parts.push({ label: 'ツモ', fu: 2 });
  for (const s of f.sets) {
    if (s.type === 'shuntsu') continue;
    const yao = isYaochu(s.tile);
    let fu = s.type === 'kantsu' ? 8 : 2;
    if (yao) fu *= 2;
    if (s.concealed) fu *= 2;
    const kind = s.type === 'kantsu' ? (s.concealed ? '暗槓' : '明槓') : (s.concealed ? '暗刻' : '明刻');
    const note = s.ronKou ? '（ロンで完成したので明刻あつかい）' : '';
    parts.push({ label: `${tileName(fromIndex(s.tile))}の${kind}（${yao ? '么九牌' : '中張牌'}）${note}`, fu });
  }
  let pairFu = 0;
  if (isDragon(f.pair)) pairFu += 2;
  if (f.pair === ctx.seatWind) pairFu += 2;
  if (f.pair === ctx.roundWind) pairFu += 2;
  if (pairFu) parts.push({ label: `雀頭が役牌（${tileName(fromIndex(f.pair))}）`, fu: pairFu });
  if (['kanchan', 'penchan', 'tanki'].includes(f.wait)) parts.push({ label: WAIT_NAME[f.wait], fu: 2 });
  const raw = parts.reduce((a, p) => a + p.fu, 0);
  let fu = Math.ceil(raw / 10) * 10;
  if (fu === 20) { fu = 30; parts.push({ label: '鳴いた手で20符のときは30符にする', fu: 0 }); }
  return { fu, raw, parts };
}

const up100 = n => Math.ceil(n / 100) * 100;

// 翻・符から点数。yakuman は役満の数
export function points(han, fu, yakuman, dealer, tsumo, honba = 0) {
  let base, limit = '';
  if (yakuman) { base = 8000 * yakuman; limit = yakuman > 1 ? `${yakuman}倍役満` : '役満'; }
  else if (han >= 13) { base = 8000; limit = '数え役満'; }
  else if (han >= 11) { base = 6000; limit = '三倍満'; }
  else if (han >= 8) { base = 4000; limit = '倍満'; }
  else if (han >= 6) { base = 3000; limit = '跳満'; }
  else {
    base = fu * 2 ** (han + 2);
    if (han >= 5 || base > 2000) { base = 2000; limit = '満貫'; }
  }
  if (!tsumo) {
    const total = up100(base * (dealer ? 6 : 4)) + 300 * honba;
    return { base, limit, total, ron: total };
  }
  if (dealer) {
    const each = up100(base * 2) + 100 * honba;
    return { base, limit, total: each * 3, all: each };
  }
  const fromDealer = up100(base * 2) + 100 * honba;
  const fromOthers = up100(base) + 100 * honba;
  return { base, limit, total: fromDealer + fromOthers * 2, fromDealer, fromOthers };
}

// 点数の言い方: 「7700点」「2000・3900（7900点）」「2600オール」
export function pointsText(p) {
  if (p.ron !== undefined) return `${p.ron}点`;
  if (p.all !== undefined) return `${p.all}点オール（合計 ${p.total}点）`;
  return `子 ${p.fromOthers}点・親 ${p.fromDealer}点（合計 ${p.total}点）`;
}

function describe(f) {
  if (f.kind !== 'normal') return { kind: f.kind };
  return {
    kind: 'normal',
    pair: fromIndex(f.pair),
    sets: f.sets.map(s => ({
      type: s.type, open: s.open, concealed: s.concealed,
      tiles: s.type === 'shuntsu' ? [s.tile, s.tile + 1, s.tile + 2].map(fromIndex)
        : new Array(s.type === 'kantsu' ? 4 : 3).fill(fromIndex(s.tile)),
    })),
  };
}
