// チュートリアルの画面。進行は engine.js、台本は lessons.js。
import { h } from '../js/util.js';
import { LESSONS, PARTS, findLesson } from './lessons.js';
import * as E from './engine.js';
import { toCounts, tileName, WIND_NAME, parse, doraFromIndicator } from './tiles.js';
import { shanten, waits } from './hand.js';
import { tileEl, tileRow } from './view.js';
import { resultView } from './result.js';
import { snapshot, play, settle } from './motion.js';

const SEAT_ORDER = ['1z', '2z', '3z', '4z'];
const rel = (seat, k) => SEAT_ORDER[(SEAT_ORDER.indexOf(seat) + k) % 4];

export function createTutorial(root, { done, onDone, onOpen }) {
  let lesson = null;
  let st = null;
  let msg = null;        // 直前の操作への言葉 { ok, text }
  let showAnswer = false;
  let hints = true;

  function open(id) {
    settle();
    lesson = id ? findLesson(id) : null;
    st = lesson ? E.start(lesson) : null;
    msg = null;
    showAnswer = false;
    document.body.classList.toggle('mj-in-lesson', !!lesson);
    render();
    window.scrollTo({ top: 0 });
  }

  // fromKey: 押した牌の data-key（演出で、そこから飛ばす）
  function send(action, fromKey) {
    settle();
    const prev = structuredClone(st);
    const before = snapshot(root);
    const prevMsg = msg?.text;
    const r = E.act(lesson, st, action);
    msg = r.ok ? st.feedback : { ok: false, text: r.text };
    showAnswer = false;
    if (r.ok && (st.phase === 'won' || st.phase === 'done')) onDone(lesson.id);
    render();
    play(root, prev, st, before, { ok: r.ok, fromKey, msgChanged: msg?.text !== prevMsg });
  }

  // 描き直してもスクロール位置が動かないようにする
  function render() {
    const y = window.scrollY;
    root.replaceChildren(lesson ? lessonView() : listView());
    if (window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' });
  }

  function listView() {
    const parts = Object.entries(PARTS).map(([part, label]) => h('section', { class: 'mj-part' },
      h('h2', { class: 'section-title' }, label),
      h('ol', { class: 'mj-lesson-list' }, LESSONS.filter(l => l.part === part).map(l => h('li', {},
        h('button', { class: `panel mj-lesson-card${done.has(l.id) ? ' done' : ''}`, type: 'button', onclick: () => onOpen(l.id) },
          h('span', { class: 'mj-check' }, done.has(l.id) ? '✓' : ''),
          h('span', { class: 'mj-lesson-text' }, h('strong', {}, l.title), h('span', { class: 'small muted' }, l.goal)),
        ))))));
    return h('div', { class: 'stack' },
      h('p', { class: 'muted' }, '上から順に進めると、牌の見方からアガリ・役までひととおり覚えられます。引く牌と相手の捨て牌は決まっているので、説明を読みながら操作してみましょう。'),
      h('p', { class: 'small muted' }, `済み ${LESSONS.filter(l => done.has(l.id)).length} / ${LESSONS.length}`),
      parts);
  }

  function lessonView() {
    const s = E.step(lesson, st);
    const idx = LESSONS.indexOf(lesson);
    const next = LESSONS[idx + 1];
    const finished = st.phase === 'won' || st.phase === 'done';
    return h('div', { class: 'mj-lesson stack' },
      h('div', { class: 'row' },
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => onOpen(null) }, '← レッスン一覧'),
        h('span', { class: 'tag' }, PARTS[lesson.part]),
        h('span', { class: 'spacer' }),
        h('label', { class: 'small mj-toggle' },
          h('input', { type: 'checkbox', checked: hints, onchange: e => { hints = e.target.checked; render(); } }), ' 待ちのヒント')),
      h('div', {},
        h('h2', { class: 'mj-title' }, lesson.title),
        h('p', { class: 'muted small mj-goal' }, `目標: ${lesson.goal}`)),
      finished ? null : explain(s),
      table(),
      finished ? null : myArea(),
      finished ? finishView(next) : null,
    );
  }

  function explain(s) {
    return h('div', { class: 'panel mj-explain', 'aria-live': 'polite' },
      // 間違いはいちばん上に。正解のあとの言葉は、今の指示（say）の下に
      msg && msg.text && !msg.ok ? h('p', { class: 'mj-msg ng' }, '❌ ', msg.text) : null,
      s?.say ? h('p', { class: 'mj-say' }, s.say) : null,
      msg && msg.text && msg.ok ? h('p', { class: 'mj-msg ok' }, '⭕ ', msg.text) : null,
      s?.show ? h('div', { class: 'mj-show' }, parse(s.show).map(t => tileEl(t, { size: 'md', label: true }))) : null,
      showAnswer ? h('p', { class: 'small mj-answer' }, '答え: ', answerText()) : null,
    );
  }

  function answerText() {
    const a = E.solution(lesson, st);
    if (!a) return '';
    return {
      next: '「次へ」を押す', tsumo: '「ツモ」を押す', ron: '「ロン」を押す', pon: '「ポン」を押す', chi: '「チー」を押す',
      kan: '「カン」を押す', riichi: '「リーチ」を押してから牌を切る', pass: passLabel() === '次へ' ? '「次へ」を押す（見送る）' : '「見送る」を押す',
      discard: `${a.tile ? tileName(a.tile) : ''} を切る`,
    }[a.type];
  }

  function passLabel() {
    const av = E.available(lesson, st);
    return !av.ron && !av.pon && !av.chi.length ? '次へ' : '見送る';
  }

  function riverEl(list, label, cls) {
    return h('div', { class: `mj-river ${cls}` },
      h('div', { class: 'mj-river-label' }, label),
      h('div', { class: 'mj-river-tiles' }, list.map((r, k) => tileEl(r.tile, { size: 'sm', side: r.riichi, mark: r.last, dim: r.called, key: `r:${cls}:${k}` }))));
  }

  function table() {
    const seat = lesson.seat ?? '2z';
    const name = (k, w) => `${k}（${WIND_NAME[w]}家）`;
    const dora = st.dora;
    return h('div', { class: 'mj-table' },
      riverEl(st.rivers.toimen, name('対面', rel(seat, 2)), 'toimen'),
      riverEl(st.rivers.kami, name('上家', rel(seat, 3)), 'kami'),
      h('div', { class: 'mj-center' },
        h('div', { class: 'small' }, `${WIND_NAME[lesson.round ?? '1z']}場`),
        dora.length ? h('div', { class: 'small' }, 'ドラ表示牌') : null,
        dora.length ? h('div', { class: 'mj-row' }, dora.map((t, k) => tileEl(t, { size: 'sm', key: `dora:${k}` }))) : null,
        h('div', { class: 'small' }, `ドラ: ${dora.map(t => tileName(doraFromIndicator(t))).join('・') || 'なし'}`)),
      riverEl(st.rivers.shimo, name('下家', rel(seat, 1)), 'shimo'),
      riverEl(st.river, `あなた（${WIND_NAME[seat]}家）${st.riichi ? '・リーチ中' : ''}`, 'me'),
    );
  }

  function myArea() {
    const av = E.available(lesson, st);
    const canDiscard = st.phase === 'draw' || st.phase === 'after-call';
    const onTile = (t, key) => (canDiscard ? () => send({ type: 'discard', tile: t }, key) : undefined);
    const seen = {};
    const hand = h('div', { class: 'mj-hand' },
      h('div', { class: 'mj-hand-tiles' },
        st.hand.map(t => {
          const key = `h:${t}:${seen[t] = (seen[t] ?? 0) + 1}`;
          return tileEl(t, { size: 'lg', onclick: onTile(t, key), key });
        }),
        st.drawn ? h('span', { class: 'mj-drawn' }, tileEl(st.drawn, { size: 'lg', onclick: onTile(st.drawn, 'd'), mark: true, key: 'd' })) : null),
      st.melds.length ? h('div', { class: 'mj-melds' }, st.melds.map((m, k) => meldEl(m, `m:${k}`))) : null);

    const btns = [];
    const b = (label, action, primary) => btns.push(h('button', { class: `btn${primary ? ' primary' : ''}`, type: 'button', onclick: () => send(action) }, label));
    if (st.phase === 'say') b('次へ', { type: 'next' }, true);
    if (st.phase === 'draw') {
      if (av.riichi || st.riichiPending) b(st.riichiPending ? 'リーチ取り消し' : 'リーチ', { type: 'riichi' });
      if (av.kan) b('カン', { type: 'kan' });
      if (av.tsumo) b('ツモ', { type: 'tsumo' });
    }
    if (st.phase === 'call') {
      if (av.ron) b('ロン', { type: 'ron' });
      if (av.pon) b('ポン', { type: 'pon' });
      if (av.chi.length === 1) b('チー', { type: 'chi', tile: av.chi[0] });
      else for (const lo of av.chi) {
        const seq = [0, 1, 2].map(k => `${Number(lo[0]) + k}${lo[1]}`);
        b(`チー（${seq.map(tileName).join('')}）`, { type: 'chi', tile: lo });
      }
      b(passLabel(), { type: 'pass' }, passLabel() === '次へ');
    }
    const prompt = canDiscard ? (st.riichiPending ? 'リーチ宣言中。切る牌をタップ' : '切る牌をタップ') : null;

    return h('div', { class: 'panel mj-me stack' },
      prompt ? h('div', { class: 'small muted' }, prompt) : null,
      hand,
      hints ? helper() : null,
      h('div', { class: 'row mj-actions' }, btns,
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn small ghost', type: 'button', onclick: () => { showAnswer = true; render(); } }, '答えを見る')),
    );
  }

  function helper() {
    const tiles = E.concealed(st);
    const c = toCounts(tiles);
    const m = st.melds.length;
    if (tiles.length % 3 === 2) {
      const sh = shanten(c, m);
      if (sh === -1) return h('div', { class: 'mj-helper ok' }, '✨ アガリの形になっています');
      return h('div', { class: 'mj-helper' }, sh === 0 ? '1枚切るとテンパイにできます' : `あと ${sh} 枚の入れ替えでテンパイ（${sh}向聴）`);
    }
    const sh = shanten(c, m);
    if (sh > 0) return h('div', { class: 'mj-helper' }, `あと ${sh} 枚の入れ替えでテンパイ（${sh}向聴）`);
    const w = waits(c, m);
    return h('div', { class: 'mj-helper ok' }, 'テンパイ　待ち: ', w.map(t => tileEl(t, { size: 'sm' })),
      ' ', w.map(tileName).join('・'), E.furiten(st) ? h('strong', { class: 'mj-furiten' }, '（フリテン）') : null);
  }

  function finishView(next) {
    const r = st.result;
    return h('div', { class: 'stack mj-finish' },
      r ? h('div', { class: 'panel mj-win' },
        h('h3', {}, st.win.tsumo ? '🎉 ツモ！' : '🎉 ロン！'),
        h('div', { class: 'mj-hand-tiles' }, st.hand.map(t => tileEl(t, { size: 'md' })),
          h('span', { class: 'mj-drawn' }, tileEl(st.win.tile, { size: 'md', mark: true }))),
        st.melds.length ? h('div', { class: 'mj-melds' }, st.melds.map(meldEl)) : null,
        resultView(r)) : null,
      h('div', { class: 'panel' },
        h('h3', {}, '✅ このレッスンのまとめ'),
        h('p', {}, lesson.summary)),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => open(lesson.id) }, 'もう一度'),
        next ? h('button', { class: 'btn primary', type: 'button', onclick: () => onOpen(next.id) }, `次へ: ${next.title}`)
          : h('button', { class: 'btn primary', type: 'button', onclick: () => onOpen(null) }, 'レッスン一覧へ')),
    );
  }

  return {
    open,
    get current() { return lesson?.id ?? null; },
  };
}

