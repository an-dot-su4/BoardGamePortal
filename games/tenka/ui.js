// 天下札の画面
import { h } from '../../js/util.js';
import { CARDS, KINGDOM, PRESETS, SETS } from './cards/index.js';
import { cardEl, TYPE_LABEL } from './cardview.js';

const BASIC_ROW = ['zeni', 'gin', 'kin', 'ta', 'shouen', 'kuni', 'tatari'];
const isType = (id, t) => CARDS[id].types.includes(t);

// ---- ロビーの設定（ホストだけ変更できる）----

export function renderOptions(root, options, { editable, onChange }) {
  const set = patch => onChange({ ...options, ...patch });
  const inSets = KINGDOM.filter(c => options.sets.includes(c.set));
  const banned = new Set(options.bans);
  const usable = inSets.filter(c => !banned.has(c.id)).length;

  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '⛩️ 天下札の設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, '使う時代'),
      h('div', { class: 'row' },
        SETS.map(s =>
          h('label', { class: 'tk-set-check', title: s.feature },
            h('input', {
              type: 'checkbox',
              checked: options.sets.includes(s.id),
              disabled: !editable || !s.ready || (options.sets.length === 1 && options.sets.includes(s.id)),
              onchange: e => set({ sets: e.target.checked ? [...options.sets, s.id] : options.sets.filter(x => x !== s.id) }),
            }),
            ` ${s.name}`,
            s.ready ? '' : h('span', { class: 'small muted' }, '（準備中）'),
          ),
        ),
      ),
    ),
    h('div', { class: 'field' },
      h('label', {}, '王国カード（10種）の選び方'),
      h('select', { class: 'input', disabled: !editable, onchange: e => set({ preset: e.target.value }) },
        h('option', { value: 'random', selected: options.preset === 'random' }, '🎲 ランダム'),
        PRESETS.filter(p => p.cards.every(id => options.sets.includes(CARDS[id].set))).map(p =>
          h('option', { value: p.id, selected: options.preset === p.id }, `📜 ${p.name}（${p.note}）`),
        ),
      ),
    ),
    h('details', { class: 'tk-ban', open: banned.size > 0 || undefined },
      h('summary', {}, `🚫 BANするカード（${banned.size}種）`, editable ? '' : '（ホストのみ変更可）'),
      h('p', { class: 'small muted' },
        editable
          ? 'タップすると、そのカードは選ばれなくなります。この設定はこのブラウザに保存され、次の部屋でも使われます。苦手なカードがある人は、ホストに伝えてください。'
          : 'ホストが選んだ、出てこないカードです。苦手なカードがあれば、ホストに伝えてください。',
      ),
      h('p', { class: 'small' }, `使える王国カード: ${usable}種（10種以上必要）`),
      h('div', { class: 'tk-ban-grid' },
        inSets
          .slice()
          .sort((a, b) => a.cost - b.cost)
          .filter(c => editable || banned.has(c.id))
          .map(c =>
            cardEl(c, {
              size: 'mini',
              dim: banned.has(c.id),
              badge: banned.has(c.id) ? '✕' : null,
              onclick: editable ? () => set({ bans: banned.has(c.id) ? options.bans.filter(x => x !== c.id) : [...options.bans, c.id] }) : null,
            }),
          ),
      ),
    ),
  );
}

// ---- ゲーム画面 ----

