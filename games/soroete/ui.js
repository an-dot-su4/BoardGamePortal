// みんなでそろえての画面
// 入力中の文字が消えないよう、入力欄は「お題が変わったとき」「出した／取り消したとき」だけ作り直す
import { h } from '../../js/util.js';
import { MAX_LEN, ROUND_COUNTS } from './logic.js';

export function renderOptions(root, options, { editable, onChange }) {
  root.replaceChildren(
    h('h2', { style: { margin: 0 } }, '💭 みんなでそろえての設定', editable ? '' : h('span', { class: 'small muted' }, '（ホストが決めます）')),
    h('div', { class: 'field' },
      h('label', {}, 'お題の数'),
      h('select', { class: 'input', disabled: !editable, onchange: e => onChange({ ...options, rounds: Number(e.target.value) }) },
        ROUND_COUNTS.map(n => h('option', { value: n, selected: options.rounds === n }, `${n}問${n === 8 ? '（標準）' : ''}`)),
      ),
    ),
  );
}

export function createUI(root, api) {
  let view = null;
  let inputKey = null;
  let picked = null; // まとめるために選んだ答え
  const top = h('div');
  const inputArea = h('div');
  const bottom = h('div');
  root.replaceChildren(h('div', { class: 'table' }, top, inputArea, bottom));

  function nameOf(id) {
    return view.players.find(p => p.id === id)?.name ?? '?';
  }

  function renderTop() {
    const v = view;
    const waiting = v.players.filter(p => !p.ready);
    top.replaceChildren(h('div', {},
      h('div', { class: 'row', style: { justifyContent: 'space-between' } },
        h('strong', {}, v.phase === 'end' ? '結果' : `第${v.round}問 / 全${v.totalRounds}問`),
        h('span', { class: 'small muted' }, v.phase === 'answer' && waiting.length ? `答えを待っています: ${waiting.map(p => p.name).join('・')}` : ''),
      ),
      v.prompt ? h('div', { class: 'sr-prompt' }, v.prompt) : null,
      h('div', { class: 'seats' }, v.players.map(p =>
        h('div', { class: ['seat', p.id === v.me && 'me', v.phase === 'answer' && !p.ready && 'turn'].filter(Boolean).join(' ') },
          h('div', { class: 'name' }, p.name, p.bot ? ' 🤖' : ''),
          h('div', { class: 'small' }, `⭐ ${p.score}点`, v.phase === 'answer' ? (p.ready ? '・✅' : '・✍️') : ''),
        ),
      )),
    ));
  }

  function renderInput() {
    const v = view;
    const key = `${v.round}-${v.phase}-${v.myAnswer === null ? 'none' : 'done'}`;
    if (key === inputKey) return;
    inputKey = key;
    if (!v.me || v.phase !== 'answer') return inputArea.replaceChildren();
    if (v.myAnswer !== null) {
      return inputArea.replaceChildren(h('div', { class: 'result-box' },
        h('p', { style: { margin: '0 0 6px' } }, 'あなたの答え: ', h('strong', {}, v.myAnswer), '（全員がそろうまで書き直せます）'),
        h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'cancel' }) }, '書き直す'),
      ));
    }
    const input = h('input', { class: 'input sr-input', type: 'text', maxlength: MAX_LEN, placeholder: 'みんなが書きそうな答えは？', autocomplete: 'off' });
    const submit = () => {
      const text = input.value.trim();
      if (!text) return api.toast('答えを書いてください');
      api.send({ type: 'answer', text });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) submit(); });
    inputArea.replaceChildren(h('div', { class: 'result-box' },
      h('div', { class: 'small', style: { marginBottom: '6px' } }, 'ほかの人と同じ答えになるほど点が入ります（ほかの人には公開まで見えません）'),
      h('div', { class: 'row sr-form' }, input, h('button', { class: 'btn primary', type: 'button', onclick: submit }, '答える')),
    ));
  }

  function renderBottom() {
    const v = view;
    let main = null;
    if (v.phase === 'reveal') {
      const keys = new Set(v.groups.map(g => g.key));
      if (picked && !keys.has(picked)) picked = null;
      main = h('div', { class: 'result-box' },
        h('h3', {}, '答えの公開'),
        h('div', { class: 'sr-groups' }, v.groups.map(g =>
          h('button', {
            class: ['sr-group', g.points && 'hit', picked === g.key && 'picked'].filter(Boolean).join(' '), type: 'button',
            disabled: !v.me, title: 'タップして選び、もう1つタップすると同じ答えとしてまとめます',
            onclick: () => {
              if (!picked) picked = g.key;
              else if (picked === g.key) picked = null;
              else {
                api.send({ type: 'merge', a: picked, b: g.key });
                picked = null;
              }
              renderBottom();
            },
          },
            h('span', { class: 'sr-label' }, g.label),
            h('span', { class: 'small' }, g.members.map(nameOf).join('・')),
            h('span', { class: 'sr-pts' }, g.points ? `+${g.points}点` : '0点'),
          ),
        )),
        v.me ? h('p', { class: 'small muted', style: { margin: '6px 0' } }, picked ? 'もう1つの答えをタップすると、同じ答えとしてまとめます' : '「林檎」と「りんご」のように同じ意味の答えは、2つを順にタップしてまとめられます') : null,
        v.me ? h('div', { class: 'game-actions' },
          h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'next' }) }, v.round >= v.totalRounds ? '結果を見る' : '次のお題へ'),
          h('button', { class: 'btn', type: 'button', onclick: () => api.send({ type: 'split' }) }, 'まとめを元に戻す'),
        ) : null,
      );
    } else if (v.phase === 'end') {
      const names = v.players.filter(p => v.winners.includes(p.id)).map(p => p.name);
      const ranking = v.players.slice().sort((a, b) => b.score - a.score);
      main = h('div', { class: 'result-box' },
        h('h3', {}, `🏆 ${names.join('・')} さんの勝ち！`),
        h('ol', {}, ranking.map(p => h('li', {}, `${p.name} — ${p.score}点`))),
        v.me ? h('button', { class: 'btn primary', type: 'button', onclick: () => api.send({ type: 'restart' }) }, 'もう一度遊ぶ') : null,
      );
    }
    const history = v.history.length
      ? h('details', { style: { marginTop: '10px' }, open: v.phase === 'end' },
          h('summary', { class: 'small' }, 'これまでのお題'),
          h('ol', { class: 'small sr-hist' }, v.history.map(hh => h('li', {}, `${hh.prompt} → `,
            hh.groups.map((g, i) => h('span', { class: g.points ? 'sr-hit' : '' }, `${i ? '／' : ''}${g.label}×${g.members.length}`)),
          ))),
        )
      : null;
    bottom.replaceChildren(h('div', {},
      main,
      !v.me ? h('p', { class: 'muted' }, '👀 観戦中です') : null,
      history,
      h('details', { style: { marginTop: '12px' } },
        h('summary', { class: 'small' }, 'ルール'),
        h('ol', { class: 'small' }, api.rules.map(r => h('li', {}, r))),
      ),
      h('div', { class: 'log', style: { marginTop: '8px' } }, v.log.slice().reverse().map(l => h('div', { class: 'small muted' }, l))),
    ));
  }

  return {
    update(next) {
      view = next;
      renderTop();
      renderInput();
      renderBottom();
    },
    destroy() {
      root.replaceChildren();
    },
  };
}
