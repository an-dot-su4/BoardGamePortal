// ポータル（トップページ）
import { MAIN_GAMES, MODE_LABEL, TRIAL_GAMES, findGame } from '../games/registry.js';
import { h, normalizeCode, playersLabel, randomCode } from './util.js';
import {
  cleanName, hostRecord, playerName, playerPass, pruneHostRecords, recentRooms, saveHostRecord, setPlayerName, setPlayerPass,
} from './storage.js';

const nameInput = document.getElementById('name');
const codeInput = document.getElementById('code');
const passInput = document.getElementById('pass');
nameInput.value = playerName();
passInput.value = playerPass();
pruneHostRecords();

// ?local=1 などのテスト用パラメータを部屋ページへ引き継ぐ
const passthrough = location.search;

function roomUrl(code) {
  return `room.html${passthrough}#${code}`;
}

function requireName() {
  const name = cleanName(nameInput.value);
  if (!name) {
    nameInput.focus();
    nameInput.reportValidity();
    return null;
  }
  setPlayerName(name);
  setPlayerPass(passInput.value.trim());
  return name;
}

function createRoom(gameId) {
  if (!requireName()) return;
  let code;
  do code = randomCode();
  while (hostRecord(code));
  saveHostRecord(code, { gameId, status: 'lobby', players: [], state: null, chat: [] });
  location.href = roomUrl(code);
}

document.getElementById('join-form').addEventListener('submit', e => {
  e.preventDefault();
  if (!requireName()) return;
  const code = normalizeCode(codeInput.value);
  if (!code) {
    codeInput.setCustomValidity('4文字の部屋番号を入力してください');
    codeInput.reportValidity();
    return;
  }
  location.href = roomUrl(code);
});
codeInput.addEventListener('input', () => {
  codeInput.setCustomValidity('');
  codeInput.value = codeInput.value.toUpperCase();
});

// index.html はメインのゲーム、lab.html（body の data-page="lab"）は試作ゲームを並べる
const isLab = document.body.dataset.page === 'lab';
const games = document.getElementById('games');
const list = isLab ? TRIAL_GAMES : MAIN_GAMES;
for (const game of list) games.appendChild(renderGameCard(game));
if (isLab && !list.length) games.appendChild(h('p', { class: 'muted' }, 'いまは確認待ちの試作ゲームはありません。'));

// メインのページから試作ページへの案内（件数つき）
const labLink = document.getElementById('lab-link');
if (labLink) {
  labLink.href = `lab.html${passthrough}`;
  labLink.textContent = `🧪 試作ゲーム（確認待ち ${TRIAL_GAMES.length}件）`;
}
const homeLink = document.getElementById('home-link');
if (homeLink) homeLink.href = `./${passthrough}`;

function renderGameCard(game) {
  return h('article', { class: 'panel game-card' },
    h('div', { class: 'title' }, h('span', { class: 'icon' }, game.icon), h('h3', {}, game.name)),
    h('div', { class: 'meta' },
      game.trial ? h('span', { class: 'tag trial' }, `🧪 試作 ${game.addedAt ?? ''}`) : null,
      h('span', { class: `tag ${game.mode}` }, MODE_LABEL[game.mode]),
      h('span', { class: 'tag' }, playersLabel(game)),
      h('span', { class: 'tag' }, game.time),
    ),
    h('p', {}, game.summary),
    h('details', { class: 'rules' }, h('summary', {}, 'ルールを見る'), h('ol', {}, game.rules.map(r => h('li', {}, r))), gameLinks(game)),
    gameLinks(game),
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => createRoom(game.id) }, '部屋を作る'),
    ),
  );
}

const recent = recentRooms().filter(r => Date.now() - r.at < 24 * 60 * 60 * 1000);
if (recent.length) {
  document.getElementById('recent-wrap').hidden = false;
  const box = document.getElementById('recent');
  for (const r of recent) {
    const game = findGame(r.gameId);
    box.appendChild(
      h('a', { class: 'btn small', href: roomUrl(r.code) }, `${game?.icon ?? '🎲'} ${r.code}${hostRecord(r.code) ? '（ホスト）' : ''}`),
    );
  }
}

// ゲームの説明に添えるリンク（カード一覧など）。別タブで開く
function gameLinks(game) {
  if (!game.links?.length) return null;
  return h('p', { class: 'small game-links' }, game.links.map(l => h('a', { href: l.href, target: '_blank', rel: 'noopener' }, l.label)));
}
