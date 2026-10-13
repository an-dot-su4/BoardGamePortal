// 人狼の画面
import { h } from '../../js/util.js';
import { ROLES } from './logic.js';

export function createUI(root, api) {
  let view = null;
  let pick = null;
  let hideRole = false;

  function render() {
    const me = view.me;
    const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
    const role = view.myRole ? ROLES[view.myRole] : null;
    const aliveCount = view.players.filter(p => p.alive).length;

    const seats = h('div', { class: 'seats' },
      view.players.map(p => {
        const r = view.roles?.[p.id];
        const mate = view.wolfMates.some(m => m.id === p.id);
        let status = '';
        if (!p.alive) status = '💀 脱落';
        else if (view.phase === 'day') status = p.ready ? '🙋 投票OK' : '💬';
        else if (view.phase === 'vote') status = p.voted ? '✅ 投票済み' : '🤔';
        return h('div', { class: ['seat', p.id === me && 'me', !p.alive && 'dead'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name),
          h('div', { class: 'small' }, status),
          r ? h('div', { class: 'small' }, `${ROLES[r].icon}${ROLES[r].name}`) : mate ? h('div', { class: 'small' }, '🐺 仲間') : null,
        );
      }),
    );

    const roleBox = role
      ? h('div', { class: 'result-box' },
          hideRole
            ? h('div', { class: 'row', style: { justifyContent: 'space-between' } },
                h('span', {}, '🙈 役職を隠しています'),
                h('button', { class: 'btn small', type: 'button', onclick: () => { hideRole = false; render(); } }, '表示'),
              )
            : h('div', {},
                h('div', { class: 'role-card' },
                  h('span', { class: 'icon' }, role.icon),
                  h('div', {}, h('span', { class: 'small muted' }, 'あなたの役職 '), h('strong', { style: { fontSize: '1.4rem' } }, role.name), view.alive ? '' : '（脱落）'),
                  h('div', { class: 'small' }, role.text),
                ),
                view.wolfMates.length ? h('p', { class: 'small', style: { margin: '6px 0 0' } }, '仲間の人狼: ' + view.wolfMates.map(m => nameOf(m.id)).join('、')) : null,
                view.myRole === 'seer' && view.seerResults.length
                  ? h('ul', { class: 'small', style: { margin: '6px 0 0', paddingLeft: '1.2em' } },
                      view.seerResults.map(r => h('li', {}, `${r.day}日目: ${nameOf(r.target)} は ${r.wolf ? '🐺 人狼' : '🙂 人狼ではない'}`)),
                    )
                  : null,
                h('div', { style: { textAlign: 'right' } },
                  h('button', { class: 'btn small', type: 'button', onclick: () => { hideRole = true; render(); } }, '隠す'),
                ),
              ),
        )
      : h('p', { class: 'muted' }, '👀 観戦中です');

    let body = null;
    if (view.phase === 'night') body = nightBox(nameOf, aliveCount);
    else if (view.phase === 'day') {
      const ready = view.players.find(p => p.id === me)?.ready;
      body = h('div', {},
        h('p', {}, view.lastNight?.victim ? `😱 昨夜、${nameOf(view.lastNight.victim)} さんが襲われました。` : '☀️ 朝になりました。', ' 誰が人狼か話し合いましょう。'),
        lastVoteBox(nameOf),
        view.alive
          ? h('div', { class: 'game-actions' },
              h('button', { class: ready ? 'btn' : 'btn primary', type: 'button', onclick: () => api.send({ type: 'ready' }) }, ready ? '取り消す' : '🙋 投票に進みたい'),
              h('span', { class: 'small' }, `${view.readyCount} / ${aliveCount} 人（過半数で投票へ）`),
            )
          : h('p', { class: 'small muted' }, '脱落したので、決着まで見守りましょう（チャットは決着後に解禁）'),
      );
    } else if (view.phase === 'vote') {
      body = h('div', {},
        h('p', {}, '🗳️ 処刑する人を投票で決めます（全員が投票すると開票。同票なら処刑なし）'),
        view.alive
          ? h('div', { class: 'game-actions' },
              view.players.filter(p => p.alive && p.id !== me).map(p =>
                h('button', { class: view.myVote === p.id ? 'btn primary' : 'btn', type: 'button', onclick: () => api.send({ type: 'vote', target: p.id }) }, p.name),
              ),
            )
          : null,
        view.myVote ? h('p', { class: 'small' }, `${nameOf(view.myVote)} さんに投票中（開票まで変更できます）`) : null,
      );
    } else if (view.phase === 'over') {
      body = h('div', { class: 'result-box' },
        h('h3', {}, view.winner === 'village' ? '🏠 村の勝利！' : '🐺 人狼の勝利！'),
        h('ul', { class: 'small', style: { margin: 0, paddingLeft: '1.2em' } },
          view.players.map(p => h('li', {}, `${ROLES[view.roles[p.id]].icon} ${p.name}: ${ROLES[view.roles[p.id]].name}${p.alive ? '' : '（脱落）'}`)),
        ),
        lastVoteBox(nameOf),
        me ? h('div', { class: 'game-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度（役職を配り直す）')) : null,
      );
    }

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, view.phase === 'over' ? '決着' : `${view.day}日目の${view.phase === 'night' ? '夜 🌙' : '昼 ☀️'}`),
          h('span', { class: 'small muted' }, `生存 ${aliveCount}人`),
        ),
        seats,
        roleBox,
        body,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function nightBox(nameOf, aliveCount) {
    const progress = h('p', { class: 'small muted' }, `${view.nightDone} / ${aliveCount} 人が行動を終えました。チャットは朝まで使えません。`);
    if (!view.alive) return h('div', {}, h('p', {}, '🌙 夜です。'), progress);
    if (view.myNight !== undefined) {
      return h('div', {},
        h('p', {}, view.myNight ? `🌙 ${nameOf(view.myNight)} さんを選びました。おやすみなさい…` : '🌙 おやすみなさい…'),
        progress,
      );
    }
    const targets = view.nightTargets;
    const verb = { wolf: '襲う相手', seer: '占う相手', knight: '守る相手' }[view.myRole];
    if (targets.length === 0) {
      return h('div', {},
        h('p', {}, view.myRole === 'wolf' ? '🌙 今夜は様子見です（1日目は襲撃なし）。' : '🌙 夜になりました。目を閉じて朝を待ちましょう。'),
        h('div', { class: 'game-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'night', target: null }) }, '😴 眠る')),
        progress,
      );
    }
    if (pick && !targets.includes(pick)) pick = null;
    return h('div', {},
      h('p', {}, `🌙 ${verb}を選んでください`),
      view.wolfMates.length
        ? h('p', { class: 'small' }, '仲間の狙い: ' + view.wolfMates.map(m => `${nameOf(m.id)}→${m.pick ? nameOf(m.pick) : '未定'}`).join('、'))
        : null,
      h('div', { class: 'game-actions' },
        targets.map(t => h('button', { class: pick === t ? 'btn primary' : 'btn', type: 'button', onclick: () => { pick = t; render(); } }, nameOf(t))),
      ),
      h('div', { class: 'game-actions' },
        h('button', {
          class: 'btn primary',
          type: 'button',
          disabled: !pick,
          onclick: () => {
            api.send({ type: 'night', target: pick });
            pick = null;
          },
        }, '決定'),
      ),
      progress,
    );
  }

  function lastVoteBox(nameOf) {
    const lv = view.lastVote;
    if (!lv) return null;
    return h('p', { class: 'small muted' },
      `前回の投票（${lv.day}日目）: `,
      Object.entries(lv.votes).map(([from, to]) => `${nameOf(from)}→${nameOf(to)}`).join('、'),
      lv.executed ? ` ／ ${nameOf(lv.executed)} さんが処刑` : ' ／ 処刑なし',
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
