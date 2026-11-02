// 疾走グリコの画面
//   上: グリコエリア（マス目・コマ・ゴールまでの残り）
//   下: じゃんけんエリア（見せ合い・スキルスロット・手のボタン）。スマホでは画面の下に固定
// 演出（じゃんけん→ポン→サイコロ→歩く→スキル獲得）は画面側だけで再生する。view.seq が増えたら再生
import { h } from '../../js/util.js';
import { GOALS, HANDS, INST_TURNS, SKILLS } from './logic.js';

const COLS = 10;
const COLORS = ['#e8524a', '#3b82f6'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '🏃 疾走グリコの設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'ゴールまでのマス数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, goal: Number(e.target.value) }) },
        GOALS.map(n => h('option', { value: n, selected: options.goal === n }, `${n}マス${n === 100 ? '（標準）' : n < 100 ? '（短め）' : '（長め）'}`)),
      ),
    ),
  );
}

export function createUI(root, api) {
  let view = null;
  let shown = null; // 画面に出しているコマの位置（演出中は view.pos より遅れる）
  let seenSeq = null; // 演出を再生し終えた通し番号
  let stage = null; // 見せ合いスペースの表示 { step, last, rolling? }
  let busy = false; // 演出中
  let help = false;
  let destroyed = false;

  const nameOf = id => view.players.find(p => p.id === id)?.name ?? '?';
  const colorOf = id => COLORS[view.players.findIndex(p => p.id === id)] ?? '#888';

  async function play(last) {
    busy = true;
    const prev = { ...shown };
    stage = { step: 'jan', last };
    render();
    await sleep(550);
    stage = { step: 'pon', last };
    render();
    await sleep(750);
    if (destroyed) return;
    if (last.draw) {
      stage = { step: 'draw', last };
      render();
      await sleep(700);
    } else {
      // サイコロが転がる
      const hand = HANDS[last.hand];
      for (let i = 0; i < 7; i++) {
        stage = { step: 'roll', last, rolling: last.dice.map(() => hand.faces[Math.floor(Math.random() * hand.faces.length)]) };
        render();
        await sleep(90);
      }
      stage = { step: 'dice', last };
      render();
      await sleep(900);
      // 1マスずつ歩く
      const steps = last.to - last.from;
      const per = Math.max(45, Math.min(130, 2400 / Math.max(1, steps)));
      shown = { ...prev, [last.winner]: last.from };
      for (let p = last.from + 1; p <= last.to; p++) {
        if (destroyed) return;
        shown = { ...shown, [last.winner]: p };
        stage = { step: 'walk', last };
        render();
        await sleep(per);
      }
      stage = { step: last.gained ? 'gain' : 'done', last };
      render();
      if (last.gained) await sleep(1100);
    }
    busy = false;
    seenSeq = last.seq;
    shown = Object.fromEntries(view.players.map(p => [p.id, p.pos]));
    if (stage.step !== 'gain') stage = { step: 'done', last };
    render();
    // 演出中にもう次が決まっていたら続けて再生
    if (view.last && view.last.seq !== seenSeq) play(view.last);
  }

  // ---- 部品 ----

  function cell(i) {
    const here = view.players.filter(p => (shown?.[p.id] ?? p.pos) === i);
    const event = view.events.includes(i);
    return h('div', { class: ['gl-cell', event && 'event', i === 0 && 'start', i === view.goal && 'goal'].filter(Boolean).join(' '), title: event ? 'イベントマス（止まるとスキル獲得）' : '' },
      h('span', { class: 'gl-num' }, i === 0 ? 'S' : i === view.goal ? '🏁' : event ? '★' : i),
      here.length ? h('div', { class: 'gl-tokens' }, here.map(p => h('span', { class: 'gl-token', style: { background: colorOf(p.id) } }, p.name.slice(0, 1)))) : null,
    );
  }

  function boardEl() {
    const rows = [];
    for (let start = 0; start <= view.goal; start += COLS) {
      const idx = [];
      for (let i = start; i < Math.min(start + COLS, view.goal + 1); i++) idx.push(i);
      if ((start / COLS) % 2 === 1) {
        while (idx.length < COLS) idx.push(null);
        idx.reverse();
      }
      rows.push(idx);
    }
    return h('div', { class: 'gl-board', style: { gridTemplateColumns: `repeat(${COLS}, 1fr)` } }, rows.flat().map(i => (i === null ? h('div', {}) : cell(i))));
  }

  function runners() {
    return h('div', { class: 'gl-runners' },
      view.players.map(p => {
        const pos = shown?.[p.id] ?? p.pos;
        return h('div', { class: ['gl-runner', p.id === view.me && 'me'].filter(Boolean).join(' ') },
          h('span', { class: 'gl-token', style: { background: colorOf(p.id) } }, p.name.slice(0, 1)),
          h('span', { class: 'gl-runner-name' }, p.bot ? '🤖 ' : '', p.name, p.id === view.me ? '（あなた）' : ''),
          h('span', { class: 'gl-left' }, view.goal - pos > 0 ? `ゴールまで ${view.goal - pos}` : '🏁 ゴール'),
          h('div', { class: 'gl-bar' }, h('div', { style: { width: `${(pos / view.goal) * 100}%`, background: colorOf(p.id) } })),
        );
      }),
    );
  }

  function slotsEl(p, mine) {
    const perm = p.slots.perm ? SKILLS[p.slots.perm] : null;
    const inst = p.slots.inst ? SKILLS[p.slots.inst.id] : null;
    return h('div', { class: ['gl-slots', mine && 'mine'].filter(Boolean).join(' ') },
      h('span', { class: 'gl-slots-name' }, mine ? 'あなたのスキル' : `${p.name}のスキル`),
      h('span', { class: ['gl-slot', perm && 'on'].filter(Boolean).join(' '), title: perm?.text ?? '永続スキルの枠' }, perm ? `${perm.icon}${perm.name}` : '永続: なし'),
      h('span', { class: ['gl-slot', 'inst', inst && 'on'].filter(Boolean).join(' '), title: inst?.text ?? '瞬間スキルの枠' }, inst ? `${inst.icon}${inst.name}（あと${p.slots.inst.left}回）` : '瞬間: なし'),
    );
  }

  function handIcon(hand) {
    return h('span', { class: 'gl-hand-icon' }, HANDS[hand].icon);
  }

  // 見せ合いスペース
  function stageEl() {
    const me = view.me ?? view.players[0].id;
    const opp = view.players.find(p => p.id !== me) ?? view.players[1];
    const st = stage;
    if (!st || st.step === 'idle') {
      const waiting = view.players.filter(p => !p.ready).map(p => p.name);
      return h('div', { class: 'gl-stage' },
        h('div', { class: 'gl-call' }, view.phase === 'over' ? '' : 'さいしょはグー！'),
        h('div', { class: 'small' }, view.phase === 'play' ? (waiting.length ? `手を選んでください（${waiting.join('・')} が選択中）` : '') : ''),
      );
    }
    const last = st.last;
    const side = (pid, reveal) =>
      h('div', { class: ['gl-side', !last.draw && last.winner === pid && st.step !== 'jan' && 'win'].filter(Boolean).join(' ') },
        h('div', { class: 'small' }, nameOf(pid)),
        reveal ? handIcon(last.hands[pid]) : h('span', { class: 'gl-hand-icon shake' }, '✊'),
      );
    const reveal = st.step !== 'jan';
    let center;
    if (st.step === 'jan') center = h('div', { class: 'gl-call big' }, 'じゃんけん…');
    else if (st.step === 'pon') center = h('div', { class: 'gl-call big' }, 'ポン！');
    else if (st.step === 'draw') center = h('div', { class: 'gl-call big' }, 'あいこ！');
    else {
      const dice = st.rolling ?? last.final;
      center = h('div', { class: 'gl-result' },
        h('div', { class: 'small' }, `${nameOf(last.winner)} が ${HANDS[last.hand].name}で勝ち！`),
        h('div', { class: 'gl-dice' }, dice.map((d, i) => h('span', { class: ['gl-die', st.rolling && 'rolling', !st.rolling && last.final[i] !== last.dice[i] && 'mod'].filter(Boolean).join(' ') }, d))),
        st.rolling
          ? null
          : h('div', { class: 'gl-total' },
              last.bonus ? `${last.final.join('+')} +${last.bonus} = ` : last.final.length > 1 ? `${last.final.join('+')} = ` : '',
              h('b', {}, `${last.total}マス`),
              last.mods.length ? h('div', { class: 'small gl-mods' }, '発動: ', last.mods.join('・')) : null,
            ),
        st.step === 'gain' || (st.step === 'done' && last.gained)
          ? h('div', { class: 'gl-gain' }, `★ イベントマス！ ${SKILLS[last.gained].icon}${SKILLS[last.gained].name} を獲得`)
          : null,
      );
    }
    return h('div', { class: 'gl-stage' },
      h('div', { class: 'gl-faceoff' }, side(me, reveal), center, side(opp.id, reveal)),
    );
  }

  function handButtons() {
    if (!view.me || view.phase !== 'play') return null;
    const disabled = busy;
    return h('div', { class: 'gl-hands' },
      Object.entries(HANDS).map(([id, hd]) =>
        h('button', {
          class: ['gl-hand-btn', view.myHand === id && 'picked'].filter(Boolean).join(' '),
          type: 'button',
          disabled,
          onclick: () => api.send({ type: 'hand', hand: id }),
        },
          h('span', { class: 'gl-hand-icon' }, hd.icon),
          h('span', {}, hd.name),
          h('span', { class: 'gl-hand-dice' }, `${hd.faces.join('・')}×${hd.count}`),
        ),
      ),
    );
  }

  function helpEl() {
    const avg = hd => ((hd.faces.reduce((a, b) => a + b, 0) / hd.faces.length) * hd.count).toFixed(1);
    return h('div', { class: 'gl-help', onclick: e => e.target === e.currentTarget && ((help = false), render()) },
      h('div', { class: 'gl-help-inner' },
        h('h3', {}, '❓ 手とサイコロ・スキル'),
        h('table', { class: 'gl-help-table' },
          h('tr', {}, h('th', {}, '勝った手'), h('th', {}, 'サイコロの面'), h('th', {}, '個数'), h('th', {}, '平均')),
          Object.values(HANDS).map(hd => h('tr', {}, h('td', {}, `${hd.icon}${hd.name}`), h('td', {}, hd.faces.join('・')), h('td', {}, `${hd.count}個`), h('td', {}, `${avg(hd)}マス`))),
        ),
        h('p', { class: 'small' }, '振った目の合計だけ進む。あいこはやり直し。★のイベントマスに止まるとスキルを1つ得る（6種からランダム）。'),
        h('h4', {}, '永続スキル（スロット1・使うまで残る）'),
        h('ul', { class: 'small' }, Object.values(SKILLS).filter(s => s.kind === 'perm').map(s => h('li', {}, h('b', {}, `${s.icon}${s.name}`), ': ', s.text))),
        h('h4', {}, `瞬間スキル（スロット2・勝敗のついた${INST_TURNS}回のうちに勝てば発動）`),
        h('ul', { class: 'small' }, Object.values(SKILLS).filter(s => s.kind === 'inst').map(s => h('li', {}, h('b', {}, `${s.icon}${s.name}`), ': ', s.text))),
        h('p', { class: 'small' }, '同じ種類のスキルを得ると上書き。スキルは条件を満たすと自動で発動して消える。永続と瞬間が同時に発動することもある。'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { help = false; render(); } }, '閉じる'),
      ),
    );
  }

  function render() {
    if (!view) return;
    const me = view.players.find(p => p.id === view.me);
    const opp = view.players.find(p => p.id !== view.me) ?? view.players[1];
    const boardBox = root.querySelector('.gl-board-wrap');
    const scroll = boardBox ? boardBox.scrollTop : null;
    const over = view.phase === 'over' && !busy;
    root.replaceChildren(
      h('div', { class: 'table gl-table' },
        h('section', { class: 'gl-glico' },
          h('div', { class: 'gl-head' },
            h('strong', {}, '🏃 グリコエリア'),
            h('button', { class: 'btn gl-help-btn', type: 'button', onclick: () => { help = true; render(); } }, '❓ ヘルプ'),
          ),
          runners(),
          h('div', { class: 'gl-board-wrap' }, boardEl()),
        ),
        over
          ? h('div', { class: 'result-box' },
              h('h3', {}, `🏆 ${nameOf(view.winner)} の勝ち！`),
              h('div', { class: 'game-actions' },
                view.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度') : null,
                api.backToLobby ? h('button', { class: 'btn', type: 'button', onclick: () => api.backToLobby() }, '🏠 ロビーに戻る') : null,
              ),
            )
          : null,
        h('section', { class: 'gl-janken' },
          stageEl(),
          me ? slotsEl(me, true) : null,
          opp && opp !== me ? slotsEl(opp, false) : null,
          handButtons(),
          view.myHand && !busy && view.phase === 'play' ? h('div', { class: 'small gl-wait' }, `${HANDS[view.myHand].icon} を出しました。相手を待っています（出し直しもできます）`) : null,
        ),
        h('details', { class: 'gl-log-box' },
          h('summary', { class: 'small' }, 'ルール・記録'),
          h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
          h('div', { class: 'log' }, view.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
        ),
      ),
      ...(help ? [helpEl()] : []),
    );
    const wrap = root.querySelector('.gl-board-wrap');
    if (wrap && scroll !== null) wrap.scrollTop = scroll;
  }

  return {
    update(next) {
      const first = !view;
      view = next;
      if (first) {
        // 途中から開いたときは演出しない
        seenSeq = view.seq;
        shown = Object.fromEntries(view.players.map(p => [p.id, p.pos]));
        stage = view.last ? { step: 'done', last: view.last } : null;
      }
      if (view.seq < (seenSeq ?? 0)) {
        // もう一度遊ぶ（最初から）
        seenSeq = view.seq;
        stage = null;
        shown = Object.fromEntries(view.players.map(p => [p.id, p.pos]));
      }
      if (!busy && view.last && view.last.seq !== seenSeq) {
        play(view.last);
        return;
      }
      if (!busy) shown = Object.fromEntries(view.players.map(p => [p.id, p.pos]));
      render();
    },
    destroy() {
      destroyed = true;
      root.replaceChildren();
    },
  };
}
