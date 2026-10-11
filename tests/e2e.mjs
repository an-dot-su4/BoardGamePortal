// ブラウザでの通し確認（1台で5人分のタブを開いて遊ぶ）
//   npm run e2e            … 結果を表示
//   SHOTS=dir npm run e2e  … スクリーンショットも保存
// ?local=1 モード（BroadcastChannel）を使うので、インターネット接続は不要。
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 8137;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn('npx', ['--yes', 'http-server', '-p', String(PORT), '-c-1', '-s', '.'], { stdio: 'ignore' });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('サーバーが起動しません');
}

try {
  await waitForServer();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const watch = (page, who) => {
    page.on('pageerror', e => errors.push(`${who}: ${e.message}`));
    page.on('console', m => m.type() === 'error' && errors.push(`${who}: ${m.text()}`));
  };

  // ホストが部屋を作る
  const host = await context.newPage();
  watch(host, 'host');
  await host.goto(`${BASE}/?local=1`);
  await shot(host, '01-portal');
  await host.fill('#name', 'ホスト');
  await host.locator('.game-card', { hasText: '大富豪' }).getByRole('button', { name: '部屋を作る' }).click();
  await host.waitForURL(/room\.html/);
  const code = new URL(host.url()).hash.slice(1);
  assert.match(code, /^[A-Z0-9]{4}$/);
  console.log('部屋番号:', code);

  // 4人が参加
  const guests = [];
  for (const name of ['あお', 'みどり', 'きいろ', 'しろ']) {
    const page = await context.newPage();
    watch(page, name);
    await page.goto(`${BASE}/room.html?local=1#${code}`);
    await page.fill('input[placeholder="例: たろう"]', name);
    await page.getByRole('button', { name: '参加する' }).click();
    guests.push(page);
  }
  const all = [host, ...guests];
  await host.waitForFunction(() => document.querySelectorAll('#players li').length === 5);
  await guests[3].waitForFunction(() => document.querySelectorAll('#players li').length === 5);
  await shot(host, '02-lobby-host');
  await shot(guests[0], '03-lobby-guest');

  // チャット
  await guests[0].fill('#chat-input', 'よろしく！');
  await guests[0].press('#chat-input', 'Enter');
  await host.waitForSelector('#chat-log :text("よろしく！")');

  // 大富豪を開始
  await host.getByRole('button', { name: '▶ ゲーム開始' }).click();
  for (const p of all) await p.waitForSelector('.pcard');
  const handSizes = await Promise.all(all.map(p => p.locator('.hand').last().locator('.pcard').count()));
  assert.equal(handSizes.reduce((a, b) => a + b, 0), 53, '配られたカードの合計が53枚');

  // 手番の人が「出せる1枚」か「パス」を選ぶのを繰り返す
  async function daifugoMove() {
    for (const p of all) {
      if (!(await p.locator('text=あなたの番です').count())) continue;
      const cards = p.locator('.hand').last().locator('.pcard');
      const n = await cards.count();
      for (let i = 0; i < n; i++) {
        await cards.nth(i).click();
        if (await p.getByRole('button', { name: '出す' }).isEnabled()) {
          await p.getByRole('button', { name: '出す' }).click();
          return true;
        }
        await cards.nth(i).click();
      }
      await p.getByRole('button', { name: 'パス' }).click();
      return true;
    }
    return false;
  }
  let moves = 0;
  for (let i = 0; i < 30; i++) {
    if (await daifugoMove()) moves++;
    await host.waitForTimeout(80);
  }
  assert.ok(moves >= 20, `大富豪が進まない (${moves}手)`);
  await shot(host, '04-daifugo-host');
  await shot(guests[1], '05-daifugo-guest');

  // ホストがページを読み込み直しても続きから再開できる
  const logBefore = await host.locator('.log').innerText();
  await host.reload();
  await host.waitForSelector('.pcard');
  for (const g of guests) await g.waitForFunction(() => !document.querySelector('.banner'));
  assert.equal(await host.locator('.log').innerText(), logBefore, '再開後の状態が一致');
  for (let i = 0; i < 5; i++) await daifugoMove();

  // ロビーに戻って嵐の航海へ
  host.once('dialog', d => d.accept());
  await host.getByRole('button', { name: 'ロビーに戻る' }).click();
  await host.selectOption('#host-controls select', 'arashi');
  await guests[0].waitForSelector('h2:text("嵐の航海")');
  await host.getByRole('button', { name: '▶ ゲーム開始' }).click();
  for (const p of all) await p.waitForSelector('.acard');
  await shot(guests[2], '06-arashi-start');

  for (let leg = 1; leg <= 2; leg++) {
    for (const [i, p] of all.entries()) {
      if (i % 2 === 0) {
        await p.locator('.hand .acard').first().click();
        await p.getByRole('button', { name: /伏せて出す/ }).click();
      } else {
        await p.getByRole('button', { name: '今回は出さない' }).click();
      }
      if (i === 0) await p.getByRole('button', { name: '🙆 任せて' }).click();
    }
    await host.waitForSelector(`text=前回の結果（難所 ${leg}）`);
  }
  await shot(guests[2], '07-arashi-result');
  await guests[3].setViewportSize({ width: 390, height: 844 });
  await shot(guests[3], '08-arashi-mobile');

  // 観戦者（6人目は満員ではないが、ゲーム中に来た知らない人は観戦）
  const late = await context.newPage();
  watch(late, '観戦者');
  await late.goto(`${BASE}/room.html?local=1#${code}`);
  await late.fill('input[placeholder="例: たろう"]', 'おそば');
  await late.getByRole('button', { name: '参加する' }).click();
  await late.waitForSelector('text=観戦中です');

  assert.deepEqual(errors, [], 'ブラウザでエラーが出た');
  console.log('✅ e2e OK');
} finally {
  await browser.close();
  server.kill();
}
