// チュートリアルの進行。台本（lessons.js）に沿って、引く牌・他家の捨て牌を固定で進める。
// DOM は使わない。act は正しい操作なら state を進め、違えば { ok: false, text } で理由を返す（state はそのまま）。
import { parse, toCounts, toIndex, fromIndex, sortTiles, tileName, ALL_TILES } from './tiles.js';
import { seededRng, shuffle } from '../js/util.js';
import { isAgari, shanten, waits } from './hand.js';
import { score } from './score.js';

const SEATS = { kami: '上家', toimen: '対面', shimo: '下家' };
export { SEATS };

const NEXT = { me: 'shimo', shimo: 'toimen', toimen: 'kami', kami: 'me' };

// 台本を、正しい手番の順（自分 → 下家 → 対面 → 上家 → 自分）に並べ直す。
// 台本に書いていない他家の番は { from, auto: true }（鳴けない・アガれない牌を自動で捨てる）で埋める。
// 鳴いたあとは鳴いた人（自分）の下家から、ロン・ツモで終わり。順番が成り立たない台本はエラーにする。
export function expand(lesson) {
  const out = [];
  let turn = null; // 次に動く人。null = まだ決まっていない（レッスンの最初）か、終わった
  let ended = false;
  for (const s of lesson.steps) {
    const who = s.draw ? 'me' : s.rinshan ? 'rinshan' : s.from ?? null;
    if (who && ended) throw new Error(`${lesson.id}: アガったあとに手順があります`);
    if (who === 'rinshan') {
      if (turn !== 'rinshan') throw new Error(`${lesson.id}: カンのあとでないのに嶺上牌を引いています`);
    } else if (who) {
      if (turn === 'rinshan') throw new Error(`${lesson.id}: カンのあとは嶺上牌を引きます`);
      for (let guard = 0; turn && turn !== who; guard++) {
        if (turn === 'me') throw new Error(`${lesson.id}: 自分の番を飛ばして${SEATS[who]}が捨てています`);
        if (guard > 3) throw new Error(`${lesson.id}: 手番の順が正しくありません`);
        out.push({ from: turn, auto: true });
        turn = NEXT[turn];
      }
    }
    out.push(s);
    if (s.draw || s.rinshan) {
      if (s.tsumo) { ended = true; turn = null; } else turn = s.kan ? 'rinshan' : 'shimo';
    } else if (s.from) {
      if (s.call === 'ron') { ended = true; turn = null; } else turn = s.call ? 'shimo' : NEXT[s.from];
    }
  }
  return out;
}

// レッスンに出てくる牌（自動の捨て牌は、これと合わせて同じ牌4枚までにする）
function scriptTiles(lesson) {
  const all = [lesson.hand, lesson.myRiver, lesson.dora, lesson.ura, ...Object.values(lesson.rivers ?? {})].filter(Boolean).flatMap(parse);
  for (const s of lesson.steps) for (const k of ['draw', 'rinshan', 'tile', 'newDora']) if (s[k]) all.push(s[k]);
  return all;
}

function chiOptions(hand, tile) {
  const i = toIndex(tile);
  const c = toCounts(hand);
  const out = [];
  if (i >= 27) return out;
  const n = i % 9;
  for (const lo of [i - 2, i - 1, i]) {
    const ln = n - (i - lo);
    if (ln < 0 || ln > 6) continue;
    if ([lo, lo + 1, lo + 2].filter(x => x !== i).every(x => c[x] > 0)) out.push(fromIndex(lo));
  }
  return out;
}

// 自動で捨てる牌: 自分がロン・ポン・チーできない牌を、レッスンごとに決まった順で選ぶ
function pickAuto(lesson, st, seat) {
  const used = toCounts([...scriptTiles(lesson), ...st.autoUsed]);
  let seed = 0;
  for (const ch of lesson.id) seed = seed * 31 + ch.charCodeAt(0);
  const order = shuffle([...ALL_TILES], seededRng(seed + st.autoUsed.length * 7919));
  const hand = toCounts(st.hand);
  for (const t of order) {
    const i = toIndex(t);
    if (used[i] >= 4) continue;
    if (hand[i] >= 2) continue;
    hand[i]++;
    const ron = isAgari(hand, st.melds.length);
    hand[i]--;
    if (ron) continue;
    if (seat === 'kami' && chiOptions(st.hand, t).length) continue;
    return t;
  }
  throw new Error(`${lesson.id}: 自動の捨て牌を選べません`);
}

