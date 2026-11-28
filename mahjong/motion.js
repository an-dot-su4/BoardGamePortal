// チュートリアルの演出。画面は操作のたびに描き直すので、描き直す前の牌の位置（snapshot）と
// 前後の状態の差から、何が動いたかを決めて再生する。「動きを減らす」設定のときは何もしない。
import { h } from '../js/util.js';
import { floatText, spotlight, confetti } from '../js/fx.js';
import { tileEl } from './view.js';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.3,.7,.3,1)';

// 再生中の演出（次の操作が来たら最後まで飛ばして片づける）
const active = new Set();
const timers = new Set();
export function settle() {
  for (const a of [...active]) a.finish();
  active.clear();
  for (const t of timers) clearTimeout(t);
  timers.clear();
}
function later(fn, ms) {
  const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
  timers.add(t);
}
function track(anim) {
  active.add(anim);
  const off = () => active.delete(anim);
  anim.addEventListener('finish', off);
  anim.addEventListener('cancel', off);
  return anim;
}

export const T = { discard: 320, settle: 260, enter: 380, draw: 320, text: 260 };

// data-key の付いた要素の位置を覚える
export function snapshot(root) {
  const map = new Map();
  for (const el of root.querySelectorAll('[data-key]')) map.set(el.dataset.key, el.getBoundingClientRect());
  return map;
}

// from（DOMRect）の位置から to（要素）の位置へ、牌を1枚すべらせる。着くまで to は隠す
function flyTile(from, to, tile, { delay = 0, duration = T.discard } = {}) {
  if (!from || !to) return;
  const b = to.getBoundingClientRect();
  const el = tileEl(tile, { size: 'md' });
  el.classList.add('mj-fly');
  Object.assign(el.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px` });
  document.body.appendChild(el);
  to.style.visibility = 'hidden';
  const side = to.classList.contains('side');
  // 横向きの牌は回したあとの見た目の幅が高さになる
  const scale = (side ? b.height : b.width) / from.width;
  const dx = b.left + b.width / 2 - (from.left + from.width / 2);
  const dy = b.top + b.height / 2 - (from.top + from.height / 2);
  const anim = el.animate([
    { transform: 'translate(0, 0) scale(1)' },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 18}px) scale(${(1 + scale) / 2 + 0.06})`, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${side ? -90 : 0}deg)` },
  ], { duration, delay, easing: EASE, fill: 'both' });
  const done = () => { el.remove(); to.style.visibility = ''; };
  anim.addEventListener('finish', done);
  anim.addEventListener('cancel', done);
  track(anim);
}

function appear(el, frames, { delay = 0, duration = T.enter } = {}) {
  if (el) track(el.animate(frames, { duration, delay, easing: EASE, fill: 'backwards' }));
}

const FROM_SEAT = {
  kami: 'translate(-60px, 0) rotate(-20deg)',
  toimen: 'translate(0, -50px) rotate(10deg)',
  shimo: 'translate(60px, 0) rotate(20deg)',
};

/**
 * 操作のあとに演出を再生する。
 * prev / st: 操作の前後の状態、before: 描き直す前の snapshot、ctx: { ok, fromKey（押した牌の key） }
 */
export function play(root, prev, st, before, ctx) {
  if (reduced()) return;
  const q = k => root.querySelector(`[data-key="${CSS.escape(k)}"]`);

  if (!ctx.ok) {
    // 間違い: 押した牌と言葉をゆらす
    const t = ctx.fromKey && q(ctx.fromKey);
    t?.animate([{ transform: 'none' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 360 });
    appear(root.querySelector('.mj-msg'), [{ transform: 'translateX(-8px)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 300 });
    return;
  }

  let delay = 0;

  // 1. 自分の捨て牌: 手から河へ
  if (st.river.length > prev.river.length) {
    const i = st.river.length - 1;
    flyTile(before.get(ctx.fromKey), q(`r:me:${i}`), st.river[i].tile);
    delay = T.discard;
    if (st.river[i].riichi) floatText(q(`r:me:${i}`) ?? root, 'リーチ！', { color: '#ffd36b', delay: T.discard });
  }

  // 2. 手牌の並び直し（FLIP）。引いた牌が手に入るときは、引いた牌の位置から
  for (const el of root.querySelectorAll('[data-key^="h:"]')) {
    let old = before.get(el.dataset.key);
    if (!old && prev.drawn === el.dataset.tile) old = before.get('d');
    if (!old) continue;
    const now = el.getBoundingClientRect();
    const dx = old.left - now.left, dy = old.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: T.settle, easing: EASE });
  }

  // 3. 鳴き・カン: 鳴いた牌が河から面子へ
  if (st.melds.length > prev.melds.length) {
    const m = st.melds.at(-1);
    const meld = q(`m:${st.melds.length - 1}`);
    appear(meld, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'none' }], { duration: 420 });
    if (m.from) {
      const idx = prev.rivers[m.from].length - 1;
      const target = meld?.querySelector('.mj-tile.side') ?? meld;
      flyTile(before.get(`r:${m.from}:${idx}`), target, m.called, { duration: 380 });
    }
    const label = { pon: 'ポン！', chi: 'チー！', ankan: 'カン！' }[m.type];
    if (label && meld) floatText(meld, label, { color: '#ffd36b' });
    delay = Math.max(delay, 380);
  }

  // 4. 他家の捨て牌: その人の方向からすべり込む
  for (const seat of ['shimo', 'toimen', 'kami']) {
    if (st.rivers[seat].length > prev.rivers[seat].length) {
      const el = q(`r:${seat}:${st.rivers[seat].length - 1}`);
      appear(el, [{ transform: FROM_SEAT[seat], opacity: 0 }, { transform: 'none', opacity: 1 }], { delay });
      delay += T.enter;
    }
  }

  // 5. 引いた牌: 上から入ってくる
  if (st.drawn && (st.i !== prev.i || !prev.drawn)) {
    appear(q('d'), [{ transform: 'translateY(-36px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay, duration: T.draw });
    if (prev.dora.length < st.dora.length) {
      appear(q(`dora:${st.dora.length - 1}`), [{ transform: 'rotateY(90deg)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { delay, duration: 500 });
    }
    delay += T.draw;
  }

  // 6. 説明の言葉: 牌が動き終わるころに出す
  const ex = root.querySelector('.mj-explain');
  if (ex && (st.i !== prev.i || ctx.msgChanged)) {
    appear(ex, [{ opacity: 0.25, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { delay: Math.max(0, delay - 120), duration: T.text });
  }

  // 7. アガリ
  if (st.phase === 'won' && prev.phase !== 'won') {
    const big = st.result.yakuman || st.result.han >= 5;
    later(() => {
      spotlight(h('div', { class: 'mj-spot' }, st.win.tsumo ? 'ツモ！' : 'ロン！'), { duration: 1200 });
      if (big) confetti({ count: 80 });
    }, delay);
    const win = root.querySelector('.mj-win');
    appear(win, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { delay: delay + 500, duration: 450 });
    if (win) later(() => win.scrollIntoView({ behavior: 'smooth', block: 'start' }), delay + 700);
  } else if (st.phase === 'done' && prev.phase !== 'done') {
    appear(root.querySelector('.mj-finish'), [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 400 });
  }
}
