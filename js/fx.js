// 画面の演出の小さな道具（ゲームの ui.js から使う）
//
// ゲームの画面は状態が変わるたびに丸ごと描き直すので、CSS のアニメーションは描き直しで最初からやり直しになる。
// そこで「いつ始まったか」を覚えておき、描き直したときは animation-delay を負にして途中から続ける（Anim）。
// 飛んでいくアイコンや紙吹雪は、描き直しの影響を受けない body 直下の層に出す。
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Anim {
  constructor() {
    this.started = new Map();
  }
  // key の演出を今から始める（すでに始まっていれば何もしない）
  start(key) {
    if (!this.started.has(key)) this.started.set(key, performance.now());
  }
  // 要素に付ける { class, style }。演出中でなければ null。dur はミリ秒
  attrs(key, cls, dur) {
    const t = this.started.get(key);
    if (t === undefined) return null;
    const elapsed = performance.now() - t;
    if (elapsed > dur) {
      this.started.delete(key);
      return null;
    }
    return { cls, style: { animationDelay: `${-Math.round(elapsed)}ms` } };
  }
  clear() {
    this.started.clear();
  }
}

// h() の attrs に混ぜる: withAnim(anim, 'key', 'cls', 600, { class: 'a', ... })
export function withAnim(anim, key, cls, dur, attrs = {}) {
  const a = anim.attrs(key, cls, dur);
  if (!a) return attrs;
  return { ...attrs, class: [attrs.class, a.cls].filter(Boolean).join(' '), style: { ...(attrs.style ?? {}), ...a.style } };
}

let layer = null;
function fxLayer() {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

export function clearFx() {
  layer?.remove();
  layer = null;
}

const center = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const rectOf = x => (x instanceof Element ? x.getBoundingClientRect() : x);

// from から to へ、content（文字か要素）を飛ばす。from / to は要素か DOMRect
export function fly(from, to, content, { duration = 650, delay = 0, scale = 1, className = '' } = {}) {
  if (reduced() || !from || !to) return;
  const a = center(rectOf(from));
  const b = center(rectOf(to));
  if (!a.x && !a.y) return;
  const el = document.createElement('div');
  el.className = `fx-fly ${className}`;
  if (typeof content === 'string') el.textContent = content;
  else el.appendChild(content);
  el.style.left = `${a.x}px`;
  el.style.top = `${a.y}px`;
  fxLayer().appendChild(el);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const anim = el.animate(
    [
      { transform: `translate(-50%, -50%) scale(${0.6 * scale})`, opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.15}px), calc(-50% + ${dy * 0.15 - 30}px)) scale(${1.15 * scale})`, opacity: 1, offset: 0.25 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${0.7 * scale})`, opacity: 0.9 },
    ],
    { duration, delay, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'both' },
  );
  anim.onfinish = () => el.remove();
}

// at の位置に、文字を浮かび上がらせて消す（「+2」など）
export function floatText(at, text, { color = '#ffd36b', delay = 0 } = {}) {
  if (reduced() || !at) return;
  const p = center(rectOf(at));
  const el = document.createElement('div');
  el.className = 'fx-float';
  el.textContent = text;
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
  el.style.color = color;
  fxLayer().appendChild(el);
  const anim = el.animate(
    [
      { transform: 'translate(-50%, -30%) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%, -90%) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -190%) scale(1)', opacity: 0 },
    ],
    { duration: 1100, delay, easing: 'ease-out', fill: 'both' },
  );
  anim.onfinish = () => el.remove();
}

// 画面の中央に、要素を大きく見せてから消す（使った札の紹介など）
export function spotlight(content, { duration = 1100, from = null } = {}) {
  if (reduced()) return;
  const el = document.createElement('div');
  el.className = 'fx-spot';
  el.appendChild(content);
  fxLayer().appendChild(el);
  const start = from ? center(rectOf(from)) : null;
  const sx = start ? `${start.x - innerWidth / 2}px` : '0px';
  const sy = start ? `${start.y - innerHeight / 2}px` : '40px';
  const anim = el.animate(
    [
      { transform: `translate(calc(-50% + ${sx}), calc(-50% + ${sy})) scale(.5)`, opacity: 0 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%, -60%) scale(.9)', opacity: 0 },
    ],
    { duration, easing: 'ease-out', fill: 'both' },
  );
  anim.onfinish = () => el.remove();
}

// 紙吹雪
export function confetti({ count = 90 } = {}) {
  if (reduced()) return;
  const colors = ['#e8524a', '#ffd36b', '#3b82f6', '#22a35a', '#9b5de5', '#f97316'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'fx-confetti';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.background = colors[i % colors.length];
    fxLayer().appendChild(el);
    const drift = (Math.random() - 0.5) * 200;
    const anim = el.animate(
      [
        { transform: `translate(0, -20px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${drift}px, ${innerHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: 0.9 },
      ],
      { duration: 1800 + Math.random() * 1600, delay: Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' },
    );
    anim.onfinish = () => el.remove();
  }
}

// 画面を横切る風（台風）
export function gust(text = '🌀') {
  if (reduced()) return;
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div');
    el.className = 'fx-gust';
    el.textContent = i % 2 ? '💨' : text;
    el.style.top = `${15 + i * 12}vh`;
    fxLayer().appendChild(el);
    const anim = el.animate(
      [{ transform: 'translateX(-15vw) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateX(110vw) rotate(720deg)', opacity: 0 }],
      { duration: 1300, delay: i * 90, easing: 'ease-in', fill: 'both' },
    );
    anim.onfinish = () => el.remove();
  }
}