export function start(lesson) {
  const st = {
    lesson: lesson.id,
    steps: expand(lesson),
    autoUsed: [],
    i: 0,
    hand: sortTiles(parse(lesson.hand ?? '')),
    drawn: null,
    melds: [],
    river: parse(lesson.myRiver ?? '').map(tile => ({ tile })),
    rivers: Object.fromEntries(Object.keys(SEATS).map(k => [k, parse(lesson.rivers?.[k] ?? '').map(tile => ({ tile }))])),
    dora: parse(lesson.dora ?? ''),
    riichi: false,
    riichiPending: false,
    ippatsu: false,
    rinshan: false,
    phase: 'say',
    feedback: null,
    result: null,
  };
  enter(lesson, st);
  return st;
}

export function step(lesson, st) { return st.steps[st.i] ?? null; }

function enter(lesson, st) {
  const s = step(lesson, st);
  st.rinshan = false;
  if (!s) { st.phase = 'done'; return; }
  if (s.draw || s.rinshan) {
    st.drawn = s.draw ?? s.rinshan;
    st.rinshan = !!s.rinshan;
    if (s.newDora) st.dora.push(s.newDora);
    st.phase = 'draw';
  } else if (s.auto) {
    // 台本にない他家の番: 自動で捨てて、そのまま次へ（操作はいらない）
    clearLast(st);
    const t = pickAuto(lesson, st, s.from);
    st.autoUsed.push(t);
    st.rivers[s.from].push({ tile: t, last: true });
    st.i++;
    enter(lesson, st);
  } else if (s.from) {
    clearLast(st);
    st.rivers[s.from].push({ tile: s.tile, last: true });
    st.phase = 'call';
  } else {
    st.phase = 'say';
  }
}

function clearLast(st) {
  for (const k of Object.keys(st.rivers)) for (const r of st.rivers[k]) delete r.last;
}

function advance(lesson, st, text) {
  clearLast(st);
  st.i++;
  st.feedback = text ? { ok: true, text } : null;
  enter(lesson, st);
}

const ng = text => ({ ok: false, text });
const asList = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export function menzen(st) { return st.melds.every(m => m.type === 'ankan'); }
export function concealed(st) { return st.drawn ? [...st.hand, st.drawn] : st.hand; }

function lastDiscard(lesson, st) {
  const s = step(lesson, st);
  return s?.from ? s.tile : null;
}

// 自分の捨て牌に待ち牌があるか
export function furiten(st) {
  const w = waits(toCounts(st.hand), st.melds.length);
  return w.some(t => st.river.some(r => r.tile === t));
}

// 今押せるボタン（台本の正解かどうかに関係なく、ルール上できること）
export function available(lesson, st) {
  const a = { tsumo: false, riichi: false, kan: false, ron: false, pon: false, chi: [], pass: false, next: false };
  if (st.phase === 'say' || st.phase === 'done') { a.next = st.phase === 'say'; return a; }
  if (st.phase === 'draw') {
    const c = toCounts(concealed(st));
    a.tsumo = isAgari(c, st.melds.length);
    a.kan = !st.riichiPending && c[toIndex(st.drawn)] === 4;
    if (menzen(st) && !st.riichi) {
      a.riichi = concealed(st).some(t => {
        const cc = c.slice(); cc[toIndex(t)]--;
        return shanten(cc, st.melds.length) === 0;
      });
    }
    return a;
  }
  if (st.phase === 'call') {
    const t = lastDiscard(lesson, st);
    const i = toIndex(t);
    const c = toCounts(st.hand);
    a.pass = true;
    c[i]++;
    a.ron = isAgari(c, st.melds.length);
    c[i]--;
    if (!st.riichi) {
      a.pon = c[i] >= 2;
      if (step(lesson, st).from === 'kami' && i < 27) {
        const n = i % 9;
        for (const lo of [i - 2, i - 1, i]) {
          const ln = n - (i - lo);
          if (ln < 0 || ln > 6) continue;
          const need = [lo, lo + 1, lo + 2].filter(x => x !== i);
          if (need.every(x => c[x] > 0)) a.chi.push(fromIndex(lo));
        }
      }
    }
  }
  return a;
}

