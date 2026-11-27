// 符点計算モード。牌を自由に選んで、アガったときの役・符・点数を確かめる。
import { h } from '../js/util.js';
import { ALL_TILES, sortTiles, toCounts, toIndex, tileName, parse, WIND_NAME } from './tiles.js';
import { shanten, waits } from './hand.js';
import { score, meldTiles } from './score.js';
import { tileEl } from './view.js';
import { meldEl } from './tutorial.js';
import { resultView } from './result.js';

const MODES = [
  ['hand', '手牌'], ['pon', 'ポン'], ['chi', 'チー'], ['minkan', '明槓'], ['ankan', '暗槓'], ['dora', 'ドラ表示牌'], ['ura', '裏ドラ表示牌'],
];
const FLAGS = [
  ['riichi', 'リーチ'], ['doubleRiichi', 'ダブルリーチ'], ['ippatsu', '一発'], ['haitei', '海底・河底（最後の牌）'],
  ['rinshan', '嶺上開花'], ['chankan', '槍槓'], ['tenhou', '天和・地和（最初のツモ）'],
];

const SAMPLES = [
  { label: '平和ツモ', hand: '234m456p678s23s55m', win: '4s', tsumo: true },
  { label: 'リーチ・タンヤオ', hand: '234m567p66s345s78p', win: '6p', riichi: true },
  { label: '役牌 中のポン', hand: '234m56p789s11p', win: '4p', melds: [{ type: 'pon', tile: '7z' }] },
  { label: '七対子', hand: '1199m2266p3355s7z', win: '7z' },
  { label: '混一色・満貫', hand: '234m666m78m11z777z', win: '9m' },
  { label: '国士無双', hand: '19m19p19s1234566z', win: '7z' },
];

function empty() {
  return {
    hand: [], win: null, melds: [], dora: [], ura: [], mode: 'hand',
    tsumo: false, seatWind: '2z', roundWind: '1z', honba: 0,
    riichi: false, doubleRiichi: false, ippatsu: false, haitei: false, rinshan: false, chankan: false, tenhou: false,
  };
}

