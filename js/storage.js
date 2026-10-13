// localStorage の読み書き。プライベートブラウズ等で使えなくても動くように try/catch で包む。
import { randomId } from './util.js';

const PREFIX = 'bgp:';
const HOST_TTL_MS = 3 * 24 * 60 * 60 * 1000; // ホスト情報は3日で破棄

// ?local=1（1台で複数タブを使うテスト用）のときはタブごとに別人になるよう sessionStorage を使う
function store() {
  return new URLSearchParams(location.search).has('local') ? sessionStorage : localStorage;
}

export function load(key, fallback = null) {
  try {
    const raw = store().getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    store().setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できなくてもゲームは続けられる
  }
}

export function remove(key) {
  try {
    store().removeItem(PREFIX + key);
  } catch {
    // 無視
  }
}

// このブラウザのプレイヤーID（再接続で同じ席に戻るために使う）
export function playerId() {
  let id = load('playerId');
  if (!id) {
    id = randomId();
    save('playerId', id);
  }
  return id;
}

export function playerName() {
  return load('name', '');
}

export function setPlayerName(name) {
  save('name', name);
}

// 合言葉（任意）。設定すると、その席には同じ合言葉を知っている人しか入れない
export function playerPass() {
  return load('pass', '');
}

export function setPlayerPass(pass) {
  save('pass', String(pass ?? '').slice(0, PASS_MAX));
}

export const PASS_MAX = 20;
export const NAME_MAX = 12;

export function cleanName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

// ---- ホストとして作った部屋 ----

export function hostRecord(code) {
  return load('host:' + code);
}

export function saveHostRecord(code, record) {
  save('host:' + code, { ...record, updatedAt: Date.now() });
}

export function removeHostRecord(code) {
  remove('host:' + code);
}

// 古いホスト情報を掃除する
export function pruneHostRecords() {
  try {
    const now = Date.now();
    const s = store();
    for (let i = s.length - 1; i >= 0; i--) {
      const key = s.key(i);
      if (!key || !key.startsWith(PREFIX + 'host:')) continue;
      const rec = load(key.slice(PREFIX.length));
      if (!rec || now - (rec.updatedAt ?? 0) > HOST_TTL_MS) s.removeItem(key);
    }
  } catch {
    // 無視
  }
}

// 最近入った部屋（ポータルに表示）
export function recentRooms() {
  return load('recent', []);
}

export function rememberRoom(code, gameId) {
  const list = recentRooms().filter(r => r.code !== code);
  list.unshift({ code, gameId, at: Date.now() });
  save('recent', list.slice(0, 5));
}