// action: { type: 'next' | 'discard' | 'riichi' | 'tsumo' | 'ron' | 'pon' | 'chi' | 'kan' | 'pass', tile? }
export function act(lesson, st, action) {
  const s = step(lesson, st);
  const av = available(lesson, st);
  const hint = s?.hint;
  switch (action.type) {
    case 'next':
      if (st.phase !== 'say') return ng('今は牌を操作する場面です。');
      advance(lesson, st);
      return { ok: true };

    case 'riichi': {
      if (st.phase !== 'draw') return ng('リーチは自分の番（牌を引いたあと）に宣言します。');
      if (st.riichi) return ng('もうリーチしています。');
      if (!menzen(st)) return ng('鳴いた手ではリーチできません（門前のときだけ）。');
      if (!av.riichi) return ng('リーチはテンパイしているとき（1枚切るとテンパイになるとき）だけできます。');
      if (!s.riichi) return ng(hint ?? 'この場面ではリーチしません。');
      st.riichiPending = !st.riichiPending;
      st.feedback = st.riichiPending ? { ok: true, text: 'リーチを宣言しました。続けて切る牌を選びます（横向きに置かれます）。' } : null;
      return { ok: true };
    }

    case 'discard': {
      const t = action.tile;
      if (st.phase === 'call') return ng('今は他の人の捨て牌に対して、鳴くか見送るかを選ぶ場面です。');
      if (st.phase !== 'draw' && st.phase !== 'after-call') return ng('今は牌を切る場面ではありません。');
      const mine = concealed(st);
      if (!mine.includes(t)) return ng('その牌は手の中にありません。');
      if (st.riichi && st.phase === 'draw' && t !== st.drawn) {
        return ng('リーチしたあとは手を変えられません。引いた牌をそのまま切ります（ツモ切り）。');
      }
      if (s.tsumo && av.tsumo) return ng(hint ?? 'アガリの形になっています！「ツモ」を押しましょう。');
      if (s.kan) return ng(hint ?? '同じ牌が4枚そろいました。「カン」してみましょう。');
      if (s.riichi && !st.riichiPending) return ng(hint ?? 'テンパイしました。切る前に「リーチ」を押してみましょう。');
      const expect = asList(s.discard);
      if (!expect.includes(t)) return ng(discardHint(st, t, expect, hint));
      // 切る
      const rest = [...mine];
      rest.splice(rest.indexOf(t), 1);
      st.hand = sortTiles(rest);
      st.drawn = null;
      st.river.push({ tile: t, riichi: st.riichiPending || undefined });
      if (st.riichiPending) { st.riichi = true; st.riichiPending = false; st.ippatsu = true; }
      else if (st.riichi) st.ippatsu = false;
      advance(lesson, st, s.after);
      return { ok: true };
    }

    case 'tsumo':
      if (st.phase !== 'draw') return ng('ツモは自分で牌を引いたときにアガる方法です。');
      if (!av.tsumo) return ng('まだアガリの形（面子4つと雀頭1つなど）ではありません。');
      if (!s.tsumo) return ng(hint ?? 'ここではまだアガりません。');
      return win(lesson, st, s, st.drawn, true);

    case 'ron': {
      if (st.phase !== 'call') return ng('ロンは他の人が捨てた牌でアガる方法です。');
      if (!av.ron) return ng(`${tileName(s.tile)} ではアガリの形になりません。`);
      if (furiten(st)) return ng(hint ?? 'フリテンです。自分の捨て牌に待ち牌があるときはロンできません。');
      if (s.call !== 'ron') return ng(hint ?? 'ここではまだアガりません。');
      return win(lesson, st, s, s.tile, false);
    }

    case 'pon':
    case 'chi': {
      if (st.phase !== 'call') return ng('ポン・チーは他の人の捨て牌を取る操作です。');
      if (action.type === 'pon' && !av.pon) return ng('ポンは同じ牌を2枚持っているときにできます。');
      if (action.type === 'chi') {
        if (s.from !== 'kami') return ng('チーは上家（左の人）の捨て牌からだけできます。');
        if (!av.chi.length) return ng('チーは捨て牌と手の2枚で順子（並び）ができるときにできます。');
      }
      if (s.call !== action.type) return ng(hint ?? 'ここでは鳴かずに見送りましょう。');
      const lo = action.type === 'chi' ? (action.tile ?? av.chi[0]) : s.tile;
      if (action.type === 'chi' && s.chi && lo !== s.chi) return ng(hint ?? 'その組み合わせではなく、別の組み合わせでチーしてみましょう。');
      let use = [s.tile, s.tile];
      if (action.type === 'chi') {
        use = [0, 1, 2].map(k => fromIndex(toIndex(lo) + k));
        if (!use.includes(s.tile) || !av.chi.includes(lo)) return ng('その組み合わせではチーできません。');
        use.splice(use.indexOf(s.tile), 1);
      }
      const rest = [...st.hand];
      for (const t of use) rest.splice(rest.indexOf(t), 1);
      st.hand = rest;
      st.melds.push({ type: action.type, tile: lo, called: s.tile, from: s.from });
      const r = st.rivers[s.from].at(-1);
      r.called = true;
      st.ippatsu = false;
      st.phase = 'after-call';
      st.feedback = { ok: true, text: `${action.type === 'pon' ? 'ポン' : 'チー'}しました。鳴いた面子は右に表向きで置きます。続けて1枚切ります。` };
      // 鳴いたあと切る牌は同じ step の discard
      return { ok: true };
    }

    case 'kan': {
      if (st.phase !== 'draw') return ng('この教材では、自分で4枚そろえたとき（暗槓）だけカンします。');
      if (!av.kan) return ng('カンは同じ牌を4枚持っているときにできます。');
      if (!s.kan) return ng(hint ?? 'ここではカンしません。');
      const t = st.drawn;
      st.hand = st.hand.filter(x => x !== t);
      st.drawn = null;
      st.melds.push({ type: 'ankan', tile: t });
      advance(lesson, st, s.after);
      return { ok: true };
    }

    case 'pass':
      if (st.phase !== 'call') return ng('今は見送る場面ではありません。');
      if (s.call) {
        const label = { ron: 'ロン', pon: 'ポン', chi: 'チー' }[s.call];
        return ng(hint ?? `ここは「${label}」できます。押してみましょう。`);
      }
      advance(lesson, st, s.after);
      return { ok: true };
  }
  return ng('その操作はできません。');
}

