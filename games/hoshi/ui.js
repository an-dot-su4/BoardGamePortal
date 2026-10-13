// ほしならべの画面
import { h } from '../../js/util.js';

export function createUI(root, api) {
  let view = null;

  function render() {
    const me = view.me;
    const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
    const over = view.phase === 'won' || view.phase === 'lost';
    const top = view.pile[view.pile.length - 1];
    const myReady = view.players.find(p => p.id === me)?.ready;

    const header = h('div', { class: 'row', style: { justifyContent: 'space-between' } },
      h('strong', {}, `レベル ${view.level} / ${view.goal}`),
      h('span', {}, `ライフ ${'❤️'.repeat(Math.max(0, view.lives))}　流れ星 ${'🌠'.repeat(view.stars) || 'なし'}`),
    );

    const seats = h('div', { class: 'seats' },
      view.players.map(p =>
        h('div', { class: ['seat', p.id === me && 'me', view.phase === 'ready' && !p.ready && 'turn'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name),
          h('div', { class: 'small' }, `⭐ 残り${p.count}枚`, view.phase === 'ready' ? (p.ready ? '・🧘 集中' : '・待機中') : ''),
        ),
      ),
    );

    const pile = h('div', { class: 'result-box', style: { textAlign: 'center' } },
      h('div', { class: 'small muted' }, '場の星（いちばん新しいもの）'),
      h('div', { class: 'star-top' }, top ? top.card : '—'),
      top ? h('div', { class: 'small' }, `${nameOf(top.by)} さん`) : null,
      view.pile.length > 1 ? h('div', { class: 'small muted' }, 'これまで: ' + view.pile.map(p => p.card).join(' → ')) : null,
    );

    const event = eventBox(nameOf);

    let actions = null;
    if (me && !over) {
      if (view.phase === 'ready') {
        actions = h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary', type: 'button', disabled: myReady, onclick: () => api.send({ type: 'ready' }) }, myReady ? '🧘 集中しています…' : '🧘 集中（準備OK）'),
          h('span', { class: 'small' }, '全員が集中すると始まります'),
        );
      } else {
        const next = view.hand[0];
        actions = h('div', { class: 'game-actions' },
          h('button', {
            class: 'btn primary star-play',
            type: 'button',
            disabled: next === undefined,
            onclick: () => api.send({ type: 'play', card: next }),
          }, next === undefined ? '出し終わりました' : `⭐ ${next} を出す`),
        );
      }
    }

    const starBtn = me && !over && view.stars > 0
      ? h('div', { class: 'game-actions' },
          h('button', { class: view.myStarVote ? 'btn small primary' : 'btn small', type: 'button', onclick: () => api.send({ type: 'star' }) },
            view.myStarVote ? '🌠 流れ星に賛成中（取り消す）' : '🌠 流れ星を使いたい'),
          h('span', { class: 'small' }, `賛成 ${view.starVotes} / ${view.players.length}`),
        )
      : null;

    const hand = me
      ? h('div', {},
          h('strong', {}, `あなたの星（${view.hand.length}枚）`),
          h('div', { class: 'hand' }, view.hand.map(c => h('div', { class: 'star-card' }, c))),
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    const ending = over
      ? h('div', { class: 'result-box' },
          h('h3', {}, view.phase === 'won' ? '🌌 星空が完成！ 全員の勝利！' : `🌑 レベル${view.level}で力尽きました…`),
          me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度') : null,
        )
      : null;

    root.replaceChildren(
      h('div', { class: 'table' },
        header,
        seats,
        ending,
        pile,
        event,
        hand,
        actions,
        starBtn,
        h('p', { class: 'small muted' }, '数字を言うのは禁止。「そろそろかな…」という間合いだけで合わせよう。'),
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function eventBox(nameOf) {
    const e = view.lastEvent;
    if (!e || e.kind === 'ok') return null;
    if (e.kind === 'miss') {
      return h('div', { class: 'banner', style: { color: 'inherit' } },
        `💥 ${nameOf(e.by)} さんの ${e.card} より小さい星がありました: `,
        e.dropped.map(d => `${nameOf(d.by)} ${d.card}`).join('、'),
      );
    }
    return h('div', { class: 'banner', style: { color: 'inherit' } },
      '🌠 流れ星: ', e.shown.map(s => `${nameOf(s.by)} ${s.card}`).join('、'),
    );
  }

  return {
    update(nextView) {
      view = nextView;
      render();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
