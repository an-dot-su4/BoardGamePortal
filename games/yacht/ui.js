// ヨットの画面
import { h } from '../../js/util.js';
import { BONUS, BONUS_LINE, CATS, CAT_LABEL, UPPER, scoreFor } from './logic.js';

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const HINT = {
  choice: '全部の合計', four: '同じ目4つ以上・全部の合計', full: '3つと2つ・全部の合計',
  sstr: '4つ続き 15点', lstr: '5つ続き 30点', yacht: '5つ同じ 50点',
};

export function createUI(root, api) {
  let view = null;
  let seen = null;

  function render(rolled) {
    const v = view;
    const me = v.me;
    const myTurn = me && v.turn === me && v.phase === 'play';
    const nameOf = id => v.players.find(p => p.id === id)?.name ?? '?';
    const canHold = myTurn && v.rolls > 0 && v.rolls < 3;

    const dice = h('div', { class: 'yt-dice' }, v.dice.map((d, i) =>
      h(canHold ? 'button' : 'div', {
        class: ['yt-die', v.rolls === 0 && 'blank', v.held[i] && 'held', rolled && !v.held[i] && 'rolling'].filter(Boolean).join(' '),
        type: canHold ? 'button' : null, 'aria-label': v.rolls ? `${d}の目${v.held[i] ? '（とっておく）' : ''}` : 'まだ振っていない',
        onclick: canHold ? () => api.send({ type: 'hold', index: i }) : null,
      },
        v.rolls ? Array.from({ length: 9 }, (_, k) => h('i', { class: PIPS[d].includes(k) ? 'pip' : '' })) : null,
        v.held[i] && v.rolls ? h('span', { class: 'yt-keep' }, 'キープ') : null,
      ),
    ));

    let status = null;
    if (v.phase === 'play') {
      status = myTurn
        ? h('strong', {}, v.rolls === 0 ? '🟡 あなたの番です。サイコロを振ろう' : v.rolls < 3 ? '🟡 とっておくサイコロを押して振り直すか、表の役を選ぶ' : '🟡 表から役を選んでください')
        : h('span', {}, `${nameOf(v.turn)} さんの番です（${v.rolls}回振った）`);
    }

    const actions = myTurn
      ? h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary yt-big', type: 'button', disabled: v.rolls >= 3 || (v.rolls > 0 && v.held.every(Boolean)), onclick: () => api.send({ type: 'roll' }) },
            v.rolls === 0 ? '🎲 振る' : `🎲 振り直す（あと${3 - v.rolls}回）`),
        )
      : null;

    // 点数表
    const head = h('tr', {}, h('th', {}, '役'), v.players.map(p => h('th', { class: p.id === v.turn ? 'turn' : '' }, p.name, p.bot ? ' 🤖' : '')));
    const row = cat => h('tr', {},
      h('th', { class: 'yt-cat', title: HINT[cat] ?? `${cat === 'ones' ? 1 : UPPER.indexOf(cat) + 1}の目の合計` }, CAT_LABEL[cat], HINT[cat] ? h('small', {}, HINT[cat]) : null),
      v.players.map(p => {
        const done = p.sheet[cat];
        if (done !== undefined) {
          const fresh = v.lastScore && v.lastScore.by === p.id && v.lastScore.cat === cat;
          return h('td', { class: ['done', fresh && 'fresh'].filter(Boolean).join(' ') }, String(done));
        }
        if (p.id === me && myTurn && v.rolls > 0) {
          const s = scoreFor(cat, v.dice);
          return h('td', {}, h('button', { class: ['yt-pick', s === 0 && 'zero'].filter(Boolean).join(' '), type: 'button', onclick: () => api.send({ type: 'score', cat }) }, String(s)));
        }
        if (p.id === v.turn && v.rolls > 0) return h('td', { class: 'muted yt-preview' }, String(scoreFor(cat, v.dice)));
        return h('td', {}, '');
      }),
    );
    const sumRow = (label, key, cls) => h('tr', { class: cls }, h('th', {}, label), v.players.map(p => h('td', {}, String(p[key]))));
    const table = h('div', { class: 'yt-scroll' },
      h('table', { class: 'yt-sheet' },
        h('thead', {}, head),
        h('tbody', {},
          UPPER.map(row),
          h('tr', { class: 'sub' }, h('th', { class: 'yt-cat' }, '小計', h('small', {}, `${BONUS_LINE}点以上でボーナス+${BONUS}`)), v.players.map(p => h('td', {}, `${p.upper}`, p.bonus ? h('span', { class: 'yt-bonus' }, ` +${p.bonus}`) : ''))),
          CATS.slice(6).map(row),
          sumRow('合計', 'total', 'total'),
        ),
      ),
    );

    root.replaceChildren(
      h('div', { class: 'table' },
        h('div', { class: 'row', style: { justifyContent: 'space-between' } },
          h('strong', {}, v.phase === 'end' ? `第${v.games}局 終了` : `第${v.games}局・${v.round}/12巡目`),
          h('span', { class: 'small muted' }, v.players.map(p => `${p.name} ${p.wins}勝`).join('・')),
        ),
        h('div', { style: { margin: '6px 0 8px' } }, status),
        v.phase === 'end' ? resultBox() : null,
        v.phase === 'play' ? h('div', { class: 'result-box yt-stage' }, dice, actions) : null,
        table,
        !me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
        h('details', { style: { marginTop: '12px' } },
          h('summary', { class: 'small' }, 'ルール'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
        ),
        h('div', { class: 'log', style: { marginTop: '8px' } }, v.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
      ),
    );
  }

  function resultBox() {
    const v = view;
    const names = v.players.filter(p => v.winners.includes(p.id)).map(p => p.name);
    const ranking = v.players.slice().sort((a, b) => b.total - a.total);
    return h('div', { class: 'result-box' },
      h('h3', {}, `🏆 ${names.join('・')} さんの勝ち！`),
      h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — ${p.total}点`))),
      v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一局（先手は次の人）') : null,
    );
  }

  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    update(next) {
      // 振ったとき（振った回数が増えたとき）だけサイコロを転がす
      const rolled = seen && next.turn === seen.turn && next.rolls > seen.rolls;
      seen = { turn: next.turn, rolls: next.rolls };
      view = next;
      render(rolled && !reduce);
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