function discardHint(st, t, expect, hint) {
  if (hint) return hint;
  const mine = concealed(st);
  const sh = tile => { const c = toCounts(mine); c[toIndex(tile)]--; return shanten(c, st.melds.length); };
  const a = sh(t), b = sh(expect[0]);
  const want = expect.map(tileName).join('か');
  if (a > b) return `${tileName(t)} を切るとアガリから遠くなります。ここでは ${want} を切ってみましょう。`;
  return `${tileName(t)} も悪くありませんが、ここでは ${want} を切ってみましょう。`;
}

function win(lesson, st, s, tile, tsumo) {
  const hand = tsumo ? concealed(st) : [...st.hand, tile];
  const r = score({
    hand, winTile: tile, tsumo, melds: st.melds.map(m => ({ type: m.type, tile: m.tile })),
    seatWind: lesson.seat ?? '2z', roundWind: lesson.round ?? '1z',
    riichi: st.riichi, ippatsu: st.ippatsu, rinshan: st.rinshan, haitei: !!s.haitei,
    doraIndicators: st.dora, uraIndicators: st.riichi ? parse(lesson.ura ?? '') : [],
  });
  if (!r.ok) return ng(r.reason);
  st.hand = sortTiles(hand.filter((_, k) => k !== hand.lastIndexOf(tile)));
  st.drawn = null;
  st.win = { tile, tsumo, from: tsumo ? null : s.from };
  if (!tsumo) st.rivers[s.from].at(-1).called = true;
  st.result = r;
  st.phase = 'won';
  st.feedback = { ok: true, text: s.after ?? (tsumo ? 'ツモ！アガリです。' : 'ロン！アガリです。') };
  return { ok: true };
}

// 台本どおりに進める操作の列（テストと「答えを見る」に使う）
export function solution(lesson, st) {
  const s = step(lesson, st);
  if (!s) return null;
  if (st.phase === 'say') return { type: 'next' };
  if (st.phase === 'draw') {
    if (s.tsumo) return { type: 'tsumo' };
    if (s.kan) return { type: 'kan' };
    if (s.riichi && !st.riichiPending) return { type: 'riichi' };
    return { type: 'discard', tile: asList(s.discard)[0] };
  }
  if (st.phase === 'call') {
    if (s.call === 'chi') return { type: 'chi', tile: s.chi ?? available(lesson, st).chi[0] };
    return { type: s.call ?? 'pass' };
  }
  if (st.phase === 'after-call') return { type: 'discard', tile: asList(s.discard)[0] };
  return null;
}