export function createCalc(root) {
  let c = empty();
  let note = '';

  const need = () => 13 - c.melds.length * 3; // 和了牌を除いた手の内の枚数
  const used = () => toCounts([...c.hand, ...(c.win ? [c.win] : []), ...c.melds.flatMap(meldTiles), ...c.dora, ...c.ura]);

  function add(tile) {
    note = '';
    const u = used();
    const mode = c.mode;
    if (mode === 'hand') {
      if (u[toIndex(tile)] >= 4) return say(`${tileName(tile)} はもう4枚使っています`);
      if (c.hand.length < need()) c.hand.push(tile);
      else if (!c.win) c.win = tile;
      else return say('手牌はいっぱいです。牌をタップして外してから入れてください');
    } else if (mode === 'dora' || mode === 'ura') {
      if (u[toIndex(tile)] >= 4) return say(`${tileName(tile)} はもう4枚使っています`);
      if (c[mode].length >= 5) return say('表示牌は5枚までです');
      c[mode].push(tile);
    } else {
      if (c.melds.length >= 4) return say('鳴きは4つまでです');
      const meld = { type: mode, tile };
      if (mode === 'chi' && (toIndex(tile) >= 27 || toIndex(tile) % 9 > 6)) return say('チーは並びの一番小さい牌（1〜7の数牌）を選びます');
      const add = toCounts(meldTiles(meld));
      if (add.some((n, i) => n + u[i] > 4)) return say('同じ牌が5枚以上になってしまいます');
      if (c.hand.length + (c.win ? 1 : 0) > need() - 3 + 1) return say('手牌を3枚減らしてから鳴きを足してください');
      c.melds.push(meld);
    }
    c.hand = sortTiles(c.hand);
    render();
  }
  function say(text) { note = text; render(); }

  function load(sample) {
    c = { ...empty(), ...sample, hand: sortTiles(parse(sample.hand)), melds: sample.melds ?? [] };
    note = '';
    render();
  }

  function render() {
    root.replaceChildren(h('div', { class: 'mj-calc stack' },
      h('p', { class: 'muted' }, '牌をタップして手牌を作ると、アガったときの役・符・点数が出ます。最後に入れた1枚が和了牌（アガった牌）です。'),
      h('div', { class: 'row mj-samples' }, h('span', { class: 'small muted' }, '例:'),
        SAMPLES.map(s => h('button', { class: 'btn small', type: 'button', onclick: () => load(s) }, s.label))),
      handPanel(),
      palette(),
      options(),
      resultPanel(),
    ));
  }

  function handPanel() {
    const remove = (list, i) => () => { list.splice(i, 1); note = ''; render(); };
    return h('div', { class: 'panel stack mj-calc-hand' },
      h('div', { class: 'row' },
        h('strong', {}, `手牌 ${c.hand.length}/${need()}`), h('span', { class: 'small muted' }, '＋ 和了牌'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => { c = { ...empty(), mode: c.mode }; note = ''; render(); } }, '全部消す')),
      h('div', { class: 'mj-hand-tiles' },
        c.hand.map((t, i) => tileEl(t, { size: 'lg', onclick: remove(c.hand, i) })),
        h('span', { class: 'mj-drawn' }, c.win ? tileEl(c.win, { size: 'lg', mark: true, onclick: () => { c.win = null; render(); } })
          : h('span', { class: 'mj-tile lg empty' }, '和了'))),
      c.melds.length ? h('div', { class: 'mj-melds' }, c.melds.map((m, i) => h('button', {
        class: 'mj-meld-btn', type: 'button', title: 'タップで外す', onclick: remove(c.melds, i),
      }, meldEl({ ...m, from: 'kami' })))) : null,
      h('div', { class: 'row small' },
        h('span', {}, 'ドラ表示牌:'), c.dora.length ? c.dora.map((t, i) => tileEl(t, { size: 'sm', onclick: remove(c.dora, i) })) : h('span', { class: 'muted' }, 'なし'),
        h('span', {}, '　裏ドラ表示牌:'), c.ura.length ? c.ura.map((t, i) => tileEl(t, { size: 'sm', onclick: remove(c.ura, i) })) : h('span', { class: 'muted' }, 'なし')),
      h('p', { class: 'small muted' }, '入れた牌はタップで外せます。'),
      note ? h('p', { class: 'mj-msg ng' }, note) : null,
    );
  }

  function palette() {
    const u = used();
    return h('div', { class: 'panel stack' },
      h('div', { class: 'row mj-modes', role: 'group', 'aria-label': '入れる先' },
        h('span', { class: 'small muted' }, '入れる先:'),
        MODES.map(([k, label]) => h('button', {
          class: `btn small${c.mode === k ? ' primary' : ''}`, type: 'button', 'aria-pressed': String(c.mode === k),
          onclick: () => { c.mode = k; note = ''; render(); },
        }, label))),
      c.mode === 'chi' ? h('p', { class: 'small muted' }, 'チーは並びの一番小さい牌を選びます（例: 345 なら 3）。') : null,
      h('div', { class: 'mj-palette' }, ['m', 'p', 's', 'z'].map(suit => h('div', { class: 'mj-palette-row' },
        ALL_TILES.filter(t => t[1] === suit).map(t => tileEl(t, { size: 'md', onclick: () => add(t), dim: u[toIndex(t)] >= 4 }))))),
    );
  }

  function options() {
    const sel = (key, label, values) => h('label', { class: 'mj-opt' }, label,
      h('select', { class: 'input', onchange: e => { c[key] = e.target.value; render(); } },
        values.map(([v, text]) => h('option', { value: v, selected: c[key] === v }, text))));
    return h('div', { class: 'panel stack' },
      h('div', { class: 'row' },
        h('div', { class: 'mj-seg', role: 'group', 'aria-label': 'アガリ方' },
          [[false, 'ロン'], [true, 'ツモ']].map(([v, text]) => h('button', {
            class: `btn small${c.tsumo === v ? ' primary' : ''}`, type: 'button', 'aria-pressed': String(c.tsumo === v),
            onclick: () => { c.tsumo = v; render(); },
          }, text))),
        sel('seatWind', '自風', ['1z', '2z', '3z', '4z'].map(w => [w, `${WIND_NAME[w]}${w === '1z' ? '（親）' : '（子）'}`])),
        sel('roundWind', '場風', ['1z', '2z', '3z', '4z'].map(w => [w, `${WIND_NAME[w]}場`])),
        h('label', { class: 'mj-opt' }, '本場',
          h('input', { class: 'input mj-num', type: 'number', min: 0, max: 20, value: c.honba, onchange: e => { c.honba = Math.max(0, Math.min(20, Number(e.target.value) || 0)); render(); } }))),
      h('div', { class: 'row mj-flags' }, FLAGS.map(([k, label]) => h('label', { class: 'mj-flag' },
        h('input', { type: 'checkbox', checked: c[k], onchange: e => { c[k] = e.target.checked; render(); } }), ' ', label))),
    );
  }

  function resultPanel() {
    const body = [];
    if (c.hand.length < need() || !c.win) {
      if (c.hand.length === need()) {
        const cnt = toCounts(c.hand);
        const sh = shanten(cnt, c.melds.length);
        if (sh === 0) {
          const w = waits(cnt, c.melds.length);
          body.push(h('p', {}, 'テンパイしています。待ち: ', w.map(t => tileEl(t, { size: 'sm' })), ' ', w.map(tileName).join('・')),
            h('p', { class: 'small muted' }, '待ち牌を和了牌として入れると点数が出ます。'));
        } else body.push(h('p', {}, `あと ${sh} 枚の入れ替えでテンパイ（${sh}向聴）。`));
      } else {
        body.push(h('p', { class: 'muted' }, `あと ${need() - c.hand.length + (c.win ? 0 : 1)} 枚入れてください。`));
      }
    } else {
      const isDealerFirst = c.seatWind === '1z';
      const r = score({
        hand: [...c.hand, c.win], winTile: c.win, melds: c.melds, tsumo: c.tsumo,
        seatWind: c.seatWind, roundWind: c.roundWind, honba: c.honba,
        riichi: c.riichi && !c.doubleRiichi, doubleRiichi: c.doubleRiichi, ippatsu: c.ippatsu, haitei: c.haitei,
        rinshan: c.rinshan, chankan: c.chankan,
        tenhou: c.tenhou && isDealerFirst, chiihou: c.tenhou && !isDealerFirst,
        doraIndicators: c.dora, uraIndicators: c.ura,
      });
      body.push(r.ok ? resultView(r) : h('p', { class: 'mj-msg ng' }, r.reason));
      if (r.ok && c.ura.length && !(c.riichi || c.doubleRiichi)) body.push(h('p', { class: 'small muted' }, '裏ドラはリーチしたときだけ数えます。'));
    }
    return h('div', { class: 'panel mj-calc-result', 'aria-live': 'polite' }, h('h3', {}, '結果'), body);
  }

  render();
  return { render };
}
