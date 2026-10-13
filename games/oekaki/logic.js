// お絵描き伝言
//
// 最初に全員がお題を書く。お題のノートは隣の人へ回り、
// 「前の人の文章を絵にする」「前の人の絵を見て何の絵か当てる」を交互に繰り返す。
// 最後にノートを1冊ずつ見返して、伝言がどう変わったかを楽しむ。勝ち負けはなし。
import { GameError } from '../../js/util.js';

export const CANVAS_W = 300;
export const CANVAS_H = 225;
export const PALETTE = ['#222222', '#e8524a', '#3b82f6', '#22a35a', '#f2b705', '#9b5de5', '#8b5a2b', '#ffffff'];
export const WIDTHS = [3, 7, 16];
export const TEXT_MAX = 40;
const MAX_POINTS = 4000; // 1枚の絵の点の数の上限（通信量を抑えるため）
const MAX_STROKES = 400;

export const PROMPTS = [
  '空を飛ぶ犬', 'カレーを食べるロボット', '雪だるまの夏休み', 'ねこの宅配便', '月でお花見', 'おばけの運動会',
  '巨大なプリン', '恐竜の歯医者さん', '電車に乗ったペンギン', '海の中の図書館', '魔法使いの朝ごはん', '踊るサボテン',
  'お寿司の行列', 'カメとウサギのリレー', '宇宙人の遠足', '王様の昼寝', 'ひまわり畑のゾウ', '雨の日のカエル',
  'ドラゴンの誕生日', '忍者のパン屋', '泣いている太陽', 'ゴリラのピアノ発表会', '冷蔵庫の中の家族', '雲のソファ',
];

// 人数が偶数のときは、最後が「当てる」で終わるように1手短くする
export function stepCount(n) {
  return n % 2 === 1 ? n : n - 1;
}

export function stepKind(step) {
  if (step === 0) return 'write';
  return step % 2 === 1 ? 'draw' : 'guess';
}

export function setup(players) {
  const ids = players.map(p => p.id);
  return {
    players: ids,
    names: Object.fromEntries(players.map(p => [p.id, p.name])),
    steps: stepCount(ids.length),
    step: 0,
    chains: ids.map(owner => ({ owner, entries: [] })),
    submitted: {},
    phase: 'play',
    revealed: 0,
  };
}

// 今のステップで pid が担当するノートの番号
export function chainIndexFor(state, pid, step = state.step) {
  const n = state.players.length;
  const j = state.players.indexOf(pid);
  return (((j - step) % n) + n) % n;
}

function cleanText(text) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX);
  if (!t) throw new GameError('文字を入力してください');
  return t;
}

export function cleanDrawing(drawing) {
  if (!drawing || !Array.isArray(drawing.strokes)) throw new GameError('絵が正しくありません');
  if (drawing.strokes.length > MAX_STROKES) throw new GameError('線が多すぎます');
  let points = 0;
  const strokes = drawing.strokes.map(s => {
    const c = Number(s?.c);
    const w = Number(s?.w);
    if (!Number.isInteger(c) || c < 0 || c >= PALETTE.length) throw new GameError('色が正しくありません');
    if (!WIDTHS.includes(w)) throw new GameError('太さが正しくありません');
    if (!Array.isArray(s.p) || s.p.length < 2 || s.p.length % 2 !== 0) throw new GameError('線が正しくありません');
    points += s.p.length / 2;
    const p = s.p.map((v, i) => {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n)) throw new GameError('線が正しくありません');
      return Math.max(0, Math.min(i % 2 === 0 ? CANVAS_W : CANVAS_H, n));
    });
    return { c, w, p };
  });
  if (points > MAX_POINTS) throw new GameError('絵が細かすぎます。線を減らしてください');
  return { strokes };
}

export function act(state, pid, action) {
  if (!state.players.includes(pid)) throw new GameError('観戦中は操作できません');
  const type = action?.type;

  if (type === 'restart') {
    if (state.phase !== 'reveal') throw new GameError('ゲーム中です');
    Object.assign(state, setup(state.players.map(p => ({ id: p, name: state.names[p] }))));
    return;
  }

  if (type === 'reveal') {
    if (state.phase !== 'reveal') throw new GameError('まだ見返せません');
    const to = Number(action.to);
    if (!Number.isInteger(to) || to < 0 || to > state.chains.length) throw new GameError('ページが正しくありません');
    state.revealed = Math.max(state.revealed, to);
    return;
  }

  if (type === 'submit') {
    if (state.phase !== 'play') throw new GameError('今は提出できません');
    const kind = stepKind(state.step);
    const entry = kind === 'draw' ? { kind, drawing: cleanDrawing(action.drawing) } : { kind, text: cleanText(action.text) };
    state.submitted[pid] = entry; // 全員そろうまでは出し直せる
    if (state.players.every(p => p in state.submitted)) advance(state);
    return;
  }

  if (type === 'unsubmit') {
    if (state.phase !== 'play') throw new GameError('今は操作できません');
    delete state.submitted[pid];
    return;
  }

  throw new GameError('不明な操作です');
}

function advance(state) {
  for (const p of state.players) {
    state.chains[chainIndexFor(state, p)].entries.push({ by: p, ...state.submitted[p] });
  }
  state.submitted = {};
  state.step += 1;
  if (state.step >= state.steps) {
    state.phase = 'reveal';
    state.revealed = 1;
  }
}

export function view(state, pid) {
  const seated = state.players.includes(pid);
  const base = {
    phase: state.phase,
    me: seated ? pid : null,
    step: state.step,
    steps: state.steps,
    kind: state.phase === 'play' ? stepKind(state.step) : null,
    players: state.players.map(p => ({ id: p, name: state.names[p], done: p in state.submitted })),
  };
  if (state.phase === 'reveal') {
    return { ...base, revealed: state.revealed, chains: state.chains };
  }
  // 自分が今担当しているノートの、ひとつ前の内容だけを見せる
  let prompt = null;
  let mine = null;
  if (seated) {
    const chain = state.chains[chainIndexFor(state, pid)];
    prompt = chain.entries[chain.entries.length - 1] ?? null;
    const sub = state.submitted[pid];
    mine = sub ? { kind: sub.kind, text: sub.text ?? null } : null; // 絵は送り返さない（通信量を抑える）
  }
  return { ...base, prompt, mine };
}
