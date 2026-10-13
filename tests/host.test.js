// ホスト（部屋の進行役）の席の割り当てと合言葉のテスト。通信は偽物を使う
import test from 'node:test';
import assert from 'node:assert/strict';
import { Guest, Host } from '../js/host.js';
import { passHash } from '../js/util.js';

function fakeTransport() {
  const sent = [];
  return {
    sent,
    send(msg, to) {
      sent.push({ msg: structuredClone(msg), to: to ?? null });
    },
    leave() {},
    lastTo(peer, type = 'room') {
      return [...sent].reverse().find(s => s.to === peer && s.msg.t === type)?.msg;
    },
    errorsTo(peer) {
      return sent.filter(s => s.to === peer && s.msg.t === 'err').map(s => s.msg.msg);
    },
  };
}

async function makeHost(gameId = 'arashi') {
  const t = fakeTransport();
  const host = new Host({ code: 'ABCD', transport: t, record: { gameId, status: 'lobby' }, pid: 'host', name: 'ホスト', persist: () => {} });
  await host.init();
  return { host, t };
}

const hello = (host, peer, pid, name, extra = {}) => host.onMessage({ t: 'hello', pid, name, ...extra }, peer);
const seatOf = (host, peer) => host.peers.get(peer)?.pid ?? null;

test('同じIDで入り直すと同じ席に戻る', async () => {
  const { host } = await makeHost();
  hello(host, 'peerA', 'alice', 'あり');
  host.start();
  host.onPeerLeave('peerA');
  hello(host, 'peerA2', 'alice', 'あり');
  assert.equal(seatOf(host, 'peerA2'), 'alice');
});

test('合言葉つきの席は、IDを知っていても合言葉なしでは入れない', async () => {
  const { host, t } = await makeHost();
  const pass = await passHash('ABCD', 'ひみつ');
  hello(host, 'peerA', 'alice', 'あり', { hasPass: true }); // 最初の呼びかけ（合言葉なし）
  hello(host, 'peerA', 'alice', 'あり', { hasPass: true, pass }); // ホストあてに合言葉つきで名乗り直す
  host.start();
  assert.equal(host.players.find(p => p.id === 'alice').pass, pass);

  // 他の人がIDをまねる
  hello(host, 'evil', 'alice', 'あり');
  assert.equal(seatOf(host, 'evil'), null);
  assert.match(t.lastTo('evil', 'err').msg, /合言葉が違う/);
  hello(host, 'evil', 'alice', 'あり', { pass: await passHash('ABCD', 'ちがう') });
  assert.equal(seatOf(host, 'evil'), null);
  assert.equal(seatOf(host, 'peerA'), 'alice', '本人の接続はそのまま');

  // 本人が別の端末（別のID）から、同じ名前と合言葉で戻る
  host.onPeerLeave('peerA');
  hello(host, 'phone', 'alice-phone', 'あり', { hasPass: true });
  assert.equal(seatOf(host, 'phone'), null, '合言葉を送る前はまだ観戦');
  assert.deepEqual(t.errorsTo('phone'), [], '合言葉を送る予定の人にはエラーを出さない');
  hello(host, 'phone', 'alice-phone', 'あり', { hasPass: true, pass });
  assert.equal(seatOf(host, 'phone'), 'alice');
});

test('合言葉なしの席は、これまでどおり同じ名前で引き継げる', async () => {
  const { host } = await makeHost();
  hello(host, 'peerB', 'bob', 'ぼぶ');
  host.start();
  host.onPeerLeave('peerB');
  hello(host, 'pc', 'bob-pc', 'ぼぶ');
  assert.equal(seatOf(host, 'pc'), 'bob');
});

test('合言葉もIDの一覧も、他の参加者には送られない', async () => {
  const { host, t } = await makeHost();
  const pass = await passHash('ABCD', 'ひみつ');
  hello(host, 'peerA', 'alice', 'あり', { hasPass: true, pass });
  hello(host, 'peerB', 'bob', 'ぼぶ');
  const toBob = JSON.stringify(t.lastTo('peerB'));
  assert.ok(!toBob.includes(pass));
  assert.equal(t.lastTo('peerB').room.players.find(p => p.id === 'alice').locked, true);
});

test('参加者は合言葉を全員あての呼びかけには入れない', async () => {
  const t = fakeTransport();
  const pass = await passHash('ABCD', 'ひみつ');
  const g = new Guest({ transport: t, pid: 'alice', name: 'あり', pass });
  try {
    assert.equal(t.sent[0].to, null);
    assert.equal(t.sent[0].msg.pass, undefined);
    assert.equal(t.sent[0].msg.hasPass, true);
    // ホストから状態が届いたら、ホストにだけ合言葉を送る
    t.onMessage({ t: 'room', room: { hostId: 'host' } }, 'hostPeer');
    const last = t.sent[t.sent.length - 1];
    assert.equal(last.to, 'hostPeer');
    assert.equal(last.msg.pass, pass);
  } finally {
    g.close();
  }
});

test('合言葉のハッシュは部屋ごとに違い、空なら null', async () => {
  assert.notEqual(await passHash('ABCD', 'x'), await passHash('EFGH', 'x'));
  assert.equal(await passHash('ABCD', '  '), null);
  assert.equal(await passHash('ABCD', 'ＡＢＣ'), await passHash('ABCD', 'ABC'));
});
