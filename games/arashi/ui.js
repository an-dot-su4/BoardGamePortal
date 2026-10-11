// 嵐の航海の画面
import { h } from '../../js/util.js';
import { cardValue, SIGNALS, TYPES } from './logic.js';

function cardEl(card, { hazardType = null, selected = false, onclick = null, disabled = false } = {}) {
  const t = TYPES[card.type];
  const match = hazardType && (hazardType === 'any' || hazardType === card.type);
  return h('button', {
    class: ['acard', card.type, selected && 'sel', match && 'match'].filter(Boolean).join(' '),
    type: 'button',
    disabled: disabled || !onclick,
    onclick,
    'aria-pressed': onclick ? String(selected) : null,
    'aria-label': `${t.label} ${card.v}`,
    dataset: { card: card.id },
  },
    h('span', { class: 'v' }, card.v),
    h('span', { class: 't' }, `${t.icon}${t.label}`),
  );
}

export function createUI(root, api) {
  let selected = null;
  let view = null;

  function render() {
    const me = view.me;
    const cur = view.current;
    const playing = view.phase === 'play';
    const decided = view.myPlay !== undefined;
    const myCard = decided && view.myPlay ? view.hand.find(c => c.id === view.myPlay) : null;

    const voyage = h('div', { class: 'voyage' },
      '⚓',
      Array.from({ length: view.totalLegs }, (_, i) => {
        const leg = i + 1;
        const cls = leg < view.leg || view.phase === 'won' ? 'leg done' : leg === view.leg && playing ? 'leg now' : 'leg';
        return h('span', { class: cls }, leg === view.totalLegs ? '⛈' : leg);
      }),
      '🏝️',
      h('span', { class: 'spacer', style: { flex: 1 } }),
      h('span', { title: '船の耐久' }, '❤️'.repeat(view.hp) + '🖤'.repeat(view.maxHp - view.hp)),
      h('span', { class: 'small muted' }, `山札 ${view.deckCount}枚`),
    );

    const hazard = playing
      ? h('div', { class: 'result-box hazard' },
          h('span', { class: 'icon' }, cur.icon),
          h('div', {},
            h('div', { class: 'small muted' }, `難所 ${view.leg} / ${view.totalLegs}`),
            h('strong', { style: { fontSize: '1.3rem' } }, cur.name), ' ',
            h('span', { class: 'small' }, cur.type === 'any' ? 'どのカードも数字どおり' : `${TYPES[cur.type].icon}${TYPES[cur.type].label}のカードが有効`),
          ),
          h('div', {},
            h('span', { class: 'small' }, '必要値 '), h('span', { class: 'need' }, cur.need),
            view.next ? h('span', { class: 'small muted' }, `　次は ${view.next.icon}${view.next.name}（${view.next.need}）`) : null,
          ),
        )
      : null;

    const seats = h('div', { class: 'seats' },
      view.players.map(p =>
        h('div', { class: ['seat', p.id === me && 'me', playing && !p.decided && 'turn'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name),
          h('div', { class: 'small' }, `🂠 ${p.count}枚`, playing ? (p.decided ? '・✅ 決定' : '・🤔 考え中') : ''),
          p.signal ? h('span', { class: 'stamp' }, SIGNALS[p.signal]) : null,
        ),
      ),
    );

    const last = view.lastResult ? lastResultBox(view.lastResult) : null;
    const ending = !playing
      ? h('div', { class: 'result-box' },
          h('h3', {}, view.phase === 'won' ? '🏝️ 港に到着！ 全員の勝利！' : '💥 船は沈んでしまった…'),
          h('p', { class: 'small' }, 'ホストは「ロビーに戻る」から、もう一度遊べます。'),
        )
      : null;

    let handArea = h('p', { class: 'muted' }, '👀 観戦中です');
    if (me) {
      handArea = h('div', {},
        h('strong', {}, `あなたの手札（${view.hand.length}枚）`),
        h('div', { class: 'hand' },
          view.hand.map(c =>
            cardEl(c, {
              hazardType: playing ? cur.type : null,
              selected: decided ? c.id === view.myPlay : c.id === selected,
              disabled: !playing || decided,
              onclick: () => {
                selected = selected === c.id ? null : c.id;
                render();
              },
            }),
          ),
        ),
      );
    }

    let actions = null;
    if (me && playing) {
      const pick = view.hand.find(c => c.id === selected);
      actions = decided
        ? h('div', { class: 'game-actions' },
            h('span', {}, myCard ? `伏せて出しました（${TYPES[myCard.type].label} ${myCard.v} → この難所では ${cardValue(myCard, cur.type)}）` : '今回は出さないことにしました'),
            h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'undo' }) }, '考え直す'),
            h('span', { class: 'small' }, '全員が決めると公開されます'),
          )
        : h('div', { class: 'game-actions' },
            h('button', {
              class: 'btn primary',
              type: 'button',
              disabled: !pick,
              onclick: () => {
                api.send({ type: 'commit', card: selected });
                selected = null;
              },
            }, pick ? `伏せて出す（この難所では ${cardValue(pick, cur.type)}）` : 'カードを選んでください'),
            h('button', { class: 'btn', type: 'button', onclick: () => { api.send({ type: 'commit', card: null }); selected = null; } }, '今回は出さない'),
          );
    }

    const myStamp = view.players.find(p => p.id === me)?.signal ?? null;
    const stamps = me && playing
      ? h('div', { class: 'game-actions' },
          h('span', { class: 'small' }, 'スタンプ:'),
          Object.entries(SIGNALS).map(([key, label]) =>
            h('button', {
              class: key === myStamp ? 'btn small primary' : 'btn small',
              type: 'button',
              onclick: () => api.send({ type: 'signal', signal: key === myStamp ? null : key }),
            }, label),
          ),
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        voyage,
        hazard,
        ending,
        seats,
        handArea,
        actions,
        stamps,
        last,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function lastResultBox(r) {
    const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
    return h('div', { class: 'result-box' },
      h('div', { class: 'row' },
        h('strong', {}, `前回の結果（難所 ${r.leg}）`),
        h('span', {}, `合計 ${r.total} / 必要 ${r.need}`),
        h('strong', {}, r.success ? '✅ 突破' : `❌ ${r.damage}ダメージ`),
      ),
      h('div', { class: 'hand' },
        r.reveal.map(x =>
          h('div', { style: { textAlign: 'center' } },
            x.card ? cardEl(x.card, { hazardType: r.type }) : h('div', { class: 'acard facedown' }, '—'),
            h('div', { class: 'small' }, nameOf(x.pid)),
          ),
        ),
      ),
    );
  }

  return {
    update(nextView) {
      view = nextView;
      if (selected && !view.hand.some(c => c.id === selected)) selected = null;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
