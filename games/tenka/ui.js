// 天下札の画面
import { h } from '../../js/util.js';
import { load, save } from '../../js/storage.js';
import { Anim, clearFx, confetti, floatText, fly, spotlight } from '../../js/fx.js';
import { CARDS, KINGDOM, PRESETS, SETS } from './cards/index.js';
import { cardEl, TYPE_LABEL } from './cardview.js';

const BASIC_ROW = ['zeni', 'gin', 'kin', 'ohban', 'ta', 'shouen', 'kuni', 'gosho', 'tatari'];
const isType = (id, t) => CARDS[id].types.includes(t);

// 表示の切り替え（'auto' / 'mobile' / 'pc'）。auto はスマホ幅かタッチ操作の端末ならスマホ表示
const LAYOUT_KEY = 'tenkaLayout';
const AUTO_MOBILE = '(max-width: 700px), (pointer: coarse), (orientation: landscape) and (max-height: 520px)';

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
  let ctx = {}; // 部屋の情報（isHost など）
  let picked = []; // 手札から選んでいる札（選択を求められたとき）
  let zoomed = null; // 拡大表示中の札
  let overpay = 0; // 棟梁などで多く払う額
  let layout = load(LAYOUT_KEY, 'auto');
  const anim = new Anim();
  // 要素に演出の class を付ける（描き直しても途中から続く）
  const fx = (el, key, cls, dur) => {
    const a = anim.attrs(key, cls, dur);
    if (a && el) {
      el.classList.add(a.cls);
      el.style.animationDelay = a.style.animationDelay;
    }
    return el;
  };
  let menuOpen = false; // スマホ表示の☰メニュー
  let peek = false; // スマホ表示を一時的に隠して部屋の画面（チャット）を見ている
  const mq = typeof matchMedia === 'function' ? matchMedia(AUTO_MOBILE) : null;
  const mobile = () => layout === 'mobile' || (layout === 'auto' && !!mq?.matches);
  const onMedia = () => view && render();
  mq?.addEventListener?.('change', onMedia);

  function setLayout(next) {
    layout = next;
    save(LAYOUT_KEY, next);
    menuOpen = false;
    peek = false;
    render();
  }

  const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';

  function send(action) {
    api.send(action);
  }

  // 再描画しても、スクロールしていた位置（手札の列・スマホ表示の中段など）を保つ
  function keepScroll(draw) {
    const pos = {};
    for (const el of root.querySelectorAll('[data-scroll-key]')) pos[el.dataset.scrollKey] = [el.scrollTop, el.scrollLeft];
    const y = window.scrollY;
    draw();
    for (const el of root.querySelectorAll('[data-scroll-key]')) {
      const p = pos[el.dataset.scrollKey];
      if (p) [el.scrollTop, el.scrollLeft] = p;
    }
    if (!mobile() && window.scrollY !== y) window.scrollTo(0, y);
  }

  function render() {
    const pr = view.prompt;
    if (!pr || pr.kind !== 'hand') picked = [];
    const m = mobile();
    document.documentElement.classList.toggle('tk-m-open', m && !peek);
    keepScroll(() => (m ? renderMobile() : renderPC()));
  }

  function renderPC() {
    const me = view.me;
    const t = view.turn;
    const myTurn = view.phase === 'play' && t && t.p === me && !view.waitingFor;
    const pr = view.prompt;

    root.replaceChildren(
      h('div', { class: 'table tk-table' },
        statusBar(myTurn),
        view.phase === 'over' ? resultBox() : null,
        pr ? fx(promptBox(pr), promptKey(pr), 'fx-slide', 450) : null,
        supplyBox(myTurn),
        playersBox(),
        me ? handBox(myTurn) : h('p', { class: 'muted' }, '👀 観戦中です'),
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        linksEl(),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
      ...(zoomed ? [zoomBox(myTurn)] : []),
    );
  }

  // スマホ表示: 画面いっぱいに 上部バー／供給（ここだけスクロール）／選択・操作ボタン・手札 の3段
  function renderMobile() {
    const me = view.me;
    const t = view.turn;
    const myTurn = view.phase === 'play' && t && t.p === me && !view.waitingFor;
    const pr = view.prompt;
    if (peek) {
      root.replaceChildren(
        h('button', { class: 'btn primary tk-m-back', type: 'button', onclick: () => { peek = false; render(); } }, '🎴 ゲームに戻る'),
      );
      return;
    }
    const menu = menuOpen
      ? h('div', { class: 'tk-m-menu' },
          h('div', { class: 'game-actions' },
            h('button', { class: 'btn', type: 'button', onclick: () => setLayout('pc') }, '🖥 PC表示にする'),
            h('button', { class: 'btn', type: 'button', onclick: () => { peek = true; menuOpen = false; render(); } }, '💬 部屋の画面（チャット）'),
            ctx.isHost && api.backToLobby
              ? h('button', { class: 'btn', type: 'button', onclick: () => { menuOpen = false; api.backToLobby(); } }, view.phase === 'over' ? '🏠 ロビーに戻る' : '🏠 ロビーに戻る（ゲームを終える）')
              : null,
            h('button', { class: 'btn', type: 'button', onclick: () => { menuOpen = false; render(); } }, '閉じる'),
          ),
          linksEl(),
          h('details', {},
            h('summary', { class: 'small' }, 'ルール'),
            h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
          ),
          h('div', { class: 'small' }, '最近の出来事'),
          h('div', { class: 'log' }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
        )
      : null;
    root.replaceChildren(
      h('div', { class: 'tk-m table' },
        h('header', { class: 'tk-m-top' },
          statusBar(myTurn, true),
          h('button', { class: 'btn tk-m-menu-btn', type: 'button', 'aria-label': 'メニュー', onclick: () => { menuOpen = !menuOpen; render(); } }, menuOpen ? '✕' : '☰'),
        ),
        menu,
        h('div', { class: 'tk-m-main', dataset: { scrollKey: 'main' } },
          view.phase === 'over' ? resultBox() : null,
          supplyBox(myTurn),
          playersBox(),
          h('div', { class: 'log tk-m-log' }, view.log.slice(-4).reverse().map(l => h('div', { class: 'small muted' }, l))),
        ),
        h('div', { class: 'tk-m-bottom', dataset: { scrollKey: 'bottom' } },
          pr ? fx(promptBox(pr), promptKey(pr), 'fx-slide', 450) : null,
          me ? handBox(myTurn) : h('p', { class: 'muted' }, '👀 観戦中です'),
        ),
      ),
      ...(zoomed ? [zoomBox(myTurn)] : []),
    );
  }

  // カード一覧などのリンク（別タブで開くので、ゲームは切れない）
  function linksEl() {
    if (!api.links?.length) return null;
    return h('p', { class: 'small game-links' }, api.links.map(l => h('a', { href: l.href, target: '_blank', rel: 'noopener' }, l.label)));
  }

  function statusBar(myTurn, compact = false) {
    const t = view.turn;
    const toggle = compact ? null : h('button', { class: 'btn tk-layout-btn', type: 'button', onclick: () => setLayout('mobile') }, '📱 スマホ表示');
    if (!t) return h('div', { class: 'tk-status' }, h('strong', {}, '🏯 終了'), toggle);
    const phase = t.phase === 'action' ? (compact ? '行動' : '行動フェーズ') : compact ? '購入' : '購入フェーズ';
    return h('div', { class: 'tk-status' },
      fx(h('strong', {}, myTurn ? `🟡 あなたの手番（${phase}）` : `${nameOf(t.p)} の手番（${phase}）`), `turn-${view.turnNo}`, 'fx-flash', 900),
      fx(h('span', { class: 'tk-stat', dataset: { stat: 'actions' } }, '行動 ', h('b', {}, t.actions)), 'stat-actions', 'fx-bump', 500),
      fx(h('span', { class: 'tk-stat', dataset: { stat: 'buys' } }, '購入 ', h('b', {}, t.buys)), 'stat-buys', 'fx-bump', 500),
      fx(h('span', { class: 'tk-stat tk-coins', dataset: { stat: 'coins' } }, '文 ', h('b', {}, t.coins)), 'stat-coins', 'fx-bump', 500),
      view.waitingFor ? h('span', { class: 'small' }, `⏳ ${nameOf(view.waitingFor)} の選択を待っています`) : null,
      toggle,
    );
  }

  function supplyBox(myTurn) {
    const pile = id => {
      // 落武者の山は、一番上の札を見せる
      // 落武者の山・名のある武者の山は、一番上の札を見せる
      const top = id === 'ruins' ? view.ruinsTop : id === 'bushi' ? view.knightsTop : null;
      const base = top ? { ...CARDS[top], id, name: `${CARDS[top].name}`, art: top } : CARDS[id];
      // 石切場・行商人でコストが変わっていれば、今のコストで見せる
      const c = view.costs?.[id] !== undefined && view.costs[id] !== base.cost ? { ...base, cost: view.costs[id] } : base;
      const n = view.supply[id];
      const affordable = myTurn && view.turn.buys > 0 && n > 0 && view.turn.coins >= c.cost && !view.prompt && !CARDS[id].notSupply;
      const promptPick = view.prompt?.kind === 'supply' && view.prompt.cands.includes(id);
      return fx(cardEl(c, {
        size: 'mini',
        count: n,
        badge: [view.embargo?.[id] ? `関${view.embargo[id]}` : '', view.tradeRoute?.piles.includes(id) ? '印' : ''].filter(Boolean).join(' ') || null,
        dim: n === 0,
        selected: affordable || promptPick,
        onclick: () => {
          if (promptPick) return send({ type: 'choose', answer: id });
          zoomed = id;
          render();
        },
      }), `pile-${id}`, 'fx-bump', 500);
    };
    return h('section', { class: 'tk-supply' },
      h('div', { class: 'tk-row-title small' }, '王国', h('span', { class: 'muted' }, '（タップで拡大・購入）')),
      h('div', { class: 'tk-row' }, view.kingdom.map(pile)),
      h('div', { class: 'tk-row' }, BASIC_ROW.filter(id => id in view.supply).map(pile)),
      // 時代ごとの特別な山（落武者・戦利品など）
      (() => {
        const extra = Object.keys(view.supply).filter(id => !view.kingdom.includes(id) && !BASIC_ROW.includes(id));
        return extra.length ? h('div', { class: 'tk-row' }, extra.map(pile)) : null;
      })(),
      view.tradeRoute ? h('div', { class: 'small muted' }, `馬借のマット: 印${view.tradeRoute.mat}つ（「印」のある勝利点の山から初めて獲得されると増える）`) : null,
      h('div', { class: 'small muted tk-trash' }, `廃棄置き場: ${view.trashCount}枚${view.trashTop ? `（一番上: ${CARDS[view.trashTop].name}）` : ''}`),
    );
  }

  function playersBox() {
    return h('div', { class: 'seats' },
      view.players.map(p => {
        const turnP = view.turn?.p === p.id;
        return fx(h('div', { class: ['seat', turnP && 'turn', p.id === view.me && 'me'].filter(Boolean).join(' '), dataset: { seat: p.id } },
          h('div', { class: 'name' }, p.bot ? '🤖 ' : '', p.name),
          h('div', { class: 'small' }, `手札${p.hand}・山札${p.deck}・捨て札${p.discard}`),
          h('div', { class: 'small muted' }, `全${p.total}枚`, p.fame ? `・名声${p.fame}` : '', p.coffers ? `・蓄え${p.coffers}` : '', p.vp !== null ? `・${p.vp}点` : ''),
          p.island.length || p.nativeCount || p.pirate
            ? h('div', { class: 'small muted' },
                p.island.length ? `隠岐の島: ${p.island.map(id => CARDS[id].name).join('・')} ` : '',
                p.nativeCount ? `隠れ里: ${p.nativeCount}枚 ` : '',
                p.pirate ? `倭寇の銭: ${p.pirate}` : '',
              )
            : null,
          turnP && p.play.length
            ? h('div', { class: 'tk-play' }, p.play.map(id => h('span', { class: `tk-pill tk-pill-${pillType(id)}` }, CARDS[id].name)))
            : null,
          p.dur.length
            ? h('div', { class: 'tk-play', title: '次の手番にも効く札（持続中）' }, h('span', { class: 'small' }, '⏳'), p.dur.map(id => h('span', { class: 'tk-pill tk-pill-duration' }, CARDS[id].name)))
            : null,
        ), `seat-${p.id}`, 'fx-bump', 500);
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
    const seen = {}; // 同じ札の何枚目か（引いた札の演出用）
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
      const nth = (seen[id] = (seen[id] ?? 0) + 1);
      return fx(cardEl(CARDS[id], { size: 'full', onclick, selected, dim: choosing && !pool.includes(id) }), `draw-${id}#${nth}`, 'fx-slide', 450);
    });

    const hasTreasure = view.hand.some(id => isType(id, 'treasure'));
    const me = view.players.find(p => p.id === view.me);
    const actions = myTurn && !view.prompt
      ? h('div', { class: 'game-actions' },
          hasTreasure ? h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'treasures' }) }, '💰 財宝をすべて出す') : null,
          me.coffers > 0 ? h('button', { class: 'btn', type: 'button', onclick: () => send({ type: 'coffer' }) }, `🪙 蓄えを使う（+1文・残り${me.coffers}）`) : null,
          t.phase === 'action'
            ? h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'end' }) }, '購入フェーズへ')
            : h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'end' }) }, '手番を終える'),
          h('span', { class: 'small' }, t.phase === 'action' ? '行動札をタップで使う。財宝をタップで購入へ' : '王国・基本の札をタップして購入'),
        )
      : null;
    return h('section', {},
      h('div', { class: 'tk-row-title small' }, `あなたの手札（${view.hand.length}枚）`, h('span', { class: 'muted' }, `山札${me.deck}・捨て札${me.discard}・全${me.total}枚`)),
      view.myNative.length ? h('div', { class: 'small' }, `隠れ里のマット（自分だけ見える）: ${view.myNative.map(id => CARDS[id].name).join('・')}`) : null,
      actions,
      h('div', { class: 'tk-hand', dataset: { scrollKey: 'hand' } }, cards),
    );
  }

  function promptBox(pr) {
    const head = h('strong', {}, '🖌 ', pr.title);
    if (pr.kind === 'option') {
      return h('div', { class: 'result-box tk-prompt' }, head,
        h('div', { class: 'game-actions' }, pr.options.map(o => h('button', { class: 'btn primary', type: 'button', onclick: () => send({ type: 'choose', answer: o.value }) }, o.label))),
      );
    }
    if (pr.kind === 'name') {
      return h('div', { class: 'result-box tk-prompt' }, head,
        h('div', { class: 'small' }, '札の名前をタップして選んでください'),
        h('div', { class: 'tk-row' }, pr.cands.map(id => cardEl(CARDS[id], { size: 'mini', onclick: () => send({ type: 'choose', answer: id }) }))),
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
    const c = view.costs?.[zoomed] !== undefined ? { ...CARDS[zoomed], cost: view.costs[zoomed] } : CARDS[zoomed];
    const n = view.supply[zoomed];
    const canBuy = myTurn && !view.prompt && view.turn.buys > 0 && n > 0 && view.turn.coins >= c.cost && !c.notSupply;
    const maxOver = canBuy && c.steps?.overpay ? view.turn.coins - c.cost : 0;
    overpay = Math.min(overpay, maxOver);
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
            ? h('button', {
                class: 'btn primary',
                type: 'button',
                onclick: () => {
                  zoomed = null;
                  send(overpay ? { type: 'buy', card: c.id, overpay } : { type: 'buy', card: c.id });
                  overpay = 0;
                },
              }, `${c.cost + overpay}文で購入`)
            : null,
          h('button', { class: 'btn', type: 'button', onclick: close }, '閉じる'),
        ),
        maxOver > 0
          ? h('label', { class: 'small', style: { color: '#fff' } }, '多く払う（効果は札の説明を参照）: ',
              h('select', { class: 'input', style: { width: 'auto', display: 'inline-block' }, onchange: e => { overpay = Number(e.target.value); render(); } },
                Array.from({ length: maxOver + 1 }, (_, k) => h('option', { value: k, selected: k === overpay }, `+${k}文`)),
              ),
            )
          : null,
        myTurn && !canBuy && view.turn.phase ? h('div', { class: 'small', style: { color: '#fff' } }, n === 0 ? '山が空です' : view.turn.buys < 1 ? '購入が残っていません' : `あと${c.cost - view.turn.coins}文足りません（財宝を出すと文が増えます）`) : null,
      ),
    );
  }

  function resultBox() {
    return h('div', { class: 'result-box' },
      h('h3', {}, '🏯 天下統一！'),
      h('ol', {}, view.result.map(r => h('li', {}, `${r.win ? '👑 ' : ''}${nameOf(r.id)} — ${r.vp}点（${r.turns}手番）`))),
      ctx.isHost && api.backToLobby
        ? h('div', { class: 'game-actions' },
            h('button', { class: 'btn primary', type: 'button', onclick: () => api.backToLobby() }, '🏠 ロビーに戻る'),
            h('span', { class: 'small' }, 'ロビーで設定を変えて、もう一度遊べます'),
          )
        : h('p', { class: 'small' }, 'ホストがロビーに戻すのを待っています（ロビーで設定を変えて、もう一度遊べます）。'),
    );
  }

  const promptKey = pr => `prompt-${view.turnNo}-${pr.card}-${pr.title}`;

  // 描き直す前の位置（手札・供給の山・席）。描き直すと要素が入れ替わるので、先に測っておく
  function rects() {
    const out = { hand: [], piles: {}, seats: {} };
    for (const el of root.querySelectorAll('.tk-hand [data-card]')) out.hand.push({ id: el.dataset.card, rect: el.getBoundingClientRect() });
    for (const el of root.querySelectorAll('.tk-supply [data-card]')) out.piles[el.dataset.card] = el.getBoundingClientRect();
    for (const el of root.querySelectorAll('[data-seat]')) out.seats[el.dataset.seat] = el.getBoundingClientRect();
    return out;
  }

  const mini = id => {
    const el = cardEl(CARDS[id], { size: 'mini' });
    return el;
  };

  // 前の状態との違いから演出を決める
  function diff(prev, next, before) {
    const out = [];
    const t = next.turn;
    const sameTurn = prev.turn && t && prev.turn.p === t.p && prev.turnNo === next.turnNo;
    const seat = id => root.querySelector(`[data-seat="${id}"]`) ?? before.seats[id];
    const stat = name => root.querySelector(`[data-stat="${name}"]`);

    // 自分の手番になった
    if (t && t.p === next.me && prev.turnNo !== next.turnNo) anim.start(`turn-${next.turnNo}`);

    // 使った札: 場に増えた札を、画面の中央に大きく見せる（財宝は文の増え方で見せる）
    if (t && sameTurn) {
      const pp = prev.players.find(p => p.id === t.p);
      const np = next.players.find(p => p.id === t.p);
      const added = np.play.slice(pp.play.length);
      const shown = added.filter(id => CARDS[id].types.includes('action')).slice(0, 2);
      shown.forEach((id, k) => {
        const from = t.p === next.me ? before.hand.find(h => h.id === id)?.rect : before.seats[t.p];
        const box = document.createElement('div');
        box.appendChild(cardEl(CARDS[id], { size: 'full' }));
        const cap = document.createElement('div');
        cap.className = 'fx-caption';
        cap.textContent = `${nameOf(t.p)}: ${CARDS[id].name}`;
        box.appendChild(cap);
        out.push(() => setTimeout(() => spotlight(box, { from, duration: 1150 }), k * 700));
      });
      // 自分が出した財宝は、手札から「文」へ飛ぶ
      if (t.p === next.me) {
        const treasures = added.filter(id => !CARDS[id].types.includes('action'));
        treasures.slice(0, 8).forEach((id, k) => {
          const from = before.hand.filter(h => h.id === id)[0]?.rect;
          out.push(() => fly(from, stat('coins'), '🪙', { delay: k * 70, duration: 550 }));
        });
      }
      // 行動・購入・文の増減
      for (const [k, label] of [['actions', '行動'], ['buys', '購入'], ['coins', '文']]) {
        const d = t[k] - prev.turn[k];
        if (d > 0) {
          anim.start(`stat-${k}`);
          out.push(() => floatText(stat(k), `+${d}${label}`, { delay: 250 }));
        }
      }
    }

    // 獲得した札: 供給の山から、増えた人の席へ飛ぶ
    const gainers = next.players.filter(p => {
      const was = prev.players.find(x => x.id === p.id);
      return was && p.total > was.total;
    });
    let k = 0;
    for (const id of Object.keys(next.supply)) {
      const d = (prev.supply[id] ?? 0) - next.supply[id];
      if (d <= 0 || id === 'senrihin') continue;
      anim.start(`pile-${id}`);
      for (let n = 0; n < Math.min(d, 3); n++) {
        const to = gainers.length ? gainers[(k + n) % gainers.length].id : t?.p;
        const shownId = id === 'ruins' ? prev.ruinsTop ?? id : id === 'bushi' ? prev.knightsTop ?? id : id;
        const from = before.piles[id];
        const delay = k++ * 160;
        out.push(() => fly(from, seat(to), mini(shownId), { delay, duration: 750 }));
      }
    }
    for (const p of gainers) anim.start(`seat-${p.id}`);

    // 手札に増えた札（引いた・手札に獲得した）
    const count = list => list.reduce((m, id) => ((m[id] = (m[id] ?? 0) + 1), m), {});
    const was = count(prev.hand);
    const now = count(next.hand);
    for (const [id, n] of Object.entries(now)) for (let i = (was[id] ?? 0) + 1; i <= n; i++) anim.start(`draw-${id}#${i}`);

    // 廃棄
    if (next.trashCount > prev.trashCount) out.push(() => floatText(root.querySelector('.tk-trash'), `🔥 ${next.trashCount - prev.trashCount}枚廃棄`, { color: '#ffb36b' }));

    // 選択が来た
    if (next.prompt && (!prev.prompt || promptKey(prev.prompt) !== promptKey(next.prompt))) anim.start(promptKey(next.prompt));

    if (next.phase === 'over' && prev.phase !== 'over') out.push(() => confetti());
    return out;
  }

  return {
    update(next, nextCtx) {
      const prev = view;
      // ホストの画面にはゲームの状態そのものが渡るので、前後を比べられるよう写しを持つ
      view = structuredClone(next);
      ctx = nextCtx ?? ctx;
      const before = prev ? rects() : null;
      const effects = prev ? diff(prev, view, before) : [];
      render();
      if (effects.length) requestAnimationFrame(() => effects.forEach(f => f()));
    },
    destroy() {
      clearFx();
      mq?.removeEventListener?.('change', onMedia);
      document.documentElement.classList.remove('tk-m-open');
      root.replaceChildren();
    },
  };
}

function pillType(id) {
  const t = CARDS[id].types;
  return t.includes('attack') ? 'attack' : t.includes('duration') ? 'duration' : t.includes('treasure') ? 'treasure' : t.includes('victory') ? 'victory' : 'action';
}
