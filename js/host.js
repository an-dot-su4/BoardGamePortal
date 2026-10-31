// ホスト（部屋を作った人のブラウザ）で動く進行役。
// ゲームの正しい状態はここだけが持ち、各プレイヤーには「その人に見せてよい情報（view）」だけを送る。
// 参加者から届くメッセージは信用せず、すべてここで検証する。
import { GameError } from './util.js';
import { cleanName, gameOptions, saveGameOptions } from './storage.js';
import { findGame } from '../games/registry.js';

const CHAT_KEEP = 40;
const CHAT_MAX = 200;
const ID_MAX = 40;
const BOT_DELAY_MS = 700; // CPU が考えているように見える待ち時間
const BOT_NAMES = ['CPU 松', 'CPU 竹', 'CPU 梅', 'CPU 鶴', 'CPU 亀'];

export class Host {
  // record: 保存済みの部屋 { gameId, status, players, state, chat }
  constructor({ code, transport, record, pid, name, persist }) {
    this.code = code;
    this.transport = transport;
    this.persist = persist;
    this.pid = pid;
    this.gameId = record.gameId;
    this.status = record.status ?? 'lobby';
    // ロビー中に読み込み直したときは、つながっている人が入り直すので自分（と CPU）だけにする
    this.players = this.status === 'lobby' ? (record.players ?? []).filter(p => p.bot) : (record.players ?? []);
    this.state = record.state ?? null;
    this.chat = record.chat ?? [];
    this.options = record.options ?? null; // ゲームごとの設定（BAN・使う時代など）。null なら loadLogic で読み込む
    this.botTimer = null;
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
    this.scheduleBots();
  }

  async loadLogic() {
    const game = findGame(this.gameId);
    if (!game) throw new Error('不明なゲームです: ' + this.gameId);
    this.logic = await game.logic();
    if (!this.options) this.options = this.logic.normalizeOptions?.(gameOptions(this.gameId)) ?? null;
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
    if (!this.chatAllowed(this.pid)) return this.emitError('今はチャットできません');
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
    this.options = null;
    await this.loadLogic();
    // CPU に対応していないゲームなら CPU は外す
    if (!this.logic.bot) this.players = this.players.filter(p => !p.bot);
    this.changed();
  }

  // ゲームの設定（ホストだけが変えられる）。ブラウザにも保存して次回の部屋でも使う
  setOptions(options) {
    if (this.status !== 'lobby' || !this.logic?.normalizeOptions) return;
    this.options = this.logic.normalizeOptions(options);
    saveGameOptions(this.gameId, this.options);
    this.changed();
  }

  addBot() {
    if (this.status !== 'lobby' || !this.logic?.bot) return;
    if (this.players.length >= (this.game?.maxPlayers ?? 6)) return this.emitError('これ以上は入れません');
    const used = new Set(this.players.map(p => p.name));
    const name = BOT_NAMES.find(n => !used.has(n)) ?? `CPU ${this.players.length + 1}`;
    this.players.push({ id: 'bot-' + Math.random().toString(36).slice(2, 10), name, bot: true });
    this.changed();
  }

  removeBot(id) {
    if (this.status !== 'lobby') return;
    this.players = this.players.filter(p => !(p.bot && p.id === id));
    this.changed();
  }

  optionsError(count) {
    return this.logic?.validateOptions?.(this.options, count) ?? null;
  }

  start() {
    const game = this.game;
    const seated = this.lobbyPlayers();
    if (this.status !== 'lobby') return;
    if (seated.length < game.minPlayers || seated.length > game.maxPlayers) {
      this.emitError(`${game.name} は ${game.minPlayers}〜${game.maxPlayers}人で遊べます`);
      return;
    }
    const problem = this.optionsError(seated.length);
    if (problem) return this.emitError(problem);
    this.players = seated.map(p => ({ id: p.id, name: p.name, pass: p.pass ?? null, bot: !!p.bot }));
    this.state = this.logic.setup(this.players.map(p => ({ id: p.id, name: p.name, bot: !!p.bot })), Math.random, this.options ?? undefined);
    this.status = 'playing';
    this.addChat(null, `${game.name} を開始しました`);
  }

  backToLobby() {
    this.status = 'lobby';
    this.state = null;
    this.players = this.lobbyPlayers().map(p => ({ id: p.id, name: p.name, pass: p.pass ?? null, bot: !!p.bot }));
    this.addChat(null, 'ロビーに戻りました');
  }

  close() {
    clearTimeout(this.botTimer);
    this.transport.leave();
  }

  // ---- CPU ----