// 鳴いた面子（鳴いた牌は横向き。暗槓は両端を裏向き）
export function meldEl(m, key) {
  const i = Number(m.tile[0]);
  let tiles;
  if (m.type === 'chi') {
    const seq = [0, 1, 2].map(k => `${i + k}${m.tile[1]}`);
    const called = m.called ?? seq[0];
    tiles = [called, ...seq.filter(t => t !== called)].map((t, k) => tileEl(t, { size: 'md', side: k === 0 }));
  } else if (m.type === 'pon') {
    tiles = [0, 1, 2].map(k => tileEl(m.tile, { size: 'md', side: k === (m.from === 'kami' ? 0 : m.from === 'toimen' ? 1 : 2) }));
  } else if (m.type === 'minkan') {
    tiles = [0, 1, 2, 3].map(k => tileEl(m.tile, { size: 'md', side: k === 0 }));
  } else {
    tiles = [h('span', { class: 'mj-tile md back' }), tileEl(m.tile, { size: 'md' }), tileEl(m.tile, { size: 'md' }), h('span', { class: 'mj-tile md back' })];
  }
  return h('span', { class: 'mj-meld', dataset: key ? { key } : undefined, title: { chi: 'チー', pon: 'ポン', minkan: '明槓', ankan: '暗槓' }[m.type] }, tiles);
}
