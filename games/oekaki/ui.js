// お絵描き伝言の画面
// 他の人が提出するたびに状態が届くので、描きかけの絵や入力中の文字が消えないよう、
// 「作業エリア」はステップが変わったときだけ作り直す。
import { h } from '../../js/util.js';
import { CANVAS_H, CANVAS_W, PALETTE, PROMPTS, TEXT_MAX, WIDTHS } from './logic.js';

const SCALE = 2; // 高解像度画面でもにじまないように

export function paint(canvas, drawing) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of drawing?.strokes ?? []) {
    ctx.strokeStyle = PALETTE[s.c];
    ctx.lineWidth = s.w;
    ctx.beginPath();
    ctx.moveTo(s.p[0], s.p[1]);
    if (s.p.length === 2) ctx.lineTo(s.p[0] + 0.1, s.p[1]);
    for (let i = 2; i < s.p.length; i += 2) ctx.lineTo(s.p[i], s.p[i + 1]);
    ctx.stroke();
  }
}

function canvasEl() {
  return h('canvas', { class: 'ok-canvas', width: CANVAS_W * SCALE, height: CANVAS_H * SCALE });
}

function drawingEl(drawing) {
  const c = canvasEl();
  paint(c, drawing);
  return c;
}

// お絵描きパッド。strokes 配列を直接書き換える
function drawPad(strokes) {
  let color = 0;
  let width = WIDTHS[0];
  let current = null;
  const canvas = canvasEl();
  canvas.style.touchAction = 'none';
  const redraw = () => paint(canvas, { strokes });

  const point = e => {
    const r = canvas.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * CANVAS_W), Math.round(((e.clientY - r.top) / r.height) * CANVAS_H)];
  };
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    current = { c: color, w: width, p: point(e) };
    strokes.push(current);
    redraw();
  });
  canvas.addEventListener('pointermove', e => {
    if (!current) return;
    const [x, y] = point(e);
    const n = current.p.length;
    if (Math.abs(x - current.p[n - 2]) + Math.abs(y - current.p[n - 1]) < 2) return;
    current.p.push(x, y);
    redraw();
  });
  const end = () => (current = null);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  const tools = h('div', { class: 'ok-tools' });
  const renderTools = () => {
    tools.replaceChildren(
      ...PALETTE.map((c, i) =>
        h('button', {
          class: ['ok-color', i === color && 'on'].filter(Boolean).join(' '),
          type: 'button',
          style: { background: c },
          'aria-label': i === PALETTE.length - 1 ? '消しゴム（白）' : `色${i + 1}`,
          onclick: () => { color = i; renderTools(); },
        }, i === PALETTE.length - 1 ? '🧽' : ''),
      ),
      ...WIDTHS.map(w =>
        h('button', { class: ['btn small', w === width && 'primary'].filter(Boolean).join(' '), type: 'button', onclick: () => { width = w; renderTools(); } },
          h('span', { class: 'ok-width', style: { width: `${w}px`, height: `${w}px` } }),
        ),
      ),
      h('button', { class: 'btn small', type: 'button', onclick: () => { strokes.pop(); redraw(); } }, '↩ 戻す'),
      h('button', { class: 'btn small', type: 'button', onclick: () => { if (confirm('全部消しますか？')) { strokes.length = 0; redraw(); } } }, '🗑 全消し'),
    );
  };
  renderTools();
  redraw();
  return h('div', { class: 'stack' }, canvas, tools);
}

