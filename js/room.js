// 部屋ページ。ロビー・プレイヤー一覧・チャットなどの共通部分を担当し、
// ゲーム中の画面は各ゲームの ui.js に任せる。
import { findGame, GAMES, MODE_LABEL } from '../games/registry.js';
import { connect, isLocalMode } from './net.js';
import { Guest, Host } from './host.js';
import { h, normalizeCode, passHash } from './util.js';
import {
  cleanName, hostRecord, NAME_MAX, PASS_MAX, playerId, playerName, playerPass, rememberRoom, saveHostRecord, setPlayerName, setPlayerPass,
} from './storage.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const code = normalizeCode(location.hash.slice(1));
const pid = playerId();

let client = null;
let isHost = false;
let snapshot = null; // 最新の { room, you, view, chat }
let connStatus = 'searching';
let gameUI = null; // { gameId, ui }
let uiLoading = null;
const startedAt = Date.now();

$('home-link').href = './' + location.search;
addEventListener('hashchange', () => location.reload());

if (!code) {
  stage.replaceChildren(
    h('div', { class: 'panel stack' },
      h('h2', {}, '部屋番号が正しくありません'),
      h('a', { class: 'btn primary', href: './' + location.search }, 'ポータルに戻る'),
    ),
  );
} else {
  $('room-code').textContent = code;
  document.title = `${code} | ボドゲポータル`;
  if (playerName()) start();
  else askName();
}

// 名前と合言葉（任意）の入力。change = true なら入室後の変更（保存して読み込み直す）
function askName(change = false) {
  const input = h('input', { class: 'input', maxlength: NAME_MAX, placeholder: '例: たろう', required: true, autocomplete: 'nickname', value: playerName() });
  const passInput = h('input', { class: 'input', maxlength: PASS_MAX, placeholder: 'なしでもOK', autocomplete: 'off', value: playerPass() });
  const form = h('form', {
    class: 'panel stack',
    onsubmit: e => {
      e.preventDefault();
      const name = cleanName(input.value);
      if (!name) return;
      setPlayerName(name);
      setPlayerPass(passInput.value.trim());
      if (change) location.reload();
      else start();
    },
  },
    h('h2', {}, change ? '名前・合言葉を変える' : `部屋 ${code} に参加`),
    h('div', { class: 'field' }, h('label', {}, 'あなたの名前'), input),
    h('div', { class: 'field' },
      h('label', {}, '合言葉（任意）'),
      passInput,
      h('span', { class: 'small muted' }, '設定すると、あなたの席には同じ合言葉を知っている人しか入れなくなります。別の端末からも、同じ名前と合言葉で席に戻れます。'),
    ),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary', type: 'submit' }, change ? '保存して入り直す' : '参加する'),
      change ? h('button', { class: 'btn', type: 'button', onclick: () => dialog.close() }, 'やめる') : null,
    ),
  );
  // 入室後の変更はゲーム画面の上に重ねて出す（ゲームの更新で消えないように）
  const dialog = change ? h('dialog', { class: 'name-dialog', onclose: () => dialog.remove() }, form) : null;
  if (dialog) {
    document.body.appendChild(dialog);
    dialog.showModal();
  } else {
    stage.replaceChildren(form);
  }
  input.focus();
}

async function start() {
  stage.replaceChildren(h('p', { class: 'muted' }, '接続しています…'));
  let transport;
  try {
    transport = await connect(code);
  } catch (err) {
    console.error(err);
    stage.replaceChildren(h('div', { class: 'banner' }, '通信の準備に失敗しました。ページを再読み込みしてください。'));
    return;
  }
  const record = hostRecord(code);
  const name = playerName();
  if (record && findGame(record.gameId)) {
    isHost = true;
    client = new Host({ code, transport, record, pid, name, persist: r => saveHostRecord(code, r) });
    await client.init();
    connStatus = 'connected';
  } else {
    client = new Guest({ transport, pid, name, pass: await passHash(code, playerPass()) });
  }
  client.subscribe(onEvent);
  addEventListener('pagehide', () => client.close());
  setInterval(renderBanner, 2000);
}

function onEvent(msg) {
  if (msg.t === 'room') {
    snapshot = msg;
    rememberRoom(code, msg.room.gameId);
    render();
  } else if (msg.t === 'status') {
    connStatus = msg.status;
    renderBanner();
  } else if (msg.t === 'err') {
    toast(msg.msg);
  }
}

// ---- 描画 ----

function render() {
  const { room } = snapshot;
  const game = findGame(room.gameId);
  $('game-title').textContent = game ? `${game.icon} ${game.name}` : '';
  renderBanner();
  renderPlayers();
  renderHostControls();
  renderChat();
  if (room.status === 'playing' && snapshot.view) renderGame();
  else renderLobby();
}

function renderBanner() {
  const banner = $('banner');
  let text = null;
  if (!isHost && connStatus === 'searching') {
    text = Date.now() - startedAt > 10000
      ? 'ホストが見つかりません。部屋番号が正しいか、ホストが部屋のページを開いているか確認してください。（探し続けています）'
      : 'ホストを探しています…';
  } else if (!isHost && connStatus === 'hostLost') {
    text = 'ホストとの接続が切れました。ホストがページを開き直すと自動で再開します。';
  }
  banner.replaceChildren(text ? h('div', { class: 'banner' }, text) : '');
  if (!snapshot && text) stage.replaceChildren();
}