export function createUI(root, api) {
  let view = null;
  let picked = []; // 手札から選んでいる札（選択を求められたとき）
  let zoomed = null; // 拡大表示中の札

  const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';

  function send(action) {
    api.send(action);
  }

  function render() {
    const me = view.me;
    const t = view.turn;
    const myTurn = view.phase === 'play' && t && t.p === me && !view.waitingFor;
    const pr = view.prompt;
    if (!pr || pr.kind !== 'hand') picked = [];

    root.replaceChildren(
      h('div', { class: 'table tk-table' },
        statusBar(myTurn),
        view.phase === 'over' ? resultBox() : null,
        pr ? promptBox(pr) : null,
        supplyBox(myTurn),
        playersBox(),
        me ? handBox(myTurn) : h('p', { class: 'muted' }, '👀 観戦中です'),
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
      ...(zoomed ? [zoomBox(myTurn)] : []),
    );
  }

  function statusBar(myTurn) {
    const t = view.turn;
    if (!t) return h('strong', {}, '🏯 終了');
    const phase = t.phase === 'action' ? '行動フェーズ' : '購入フェーズ';
    return h('div', { class: 'tk-status' },
      h('strong', {}, myTurn ? `🟡 あなたの手番（${phase}）` : `${nameOf(t.p)} の手番（${phase}）`),
      h('span', { class: 'tk-stat' }, '行動 ', h('b', {}, t.actions)),
      h('span', { class: 'tk-stat' }, '購入 ', h('b', {}, t.buys)),
      h('span', { class: 'tk-stat tk-coins' }, '文 ', h('b', {}, t.coins)),
      view.waitingFor ? h('span', { class: 'small' }, `⏳ ${nameOf(view.waitingFor)} の選択を待っています`) : null,
    );
  }

  function supplyBox(myTurn) {
    const pile = id => {
      const c = CARDS[id];
      const n = view.supply[id];
      const affordable = myTurn && view.turn.buys > 0 && n > 0 && view.turn.coins >= c.cost && !view.prompt;
      const promptPick = view.prompt?.kind === 'supply' && view.prompt.cands.includes(id);
      return cardEl(c, {
        size: 'mini',
        count: n,
        dim: n === 0,
        selected: affordable || promptPick,
        onclick: () => {
          if (promptPick) return send({ type: 'choose', answer: id });
          zoomed = id;
          render();
        },
      });
    };
    return h('section', { class: 'tk-supply' },
      h('div', { class: 'tk-row-title small' }, '王国', h('span', { class: 'muted' }, '（タップで拡大・購入）')),
      h('div', { class: 'tk-row' }, view.kingdom.map(pile)),
      h('div', { class: 'tk-row' }, BASIC_ROW.filter(id => id in view.supply).map(pile)),
      h('div', { class: 'small muted' }, `廃棄置き場: ${view.trashCount}枚${view.trashTop ? `（一番上: ${CARDS[view.trashTop].name}）` : ''}`),
    );
  }

  function playersBox() {
    return h('div', { class: 'seats' },
      view.players.map(p => {
        const turnP = view.turn?.p === p.id;
        return h('div', { class: ['seat', turnP && 'turn', p.id === view.me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.bot ? '🤖 ' : '', p.name),
          h('div', { class: 'small' }, `手札${p.hand}・山札${p.deck}・捨て札${p.discard}`),
          h('div', { class: 'small muted' }, `全${p.total}枚`, p.vp !== null ? `・${p.vp}点` : ''),
          turnP && p.play.length
            ? h('div', { class: 'tk-play' }, p.play.map(id => h('span', { class: `tk-pill tk-pill-${pillType(id)}` }, CARDS[id].name)))
            : null,
          p.dur.length
            ? h('div', { class: 'tk-play', title: '次の手番にも効く札（持続中）' }, h('span', { class: 'small' }, '⏳'), p.dur.map(id => h('span', { class: 'tk-pill tk-pill-duration' }, CARDS[id].name)))
            : null,
        );
      }),
    );
  }

  function handBox(myTurn) {
    const t = view.turn;
    const pr = view.prompt;
    const choosing = pr?.kind === 'hand';
    const pool = choosing ? pr.cands.slice() : [];
    // 選択中は、同じ札が何枚選ばれているかで表示を決める
    const used = {};
    const cards = view.hand.map((id, i) => {
      let selected = false;
      let onclick = null;
      if (choosing) {
        const key = `${id}#${(used[id] = (used[id] ?? 0) + 1)}`;
        selected = picked.includes(key);
        if (pool.includes(id)) {
          onclick = () => {
            picked = selected ? picked.filter(k => k !== key) : picked.length < pr.max ? [...picked, key] : picked;
            render();
          };
        }
      } else if (myTurn && (isType(id, 'treasure') || (isType(id, 'action') && t.phase === 'action' && t.actions > 0))) {
        onclick = () => send({ type: 'play', card: id });
      }
      return cardEl(CARDS[id], { size: 'full', onclick, selected, dim: choosing && !pool.includes(id) });
    });

    const hasTreasure = view.hand.some(id => isType(id, 'treasure'));
    const actions = myTurn && !view.prompt
      ? h('div', { class: 'game-actions' },
          hasTreasure ? h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'treasures' }) }, '💰 財宝をすべて出す') : null,
          t.phase === 'action'
            ? h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'end' }) }, '購入フェーズへ')
            : h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'end' }) }, '手番を終える'),
          h('span', { class: 'small' }, t.phase === 'action' ? '行動札をタップで使う。財宝をタップで購入へ' : '王国・基本の札をタップして購入'),
        )
      : null;
    const me = view.players.find(p => p.id === view.me);
    return h('section', {},
      h('div', { class: 'tk-row-title small' }, `あなたの手札（${view.hand.length}枚）`, h('span', { class: 'muted' }, `山札${me.deck}・捨て札${me.discard}・全${me.total}枚`)),
      actions,
      h('div', { class: 'tk-hand' }, cards),
    );
  }

  function promptBox(pr) {
    const head = h('strong', {}, '🖌 ', pr.title);
    if (pr.kind === 'option') {
      return h('div', { class: 'result-box tk-prompt' }, head,
        h('div', { class: 'game-actions' }, pr.options.map(o => h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'choose', answer: o.value }) }, o.label))),
      );
    }
    if (pr.kind === 'list') {
      return h('div', { class: 'result-box tk-prompt' }, head,
        h('div', { class: 'small' }, 'タップして選んでください'),
        h('div', { class: 'tk-row' }, pr.cands.map(id => cardEl(CARDS[id], { size: 'mini', onclick: () => send({ type: 'choose', answer: id }) }))),
      );
    }
    if (pr.kind === 'supply') {
      return h('div', { class: 'result-box tk-prompt' }, head,
        h('div', { class: 'small' }, '光っている札から選んでください（下の王国・基本の札をタップ）'),
        h('div', { class: 'tk-row' }, pr.cands.map(id => cardEl(CARDS[id], { size: 'mini', onclick: () => send({ type: 'choose', answer: id }) }))),
        pr.min === 0 ? h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'choose', answer: null }) }, '獲得しない') : null,
      );
    }
    const n = picked.length;
    const ok = n >= pr.min && n <= pr.max;
    const range = pr.min === pr.max ? `${pr.min}枚` : `${pr.min}〜${pr.max}枚`;
    return h('div', { class: 'result-box tk-prompt' }, head,
      h('div', { class: 'small' }, `下の手札から${range}選んで「決定」（${n}枚選択中）`),
      h('div', { class: 'game-actions' },
        h('button', {
          class: 'btn primary',
          type: 'button',
          disabled: !ok,
          onclick: () => {
            const answer = picked.map(k => k.split('#')[0]);
            picked = [];
            send({ type: 'choose', answer });
          },
        }, '決定'),
        pr.min === 0 && n > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => { picked = []; render(); } }, '選び直す') : null,
      ),
    );
  }

  function zoomBox(myTurn) {
    const c = CARDS[zoomed];
    const n = view.supply[zoomed];
    const canBuy = myTurn && !view.prompt && view.turn.buys > 0 && n > 0 && view.turn.coins >= c.cost;
    const close = () => {
      zoomed = null;
      render();
    };
    return h('div', { class: 'tk-zoom', onclick: e => e.target === e.currentTarget && close() },
      h('div', { class: 'tk-zoom-inner' },
        cardEl(c, { size: 'full' }),
        h('div', { class: 'small', style: { color: '#fff' } }, `残り${n}枚・${c.types.map(t => TYPE_LABEL[t]).join('・')}`),
        h('div', { class: 'game-actions' },
          canBuy
            ? h('button', { class: 'btn primary', type: 'button', onclick: () => { zoomed = null; send({ type: 'buy', card: c.id }); } }, `${c.cost}文で購入`)
            : null,
          h('button', { class: 'btn', type: 'button', onclick: close }, '閉じる'),
        ),
        myTurn && !canBuy && view.turn.phase ? h('div', { class: 'small', style: { color: '#fff' } }, n === 0 ? '山が空です' : view.turn.buys < 1 ? '購入が残っていません' : `あと${c.cost - view.turn.coins}文足りません（財宝を出すと文が増えます）`) : null,
      ),
    );
  }

  function resultBox() {
    return h('div', { class: 'result-box' },
      h('h3', {}, '🏯 天下統一！'),
      h('ol', {}, view.result.map(r => h('li', {}, `${r.win ? '👑 ' : ''}${nameOf(r.id)} — ${r.vp}点（${r.turns}手番）`))),
      h('p', { class: 'small' }, 'ホストは「ロビーに戻る」から、設定を変えてもう一度遊べます。'),
    );
  }

  return {
    update(next) {
      view = next;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}

function pillType(id) {
  const t = CARDS[id].types;
  return t.includes('attack') ? 'attack' : t.includes('duration') ? 'duration' : t.includes('treasure') ? 'treasure' : t.includes('victory') ? 'victory' : 'action';
}
