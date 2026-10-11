// ホスト（部屋を作った人のブラウザ）で動く進行役。
// ゲームの正しい状態はここだけが持ち、各プレイヤーには「その人に見せてよい情報（view）」だけを送る。
// 参加者から届くメッセージは信用せず、すべてここで検証する。
import { GameError } from './util.js';
import { cleanName } from './storage.js';
import { findGame } from '../games/registry.js';

const CHAT_KEEP = 40;
const CHAT_MAX = 200;
const ID_MAX = 40;

export class Host {
  // record: 保存済みの部屋 { gameId, status, players, state, chat }
  constructor({ code, transport, record, pid, name, persist }) {
    this.code = code;
    this.transport = transport;
    this.persist = persist;
    this.pid = pid;
    this.gameId = record.gameId;
    this.status = record.status ?? 'lobby';
    // ロビー中に読み込み直したときは、つながっている人が入り直すので自分だけにする
    this.players = this.status === 'lobby' ? [] : (record.players ?? []);
    this.state = record.state ?? null;
    this.chat = record.chat ?? [];
    this.peers = new Map(); // 接続ID -> { pid, name }（観戦者は pid = null）
    this.listeners = new Set();
    this.logic = null;

    // ホスト自身の席
    const me = this.players.find(p => p.id === pid);
    if (me) me.name = name;
    else if (this.status === 'lobby') this.players.unshift({ id: pid, name });

    transport.onPeerJoin = () => {}; // 参加者からの hello を待つ
    transport.onPeerLeave = id => this.onPeerLeave(id);
    transport.onMessage = (msg, from) => this.onMessage(msg, from);
  }

  async init() {
    await this.loadLogic();
    this.broadcast();
  }

  async loadLogic() {
    const game = findGame(this.gameId);
    if (!game) throw new Error('不明なゲームです: ' + this.gameId);
    this.logic = await game.logic();
  }

  get game() {
    return findGame(this.gameId);
  }

  // ---- ホスト自身の画面から呼ぶ操作 ----

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.snapshot(this.pid));
    return () => this.listeners.delete(fn);
  }

  act(action) {
    this.apply(this.pid, action, msg => this.emitError(msg));
  }

  say(text) {
    this.addChat(this.nameOf(this.pid), text);
  }

  rename(name) {
    const me = this.players.find(p => p.id === this.pid);
    if (me) me.name = name;
    this.changed();
  }

  async setGame(gameId) {
    if (this.status !== 'lobby' || !findGame(gameId)) return;
    this.gameId = gameId;
    await this.loadLogic();
    this.changed();
  }

  start() {
    const game = this.game;
    const seated = this.lobbyPlayers();
    if (this.status !== 'lobby') return;
    if (seated.length < game.minPlayers || seated.length > game.maxPlayers) {
      this.emitError(`${game.name} は ${game.minPlayers}〜${game.maxPlayers}人で遊べます`);
      return;
    }
    this.players = seated.map(p => ({ id: p.id, name: p.name }));
    this.state = this.logic.setup(this.players, Math.random);
    this.status = 'playing';
    this.addChat(null, `${game.name} を開始しました`);
  }

  backToLobby() {
    this.status = 'lobby';
    this.state = null;
    this.players = this.lobbyPlayers().map(p => ({ id: p.id, name: p.name }));
    this.addChat(null, 'ロビーに戻りました');
  }

  close() {
    this.transport.leave();
  }

  // ---- 参加者からのメッセージ ----

  onMessage(msg, from) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') return this.onHello(msg, from);
    const peer = this.peers.get(from);
    if (!peer) return;
    if (msg.t === 'act') this.apply(peer.pid, msg.a, err => this.transport.send({ t: 'err', msg: err }, from));
    else if (msg.t === 'chat') this.addChat(peer.name, msg.text);
  }

  onHello(msg, from) {
    const pid = typeof msg.pid === 'string' ? msg.pid.slice(0, ID_MAX) : '';
    const name = cleanName(msg.name) || 'ななし';
    if (!pid || pid === this.pid) return;

    const seat = this.players.find(p => p.id === pid);
    if (seat) {
      // 同じブラウザからの再接続
      seat.name = this.status === 'lobby' ? name : seat.name;
      this.bind(from, seat.id, seat.name);
    } else if (this.status === 'lobby') {
      const max = this.game?.maxPlayers ?? 6;
      if (this.players.length < max) {
        this.players.push({ id: pid, name });
        this.bind(from, pid, name);
      } else {
        this.bind(from, null, name);
      }
    } else {
      // ゲーム中: 同じ名前で切断中の席があれば引き継ぐ（スマホ→PC の乗り換えなど）
      const orphan = this.players.find(p => p.name === name && !this.isConnected(p.id));
      this.bind(from, orphan ? orphan.id : null, orphan ? orphan.name : name);
    }
    this.changed();
  }

  bind(peerId, pid, name) {
    // 同じ席に古い接続が残っていたら外す
    for (const [id, peer] of this.peers) if (pid && peer.pid === pid && id !== peerId) this.peers.delete(id);
    this.peers.set(peerId, { pid, name });
  }

  onPeerLeave(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    this.peers.delete(peerId);
    if (this.status === 'lobby' && peer.pid && !this.isConnected(peer.pid)) {
      this.players = this.players.filter(p => p.id !== peer.pid);
    }
    this.changed();
  }

  isConnected(pid) {
    if (pid === this.pid) return true;
    for (const peer of this.peers.values()) if (peer.pid === pid) return true;
    return false;
  }

  lobbyPlayers() {
    return this.players.filter(p => this.isConnected(p.id));
  }

  nameOf(pid) {
    return this.players.find(p => p.id === pid)?.name ?? '?';
  }

  // ---- ゲームの進行 ----

  apply(pid, action, onError) {
    if (this.status !== 'playing' || !this.state) return;
    if (!pid) return onError('観戦中は操作できません');
    // 失敗しても状態が壊れないよう、コピーに対して実行する
    const next = structuredClone(this.state);
    try {
      this.logic.act(next, pid, action, Math.random);
    } catch (err) {
      if (err instanceof GameError) return onError(err.message);
      console.error(err);
      return onError('エラーが起きました: ' + err.message);
    }
    this.state = next;
    this.changed();
  }

  addChat(name, text) {
    const body = String(text ?? '').trim().slice(0, CHAT_MAX);
    if (!body) return;
    this.chat.push({ name, text: body, at: Date.now() });
    if (this.chat.length > CHAT_KEEP) this.chat.splice(0, this.chat.length - CHAT_KEEP);
    this.changed();
  }

  changed() {
    this.persist({
      gameId: this.gameId,
      status: this.status,
      players: this.players,
      state: this.state,
      chat: this.chat,
    });
    this.broadcast();
  }

  broadcast() {
    for (const [peerId, peer] of this.peers) this.transport.send(this.snapshot(peer.pid), peerId);
    const mine = this.snapshot(this.pid);
    for (const fn of this.listeners) fn(mine);
  }

  snapshot(pid) {
    const spectators = [...this.peers.values()].filter(p => !p.pid).map(p => p.name);
    return {
      t: 'room',
      room: {
        code: this.code,
        gameId: this.gameId,
        status: this.status,
        hostId: this.pid,
        players: (this.status === 'lobby' ? this.lobbyPlayers() : this.players).map(p => ({
          id: p.id,
          name: p.name,
          connected: this.isConnected(p.id),
        })),
        spectators,
      },
      you: pid,
      view: this.status === 'playing' && this.state && this.logic ? this.logic.view(this.state, pid) : null,
      chat: this.chat,
    };
  }

  emitError(msg) {
    for (const fn of this.listeners) fn({ t: 'err', msg });
  }
}

