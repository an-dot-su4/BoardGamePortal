// 通信の土台。ゲーム側はこのインターフェースだけを使う:
//   transport.selfId            自分の接続ID
//   transport.send(msg, to?)    to を省略すると全員へ
//   transport.onMessage = (msg, fromId) => {}
//   transport.onPeerJoin = id => {}
//   transport.onPeerLeave = id => {}
//   transport.leave()
//
// 本番: Trystero（WebRTC で直接つながる。相手探しには公開 Nostr リレーを使う）
// テスト: ?local=1 を付けると同じブラウザのタブ同士で BroadcastChannel を使ってつながる
import { randomId } from './util.js';

const APP_ID = 'boardgameportal-an-dot-su4-v1';

export function isLocalMode() {
  return new URLSearchParams(location.search).has('local');
}

export async function connect(code) {
  return isLocalMode() ? localTransport(code) : trysteroTransport(code);
}

async function trysteroTransport(code) {
  const { joinRoom, selfId } = await import('../vendor/trystero.js');
  const room = joinRoom({ appId: APP_ID }, 'room-' + code);
  const action = room.makeAction('m');
  const t = {
    kind: 'p2p',
    selfId,
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    send(msg, to) {
      action.send(msg, to ? { target: to } : undefined).catch(() => {});
    },
    leave() {
      room.leave();
    },
  };
  action.onMessage = (msg, ctx) => t.onMessage?.(msg, ctx.peerId);
  room.onPeerJoin = id => t.onPeerJoin?.(id);
  room.onPeerLeave = id => t.onPeerLeave?.(id);
  return t;
}

function localTransport(code) {
  const channel = new BroadcastChannel('bgp-local-' + code);
  const selfId = randomId();
  const peers = new Set();
  let closed = false;
  const t = {
    kind: 'local',
    selfId,
    onMessage: null,
    onPeerJoin: null,
    onPeerLeave: null,
    send(msg, to) {
      if (!closed) channel.postMessage({ kind: 'msg', from: selfId, to: to ?? null, msg });
    },
    leave() {
      if (closed) return;
      closed = true;
      channel.postMessage({ kind: 'leave', from: selfId });
      channel.close();
    },
  };
  const join = id => {
    if (peers.has(id)) return;
    peers.add(id);
    t.onPeerJoin?.(id);
  };
  channel.onmessage = ({ data }) => {
    if (!data || data.from === selfId) return;
    if (data.kind === 'hello') {
      channel.postMessage({ kind: 'here', from: selfId, to: data.from });
      join(data.from);
    } else if (data.kind === 'here' && data.to === selfId) {
      join(data.from);
    } else if (data.kind === 'leave') {
      if (peers.delete(data.from)) t.onPeerLeave?.(data.from);
    } else if (data.kind === 'msg' && (data.to === null || data.to === selfId)) {
      join(data.from);
      t.onMessage?.(structuredClone(data.msg), data.from);
    }
  };
  addEventListener('pagehide', () => t.leave());
  // ハンドラ設定後に存在を知らせる
  setTimeout(() => channel.postMessage({ kind: 'hello', from: selfId }), 0);
  return t;
}