function renderPlayers() {
  const { room, you } = snapshot;
  $('players').replaceChildren(
    ...room.players.map(p =>
      h('li', {},
        h('span', { class: p.connected ? 'dot' : 'dot off', title: p.connected ? '接続中' : '切断中' }),
        h('span', {}, p.name),
        p.id === room.hostId ? h('span', { class: 'tag' }, 'ホスト') : null,
        p.id === you ? h('span', { class: 'tag' }, 'あなた') : null,
        p.locked ? h('span', { title: '合言葉つきの席' }, '🔒') : null,
        p.connected ? null : h('span', { class: 'small muted' }, '切断中'),
      ),
    ),
  );
  $('spectators').textContent = room.spectators.length ? `観戦: ${room.spectators.join('、')}` : '';
  $('change-name').hidden = isHost;
}

function renderHostControls() {
  const box = $('host-controls');
  if (!isHost) return box.replaceChildren();
  const { room } = snapshot;
  const game = findGame(room.gameId);
  if (room.status === 'lobby') {
    const count = room.players.length;
    const ok = count >= game.minPlayers && count <= game.maxPlayers;
    const select = h('select', { class: 'input', onchange: e => client.setGame(e.target.value), 'aria-label': 'ゲーム' },
      GAMES.map(g => h('option', { value: g.id, selected: g.id === room.gameId }, `${g.icon} ${g.name}`)),
    );
    box.replaceChildren(
      h('div', { class: 'field' }, h('label', {}, 'ゲーム'), select),
      h('button', { class: 'btn primary', type: 'button', disabled: !ok, onclick: () => client.start() }, '▶ ゲーム開始'),
      ok ? null : h('p', { class: 'small muted' }, `${game.minPlayers}〜${game.maxPlayers}人で開始できます（今 ${count}人）`),
    );
  } else {
    box.replaceChildren(
      h('button', {
        class: 'btn small',
        type: 'button',
        onclick: () => {
          if (confirm('ゲームを終了してロビーに戻りますか？')) client.backToLobby();
        },
      }, 'ロビーに戻る'),
    );
  }
}

function renderChat() {
  const log = $('chat-log');
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 30;
  log.replaceChildren(
    ...snapshot.chat.map(c => (c.name === null ? h('div', { class: 'sys' }, c.text) : h('div', {}, h('b', {}, c.name), c.text))),
  );
  if (atBottom) log.scrollTop = log.scrollHeight;
}

$('change-name').addEventListener('click', () => askName(true));

$('chat-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('chat-input');
  if (!client || !input.value.trim()) return;
  client.say(input.value);
  input.value = '';
});

function inviteUrl() {
  const url = new URL(location.href);
  url.hash = code;
  if (!isLocalMode()) url.search = '';
  return url.toString();
}

async function shareInvite() {
  const url = inviteUrl();
  const text = `ボドゲポータルで遊ぼう！ 部屋番号: ${code}`;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'ボドゲポータル', text, url });
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('招待リンクをコピーしました');
  } catch {
    prompt('このリンクを送ってください', url);
  }
}
$('invite').addEventListener('click', shareInvite);

function renderLobby() {
  destroyGameUI();
  const { room } = snapshot;
  const game = findGame(room.gameId);
  const seated = room.players.some(p => p.id === snapshot.you);
  stage.replaceChildren(
    h('div', { class: 'lobby' },
      h('section', { class: 'panel' },
        h('p', { class: 'muted small', style: { textAlign: 'center', margin: 0 } }, '部屋番号'),
        h('div', { class: 'big-code' }, code),
        h('div', { class: 'row', style: { justifyContent: 'center' } },
          h('button', { class: 'btn', type: 'button', onclick: shareInvite }, '🔗 招待リンクを送る'),
        ),
        h('p', { class: 'small muted', style: { textAlign: 'center' } },
          isHost
            ? 'みんながそろったら、右の「ゲーム開始」を押してください。'
            : seated ? 'ホストがゲームを開始するのを待っています…' : '定員に達しているため観戦として参加しています。',
        ),
      ),
      h('section', { class: 'panel stack' },
        h('div', { class: 'row' },
          h('span', { style: { fontSize: '2rem' } }, game.icon),
          h('h2', { style: { margin: 0 } }, game.name),
          h('span', { class: `tag ${game.mode}` }, MODE_LABEL[game.mode]),
          h('span', { class: 'tag' }, `${game.minPlayers}〜${game.maxPlayers}人`),
        ),
        h('p', { style: { margin: 0 } }, game.summary),
        h('ol', { style: { margin: 0, paddingLeft: '1.3em' } }, game.rules.map(r => h('li', {}, r))),
      ),
    ),
  );
}

function renderGame() {
  const { room, view, you } = snapshot;
  const ctx = { you, isHost, players: room.players };
  if (gameUI?.gameId === room.gameId) {
    gameUI.ui.update(view, ctx);
    return;
  }
  if (uiLoading === room.gameId) return;
  destroyGameUI();
  uiLoading = room.gameId;
  const game = findGame(room.gameId);
  game.ui().then(mod => {
    if (uiLoading !== game.id) return;
    uiLoading = null;
    stage.replaceChildren();
    const root = h('div', { class: 'game-root' });
    stage.appendChild(root);
    const ui = mod.createUI(root, {
      send: action => client.act(action),
      toast,
      rules: game.rules,
    });
    gameUI = { gameId: game.id, ui };
    // 読み込み中に届いた最新の状態で描く
    if (snapshot.room.status === 'playing' && snapshot.view) {
      ui.update(snapshot.view, { you: snapshot.you, isHost, players: snapshot.room.players });
    }
  });
}

function destroyGameUI() {
  uiLoading = null;
  if (!gameUI) return;
  gameUI.ui.destroy?.();
  gameUI = null;
}

let toastTimer = null;
function toast(text) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, text);
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}
