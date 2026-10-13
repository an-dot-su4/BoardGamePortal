// ワード人狼の画面
import { h } from '../../js/util.js';

export function createUI(root, api) {
  let view = null;
  let draft = '';

  function render() {
    const me = view.me;
    const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
    const n = view.players.length;

    const seats = h('div', { class: 'seats' },
      view.players.map(p =>
        h('div', { class: ['seat', p.id === me && 'me'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name),
          h('div', { class: 'small' },
            view.phase === 'talk' ? (p.ready ? '🙋 投票OK' : '💬 話し中') : view.phase === 'vote' ? (p.voted ? '✅ 投票済み' : '🤔 考え中') : '',
          ),
          h('div', { class: 'small muted' }, `${p.score}点`),
        ),
      ),
    );

    const word = me
      ? h('div', { class: 'result-box', style: { textAlign: 'center' } },
          h('div', { class: 'small muted' }, 'あなたのお題'),
          h('div', { class: 'big-word' }, view.myWord),
          h('div', { class: 'small muted' }, 'このお題は口に出さないで。あなたが人狼（少数派）かもしれません'),
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    let body = null;
    if (view.phase === 'talk') {
      const ready = view.players.find(p => p.id === me)?.ready;
      body = h('div', {},
        h('p', {}, '💬 お題について話し合いましょう（2〜3分が目安）。「〇〇は好き？」「どこで見かける？」など、ぼかして質問するのがコツ。'),
        me
          ? h('div', { class: 'game-actions' },
              h('button', { class: ready ? 'btn' : 'btn primary', type: 'button', onclick: () => api.send({ type: 'ready' }) }, ready ? '取り消す' : '🙋 投票に進みたい'),
              h('span', { class: 'small' }, `${view.readyCount} / ${n} 人（過半数で投票へ）`),
            )
          : null,
      );
    } else if (view.phase === 'vote') {
      body = h('div', {},
        h('p', {}, '🗳️ 人狼だと思う人に投票してください（全員が投票すると開票）'),
        me
          ? h('div', { class: 'game-actions' },
              view.players.filter(p => p.id !== me).map(p =>
                h('button', {
                  class: view.myVote === p.id ? 'btn primary' : 'btn',
                  type: 'button',
                  onclick: () => api.send({ type: 'vote', target: p.id }),
                }, p.name),
              ),
            )
          : null,
        view.myVote ? h('p', { class: 'small' }, `${nameOf(view.myVote)} さんに投票中（開票まで変更できます）`) : null,
      );
    } else if (view.phase === 'guess') {
      const input = h('input', { class: 'input', maxlength: 30, placeholder: '多数派のお題は？', value: draft, oninput: e => (draft = e.target.value) });
      body = h('div', { class: 'result-box' },
        h('h3', {}, `🐺 ${nameOf(view.accused)} さんが人狼でした！`),
        view.imWolfGuessing
          ? h('form', {
              class: 'stack',
              onsubmit: e => {
                e.preventDefault();
                api.send({ type: 'guess', text: draft });
                draft = '';
              },
            },
              h('p', { style: { margin: 0 } }, 'あなたは人狼でした。みんなの話から「多数派のお題」を当てれば逆転勝利！'),
              h('div', { class: 'row' }, h('div', { style: { flex: 1 } }, input), h('button', { class: 'btn primary', type: 'submit' }, '答える')),
            )
          : h('p', {}, '人狼が多数派のお題を推理しています…'),
      );
    } else if (view.phase === 'result') {
      const r = view.reveal;
      body = h('div', { class: 'result-box' },
        h('h3', {}, r.winner === 'wolf' ? '🐺 人狼の勝利！' : '🏠 村の勝利！'),
        h('p', { style: { margin: '4px 0' } }, `人狼は ${nameOf(r.wolf)} さん。お題は 多数派「${r.majority}」／ 人狼「${r.minority}」`),
        r.guess !== null ? h('p', { class: 'small', style: { margin: '4px 0' } }, `人狼の答え: ${r.guess || '（なし）'}`) : null,
        h('div', { class: 'small' },
          '投票: ',
          view.players.map(p => `${p.name}→${nameOf(view.votes[p.id])}`).join('、'),
        ),
        me ? h('div', { class: 'game-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, '次のお題へ')) : null,
      );
    }

    // 入力中のフォーカスを保つ
    const focused = document.activeElement?.tagName === 'INPUT' && root.contains(document.activeElement);
    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('strong', {}, `第${view.round}回戦`)),
        seats,
        word,
        body,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
    if (focused) root.querySelector('input')?.focus();
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