export function createUI(root, api) {
  let view = null;
  let workKey = null;
  // 提出を取り消して直すときのために、描きかけ・書きかけをステップごとに覚えておく
  let draft = { step: -1, strokes: [], text: '' };
  const status = h('div', {});
  const work = h('div', {});
  root.replaceChildren(
    h('div', { class: 'table' },
      status,
      work,
      h('details', { style: { marginTop: '12px' } },
        h('summary', { class: 'small' }, 'ルール'),
        h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
      ),
    ),
  );

  const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';

  function renderStatus() {
    const label = { write: '✏️ お題を書く', draw: '🎨 絵を描く', guess: '🤔 何の絵か当てる' }[view.kind];
    status.replaceChildren(
      view.phase === 'play'
        ? h('div', {},
            h('div', { class: 'row', style: { justifyContent: 'space-between' } },
              h('strong', {}, `${view.step + 1} / ${view.steps}：${label}`),
              h('span', { class: 'small' }, `提出 ${view.players.filter(p => p.done).length} / ${view.players.length}`),
            ),
            h('div', { class: 'seats' },
              view.players.map(p => h('div', { class: ['seat', p.id === view.me && 'me', !p.done && 'turn'].filter(Boolean).join(' ') },
                h('div', { class: 'name' }, p.name), h('div', { class: 'small' }, p.done ? '✅ 提出済み' : '✍️ 作業中'))),
            ),
          )
        : h('strong', {}, '📖 ノートを見返そう'),
    );
  }

  function renderWork() {
    if (view.phase === 'reveal') return renderReveal();
    if (!view.me) return work.replaceChildren(h('p', { class: 'muted' }, '👀 観戦中です'));
    if (view.mine) {
      return work.replaceChildren(
        h('div', { class: 'result-box' },
          h('p', { style: { margin: 0 } }, view.mine.kind === 'draw' ? '🎨 絵を提出しました' : `✅「${view.mine.text}」で提出しました`),
          h('p', { class: 'small muted' }, 'みんなの提出を待っています…'),
          h('button', { class: 'btn small', type: 'button', onclick: () => api.send({ type: 'unsubmit' }) }, '取り消して直す'),
        ),
      );
    }
    if (draft.step !== view.step) draft = { step: view.step, strokes: [], text: '' };
    if (view.kind === 'draw') {
      const strokes = draft.strokes;
      work.replaceChildren(
        h('div', { class: 'stack' },
          h('div', { class: 'result-box' }, h('span', { class: 'small muted' }, 'この文章を絵にしてください（文字を書くのはなし）'), h('div', { class: 'big-word' }, view.prompt?.text ?? '')),
          drawPad(strokes),
          h('div', { class: 'game-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'submit', drawing: { strokes } }) }, '🎨 この絵で提出'),
          ),
        ),
      );
      return;
    }
    // 文章を書く（最初のお題 or 絵を見て当てる）
    const input = h('input', {
      class: 'input',
      maxlength: TEXT_MAX,
      placeholder: view.kind === 'write' ? '例: 空を飛ぶ犬' : 'これは何の絵？',
      value: draft.text,
      oninput: e => (draft.text = e.target.value),
    });
    const submit = e => {
      e.preventDefault();
      if (input.value.trim()) api.send({ type: 'submit', text: input.value });
    };
    work.replaceChildren(
      h('form', { class: 'stack', onsubmit: submit },
        view.kind === 'guess'
          ? h('div', { class: 'stack' }, h('span', { class: 'small muted' }, '前の人の絵です。何を描いたか文章で答えてください'), drawingEl(view.prompt?.drawing))
          : h('p', { style: { margin: 0 } }, '次の人が絵に描くお題を書いてください。ちょっと変なお題ほど盛り上がります。'),
        h('div', { class: 'row' },
          h('div', { style: { flex: 1, minWidth: '200px' } }, input),
          view.kind === 'write'
            ? h('button', { class: 'btn', type: 'button', onclick: () => { input.value = draft.text = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]; } }, '🎲 おまかせ')
            : null,
          h('button', { class: 'btn primary', type: 'submit' }, '提出'),
        ),
      ),
    );
  }

  function renderReveal() {
    const shown = view.chains.slice(0, view.revealed);
    work.replaceChildren(
      h('div', { class: 'stack' },
        shown.map(chain =>
          h('section', { class: 'result-box' },
            h('h3', {}, `📒 ${nameOf(chain.owner)} さんのノート`),
            h('div', { class: 'ok-chain' },
              chain.entries.map((e, i) =>
                h('div', { class: 'ok-entry' },
                  h('div', { class: 'small muted' }, `${i + 1}. ${nameOf(e.by)} ${e.kind === 'write' ? 'のお題' : e.kind === 'draw' ? 'の絵' : 'の答え'}`),
                  e.kind === 'draw' ? drawingEl(e.drawing) : h('div', { class: 'ok-text' }, e.text),
                ),
              ),
            ),
          ),
        ),
        view.me
          ? h('div', { class: 'game-actions' },
              view.revealed < view.chains.length
                ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'reveal', to: view.revealed + 1 }) }, `次のノートを開く（${view.revealed} / ${view.chains.length}）`)
                : h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ'),
            )
          : null,
      ),
    );
  }

  return {
    update(nextView) {
      view = nextView;
      renderStatus();
      const key = view.phase === 'reveal' ? `reveal-${view.revealed}` : `${view.step}-${view.mine ? 'done' : 'open'}-${view.me}`;
      if (key !== workKey) {
        workKey = key;
        renderWork();
      }
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
