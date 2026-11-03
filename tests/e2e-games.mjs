// 追加ゲームのブラウザ通し確認（?local=1 で複数タブ）
//   node tests/e2e-games.mjs [ゲームID...]   … 省略すると全部
//   SHOTS=dir で各ゲームのスクリーンショットを保存、MOBILE=1 でスマホ幅（390px）、LANDSCAPE=1 でスマホの横画面（844×390）
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const PORT = 8138;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const server = spawn('npx', ['--yes', 'http-server', '-p', String(PORT), '-c-1', '-s', '.'], { stdio: 'ignore' });
// この開発環境では Playwright 同梱版と違う Chromium が入っていることがあるので、あればそれを使う
// （通常の Chrome は操作の待ちが長く20倍以上遅いので、ヘッドレス版を優先する）
function localChromium() {
  const root = '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const shell = readdirSync(root).find(d => d.startsWith('chromium_headless_shell-'));
  const path = shell && `${root}/${shell}/chrome-headless-shell-linux64/chrome-headless-shell`;
  if (path && existsSync(path)) return path;
  return existsSync(`${root}/chromium`) ? `${root}/chromium` : undefined;
}
const executablePath = process.env.CHROMIUM_PATH ?? localChromium();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
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

// gameName のゲームで部屋を作り、names の人数でゲーム開始まで進める
const VIEWPORT = process.env.LANDSCAPE ? { width: 844, height: 390 } : process.env.MOBILE ? { width: 390, height: 844 } : { width: 1100, height: 900 };

async function openGame(gameName, names, viewport = VIEWPORT, beforeStart = null) {
  const touch = process.env.MOBILE || process.env.LANDSCAPE ? { hasTouch: true, isMobile: true } : {};
  const context = await browser.newContext({ viewport, ...touch });
  const pages = [];
  for (const name of names) {
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${gameName}/${name}: ${e.message}`));
    page.on('console', m => m.type() === 'error' && errors.push(`${gameName}/${name}: ${m.text()}`));
    page.on('dialog', d => d.accept());
    pages.push(page);
  }
  const [host, ...guests] = pages;
  await host.goto(`${BASE}/?local=1`);
  await host.fill('#name', names[0]);
  await host.locator('.game-card').filter({ has: host.locator('h3', { hasText: new RegExp(`^${gameName}$`) }) })
    .getByRole('button', { name: '部屋を作る' }).click();
  await host.waitForURL(/room\.html/);
  const code = new URL(host.url()).hash.slice(1);
  for (const [i, page] of guests.entries()) {
    await page.goto(`${BASE}/room.html?local=1#${code}`);
    await page.fill('input[placeholder="例: たろう"]', names[i + 1]);
    await page.getByRole('button', { name: '参加する' }).click();
  }
  await host.waitForFunction(n => document.querySelectorAll('#players li').length === n, names.length);
  if (beforeStart) await beforeStart(host, guests);
  await host.getByRole('button', { name: '▶ ゲーム開始' }).click();
  for (const p of pages) await p.waitForSelector('.game-root .table');
  return { pages, context };
}

const pause = (page, ms = 120) => page.waitForTimeout(ms);
const has = async (page, selector) => (await page.locator(selector).count()) > 0;