// 参加者側。ホストに hello を送り、届いた状態を画面に渡す。
export class Guest {
  constructor({ transport, pid, name }) {
    this.transport = transport;
    this.pid = pid;
    this.name = name;
    this.hostPeer = null;
    this.hostId = null;
    this.listeners = new Set();
    this.status = 'searching';

    transport.onPeerJoin = id => this.hello(id);
    transport.onPeerLeave = id => {
      if (id !== this.hostPeer) return;
      this.hostPeer = null;
      this.setStatus('hostLost');
    };
    transport.onMessage = (msg, from) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'room') {
        // 最初に見つけたホスト（または同じホストの再接続）だけを信じる
        const hostId = msg.room?.hostId;
        if (this.hostPeer && this.hostPeer !== from && hostId !== this.hostId) return;
        this.hostId = hostId;
        if (this.hostPeer !== from) {
          this.hostPeer = from;
          this.setStatus('connected');
        }
        this.emit(msg);
      } else if (msg.t === 'err' && from === this.hostPeer) {
        this.emit({ t: 'err', msg: String(msg.msg) });
      }
    };
    // ホストが見つかるまで定期的に呼びかける
    this.timer = setInterval(() => {
      if (!this.hostPeer) this.hello();
    }, 3000);
    this.hello();
  }

  hello(to) {
    this.transport.send({ t: 'hello', pid: this.pid, name: this.name }, to);
  }

  setStatus(status) {
    this.status = status;
    this.emit({ t: 'status', status });
  }

  emit(msg) {
    for (const fn of this.listeners) fn(msg);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn({ t: 'status', status: this.status });
    return () => this.listeners.delete(fn);
  }

  act(action) {
    if (this.hostPeer) this.transport.send({ t: 'act', a: action }, this.hostPeer);
  }

  say(text) {
    if (this.hostPeer) this.transport.send({ t: 'chat', text }, this.hostPeer);
  }

  rename(name) {
    this.name = name;
    this.hello(this.hostPeer ?? undefined);
  }

  close() {
    clearInterval(this.timer);
    this.transport.leave();
  }
}