  // CPU が操作できる場面なら、少し待ってから1手だけ進める（進めた結果また呼ばれる）
  scheduleBots() {
    if (this.botTimer || this.status !== 'playing' || !this.state || !this.logic?.bot) return;
    const bots = this.players.filter(p => p.bot);
    if (!bots.length) return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (this.status !== 'playing' || !this.state) return;
      for (const b of bots) {
        let action = null;
        try {
          action = this.logic.bot(this.state, b.id, Math.random);
        } catch (err) {
          console.error(err);
        }
        if (action) {
          this.apply(b.id, action, msg => console.warn('CPU の操作が拒否されました', msg, action));
          return;
        }
      }
    }, BOT_DELAY_MS);
  }

  // ---- 参加者からのメッセージ ----

  onMessage(msg, from) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') return this.onHello(msg, from);
    const peer = this.peers.get(from);
    if (!peer) return;
    if (msg.t === 'act') this.apply(peer.pid, msg.a, err => this.transport.send({ t: 'err', msg: err }, from));
    else if (msg.t === 'chat') {
      if (this.chatAllowed(peer.pid)) this.addChat(peer.name, msg.text);
      else this.transport.send({ t: 'err', msg: '今はチャットできません' }, from);
    }
  }

  // ゲームが canChat を定義していれば従う（人狼で脱落した人の発言を止める など）
  chatAllowed(pid) {
    if (this.status !== 'playing' || !this.state || !this.logic?.canChat || !pid) return true;
    return this.logic.canChat(this.state, pid);
  }

  onHello(msg, from) {
    const pid = typeof msg.pid === 'string' ? msg.pid.slice(0, ID_MAX) : '';
    const name = cleanName(msg.name) || 'ななし';
    if (!pid || pid === this.pid) return;
    // 合言葉のハッシュ（任意）。参加者はホストを見つけてから、ホストにだけこれを送る
    const pass = typeof msg.pass === 'string' && /^[0-9a-f]{64}$/.test(msg.pass) ? msg.pass : null;
    const unlocks = seat => !seat.pass || seat.pass === pass;
    let denied = false;

    const seat = this.players.find(p => p.id === pid);
    if (seat) {
      // 同じブラウザからの再接続（合言葉つきの席は合言葉も一致したときだけ）
      if (!seat.pass && pass && this.peers.get(from)?.pid === seat.id) {
        // 合言葉なしで座った本人が、続けて合言葉を送ってきた → 席に合言葉をつける
        seat.pass = pass;
      }
      if (unlocks(seat)) {
        if (this.status === 'lobby') seat.name = name;
        this.bind(from, seat.id, seat.name);
      } else {
        denied = true;
        this.bind(from, null, name);
      }
    } else if (this.status === 'lobby') {
      const max = this.game?.maxPlayers ?? 6;
      if (this.players.length < max) {
        this.players.push({ id: pid, name, pass });
        this.bind(from, pid, name);
      } else {
        this.bind(from, null, name);
      }
    } else {
      // ゲーム中: 同じ名前で切断中の席があれば引き継ぐ（スマホ→PC の乗り換えなど）
      const sameName = this.players.filter(p => p.name === name && !this.isConnected(p.id));
      const orphan = sameName.find(unlocks);
      if (!orphan && sameName.length) denied = true;
      this.bind(from, orphan ? orphan.id : null, orphan ? orphan.name : name);
    }
    // 合言葉をこれから送ってくる参加者（hasPass で pass なし）には、まだエラーを出さない
    if (denied && !(msg.hasPass && !pass)) {
      this.transport.send({ t: 'err', msg: '合言葉が違うため、観戦として参加しました。合言葉を確かめて入り直してください' }, from);
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
    if (this.players.some(p => p.id === pid && p.bot)) return true;
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
      options: this.options,
    });
    this.broadcast();
    this.scheduleBots();
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
          locked: !!p.pass, // 合言葉そのものは送らない
          bot: !!p.bot,
        })),
        spectators,
        options: this.options,
        optionsError: this.status === 'lobby' ? this.optionsError(this.lobbyPlayers().length) : null,
        canBot: !!this.logic?.bot,
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
  constructor({ transport, pid, name, pass = null }) {
    this.transport = transport;
    this.pid = pid;
    this.name = name;
    this.pass = pass; // 合言葉のハッシュ。ホストにだけ送る
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
          // ホストがわかったので、合言葉つきで名乗り直す
          if (this.pass) this.hello(from);
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
    const msg = { t: 'hello', pid: this.pid, name: this.name, hasPass: !!this.pass };
    // 合言葉は全員に届く呼びかけには入れず、ホストあてのときだけ入れる
    if (this.pass && to && to === this.hostPeer) msg.pass = this.pass;
    this.transport.send(msg, to);
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