const scenarios = {
  async tenka() {
    let banned = null;
    const { pages } = await openGame('天下札', ['あき', 'はる'], VIEWPORT, async (host, [guest]) => {
      await host.getByRole('button', { name: '🤖 CPUを追加' }).click();
      await host.waitForSelector('#players li:has-text("CPU")');
      // 既定は平安＋鎌倉のおすすめセット。TENKA_ERAS="江戸" TENKA_PRESET=edo-chounin のように変えられる
      const eras = (process.env.TENKA_ERAS ?? '鎌倉').split(',');
      const preset = process.env.TENKA_PRESET ?? 'kamakura-houkou';
      for (const era of eras) await host.locator('label.tk-set-check', { hasText: era }).locator('input').check();
      await host.locator(`select:has(option[value="${preset}"])`).selectOption(preset);
      await guest.waitForSelector(`select:has(option[value="${preset}"]:checked)`);
      await host.locator('details.tk-ban summary').click();
      // おすすめセットに入っている検非違使を BAN する（代わりが入るはず）
      await host.locator('.tk-ban-grid [data-card="kebiishi"]').click();
      await host.waitForSelector('.tk-ban-grid [data-card="kebiishi"].tk-dim');
      banned = 'kebiishi';
      await guest.waitForSelector('.tk-ban-grid [data-card="kebiishi"]');
      await shot(host, 'tenka-0-lobby');
    });
    for (const p of pages) await p.waitForSelector('.tk-supply');
    for (const p of pages) assert.equal(await p.locator(`.tk-supply [data-card="${banned}"]`).count(), 0, 'BAN した札が出た');
    assert.equal(await pages[0].locator('.tk-supply .tk-row').first().locator('.tk-card').count(), 10);

    // 人間2人は「お金だけ」で遊ぶ。CPU の手番は自動で進む
    let humanTurns = 0;
    for (let i = 0; i < 120 && humanTurns < 8; i++) {
      for (const p of pages) {
        if (await has(p, '.tk-prompt')) {
          if (await has(p, '.tk-prompt button:text("決定")')) {
            const btn = p.locator('.tk-prompt button:text("決定")');
            const cards = p.locator('.tk-hand button.tk-card');
            for (let k = 0; k < (await cards.count()) && (await btn.isDisabled()); k++) await cards.nth(k).click();
            await btn.click();
          } else await p.locator('.tk-prompt button').first().click();
          continue;
        }
        if (!(await has(p, 'text=あなたの手番'))) continue;
        if (await has(p, 'button:text("💰 財宝をすべて出す")')) await p.getByRole('button', { name: '💰 財宝をすべて出す' }).click();
        if (await has(p, 'button:has-text("蓄えを使う")')) await p.locator('button:has-text("蓄えを使う")').click();
        const affordable = p.locator('.tk-supply .tk-selected');
        if ((await affordable.count()) > 0) {
          await affordable.last().click();
          if (humanTurns === 1) await shot(p, 'tenka-2-zoom');
          await p.locator('.tk-zoom button:has-text("文で購入")').click();
        }
        if (humanTurns === 2) await shot(p, 'tenka-1-game');
        if (await has(p, 'button:text("購入フェーズへ")')) {
          await p.getByRole('button', { name: '購入フェーズへ' }).click();
          await p.waitForSelector('button:text("手番を終える")');
        }
        await p.getByRole('button', { name: '手番を終える' }).click();
        await p.waitForSelector('button:text("手番を終える")', { state: 'detached' });
        humanTurns++;
      }
      await pause(pages[0], 150);
    }
    assert.ok(humanTurns >= 8, `手番が回らない (${humanTurns})`);
    const log = await pages[0].locator('.log').innerText();
    assert.match(log, /CPU/, 'CPU が手番を進めていない');
  },

  async wordwolf() {
    const { pages } = await openGame('ワード人狼', ['あ', 'い', 'う', 'え']);
    const words = await Promise.all(pages.map(p => p.locator('.big-word').innerText()));
    assert.equal(new Set(words).size, 2, 'お題は2種類');
    await shot(pages[0], 'wordwolf-1-talk');
    for (const p of pages.slice(0, 3)) await p.getByRole('button', { name: '🙋 投票に進みたい' }).click();
    for (const p of pages) await p.waitForSelector('text=人狼だと思う人に投票');
    // 全員が少数派のお題を持つ人に投票する
    const minority = words.find(w => words.filter(x => x === w).length === 1);
    const wolfIndex = words.indexOf(minority);
    const wolfName = ['あ', 'い', 'う', 'え'][wolfIndex];
    for (const [i, p] of pages.entries()) {
      const target = i === wolfIndex ? ['あ', 'い', 'う', 'え'][(i + 1) % 4] : wolfName;
      await p.locator('.game-actions').getByRole('button', { name: target, exact: true }).click();
    }
    const wolf = pages[wolfIndex];
    await wolf.waitForSelector('input[placeholder="多数派のお題は？"]');
    await shot(wolf, 'wordwolf-2-guess');
    await wolf.fill('input[placeholder="多数派のお題は？"]', words.find(w => w !== minority));
    await wolf.getByRole('button', { name: '答える' }).click();
    await pages[0].waitForSelector('text=人狼の勝利');
    await shot(pages[0], 'wordwolf-3-result');
    await pages[1].getByRole('button', { name: '次のお題へ' }).click();
    await pages[2].waitForSelector('text=第2回戦');
  },

  async jinro() {
    const names = ['A', 'B', 'C', 'D', 'E'];
    const { pages } = await openGame('人狼', names);
    await shot(pages[0], 'jinro-1-night');
    // 夜はチャット不可
    await pages[1].fill('#chat-input', 'こんばんは');
    await pages[1].press('#chat-input', 'Enter');
    await pages[1].waitForSelector('.toast:text("今はチャットできません")');
    let rounds = 0;
    while (rounds++ < 20) {
      const phase = await pages[0].locator('.table strong').first().innerText();
      if (phase.includes('決着')) break;
      for (const p of pages) {
        if (await has(p, 'button:text("😴 眠る")')) await p.getByRole('button', { name: '😴 眠る' }).click();
        else if (await has(p, 'button:text("決定")')) {
          await p.locator('.game-actions').first().locator('button').first().click();
          await p.getByRole('button', { name: '決定' }).click();
        } else if (await has(p, 'button:text("🙋 投票に進みたい")')) await p.getByRole('button', { name: '🙋 投票に進みたい' }).click();
        else if (await has(p, 'text=処刑する人を投票で')) {
          const buttons = p.locator('.game-actions').first().locator('button');
          if (await buttons.count()) await buttons.first().click();
        }
        await pause(p, 60);
      }
      if (rounds === 2) await shot(pages[0], 'jinro-2-day');
    }
    await pages[0].waitForSelector('text=もう一度（役職を配り直す）', { timeout: 10000 });
    await shot(pages[0], 'jinro-3-over');
    await pages[0].getByRole('button', { name: 'もう一度（役職を配り直す）' }).click();
    await pages[3].waitForSelector('text=1日目の夜');
  },

  async hoshi() {
    const { pages } = await openGame('ほしならべ', ['ほし', 'つき', 'そら']);
    for (let level = 1; level <= 2; level++) {
      for (const p of pages) await p.getByRole('button', { name: /集中（準備OK）/ }).click();
      await pages[0].waitForSelector('button.star-play');
      // いちばん小さい星を持つ人から順に出す
      for (let k = 0; k < 3 * level; k++) {
        const values = await Promise.all(pages.map(async p => {
          const t = await p.locator('button.star-play').innerText();
          const m = t.match(/(\d+)/);
          return m ? Number(m[1]) : Infinity;
        }));
        const min = Math.min(...values);
        await pages[values.indexOf(min)].locator('button.star-play').click();
        await pause(pages[0], 150);
      }
      await pages[0].waitForSelector(`text=レベル ${level + 1} / `);
    }
    await shot(pages[1], 'hoshi-1-level3');
    // わざと大きい星から出して失敗させる
    for (const p of pages) await p.getByRole('button', { name: /集中（準備OK）/ }).click();
    await pages[0].waitForSelector('button.star-play');
    const values = await Promise.all(pages.map(async p => Number((await p.locator('button.star-play').innerText()).match(/(\d+)/)[1])));
    await pages[values.indexOf(Math.max(...values))].locator('button.star-play').click();
    await pages[2].waitForSelector('text=より小さい星がありました');
    await shot(pages[2], 'hoshi-2-miss');
  },

  async sugoroku() {
    const { pages } = await openGame('わいわいすごろく', ['いぬ', 'ねこ', 'とり']);
    for (let i = 0; i < 24; i++) {
      for (const p of pages) {
        if (await has(p, 'button:text("このまま進む")')) await p.getByRole('button', { name: 'このまま進む' }).click();
        else if (await has(p, 'button:text("🎲 サイコロを振る")')) await p.getByRole('button', { name: '🎲 サイコロを振る' }).click();
        else continue;
        await pause(p, 80);
        break;
      }
      if (await has(pages[0], 'text=さんの優勝')) break;
    }
    await shot(pages[0], 'sugoroku-1-board');
    const positions = await pages[0].locator('.seat .small').allInnerTexts();
    assert.ok(positions.some(t => !t.startsWith('0マス目')), '誰も進んでいない');
  },

  async glico() {
    // 人2人で、ゴールを50マスにして最後まで（演出つき）
    const { pages } = await openGame('疾走グリコ', ['あお', 'あか'], VIEWPORT, async host => {
      await host.locator('select:has(option[value="50"])').selectOption('50');
    });
    const hands = ['グー', 'チョキ', 'パー'];
    let shotDone = false;
    for (let i = 0; i < 80 && !(await has(pages[0], 'text=の勝ち！')); i++) {
      for (const [k, p] of pages.entries()) {
        await p.waitForSelector('.gl-hand-btn:not([disabled])', { timeout: 15000 }).catch(() => {});
        if (await has(p, 'text=の勝ち！')) break;
        await p.locator('.gl-hand-btn', { hasText: hands[(i + k * (i % 2 ? 1 : 2)) % 3] }).click();
      }
      if (!shotDone) {
        await pages[0].waitForSelector('.gl-die', { timeout: 5000 }).catch(() => {});
        await shot(pages[0], 'glico-1-roll');
        shotDone = true;
      }
    }
    await pages[0].waitForSelector('text=の勝ち！', { timeout: 20000 });
    await shot(pages[0], 'glico-2-goal');
    await pages[0].getByRole('button', { name: '❓ ヘルプ' }).click();
    await shot(pages[0], 'glico-3-help');
    await pages[0].getByRole('button', { name: '閉じる' }).click();
    const left = await pages[1].locator('.gl-left').allInnerTexts();
    assert.ok(left.some(t => t.includes('ゴール')), 'ゴールした人がいない');
  },

  async glicoCpu() {
    // 人1人＋強いCPU（ロビーで強さを選ぶ）で、50マスを最後まで
    const { pages } = await openGame('疾走グリコ', ['ひと'], VIEWPORT, async host => {
      await host.locator('select:has(option[value="50"])').selectOption('50');
      await host.locator('select:has(option[value="strong"])').selectOption('strong');
      await host.getByRole('button', { name: '🤖 CPUを追加' }).click();
      await host.waitForSelector('#players li:has-text("CPU")');
      await shot(host, 'glico-0-lobby');
    });
    const [p] = pages;
    const hands = ['グー', 'チョキ', 'パー'];
    for (let i = 0; i < 80 && !(await has(p, 'text=の勝ち！')); i++) {
      await p.waitForSelector('.gl-hand-btn:not([disabled])', { timeout: 15000 }).catch(() => {});
      if (await has(p, 'text=の勝ち！')) break;
      await p.locator('.gl-hand-btn', { hasText: hands[i % 3] }).click();
      await pause(p, 200);
    }
    await p.waitForSelector('text=の勝ち！', { timeout: 20000 });
  },

  async oekaki() {
    const names = ['え', 'が', 'く'];
    const { pages } = await openGame('お絵描き伝言', names);
    // お題
    for (const [i, p] of pages.entries()) {
      await p.fill('input[placeholder="例: 空を飛ぶ犬"]', ['りんごを食べる猫', '走る山', '笑う雲'][i]);
      await p.getByRole('button', { name: '提出' }).click();
    }
    // 絵（ゆっくり描いて、描いている途中に他の人の提出が来ても消えないことを確認）
    for (const [i, p] of pages.entries()) {
      await p.waitForSelector('canvas.ok-canvas');
      const box = await p.locator('canvas.ok-canvas').boundingBox();
      await p.mouse.move(box.x + 30, box.y + 30);
      await p.mouse.down();
      for (let k = 1; k <= 10; k++) await p.mouse.move(box.x + 30 + k * 15, box.y + 30 + k * (i + 3) * 2);
      await p.mouse.up();
      if (i === 0) await shot(p, 'oekaki-1-draw');
    }
    for (const p of pages) await p.getByRole('button', { name: '🎨 この絵で提出' }).click();
    // 当てる
    for (const p of pages) {
      await p.waitForSelector('input[placeholder="これは何の絵？"]');
      await p.fill('input[placeholder="これは何の絵？"]', 'たぶんへび');
    }
    await shot(pages[1], 'oekaki-2-guess');
    for (const p of pages) await p.getByRole('button', { name: '提出' }).click();
    await pages[0].waitForSelector('text=ノートを見返そう');
    await pages[0].getByRole('button', { name: /次のノートを開く/ }).click();
    await pages[0].getByRole('button', { name: /次のノートを開く/ }).click();
    await pages[2].waitForSelector('text=もう一度遊ぶ');
    assert.equal(await pages[2].locator('.ok-chain').count(), 3);
    await shot(pages[2], 'oekaki-3-reveal');
  },
};

try {
  await waitForServer();
  const only = process.argv.slice(2);
  for (const [id, run] of Object.entries(scenarios)) {
    if (only.length && !only.includes(id)) continue;
    await run();
    console.log(`✅ ${id}`);
  }
  assert.deepEqual(errors, [], 'ブラウザでエラーが出た');
  console.log('✅ e2e-games OK');
} finally {
  await browser.close();
  server.kill();
}
