// 麻雀修行のページ。タブ（チュートリアル／符点計算／役一覧）を URL の # で切り替える。
import { createTutorial } from './tutorial.js';
import { createCalc } from './calc.js';
import { renderYakuList } from './yakulist.js';
import { findLesson } from './lessons.js';

const KEY = 'mahjongDone';
function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
function saveDone(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* 保存できなくても遊べる */ }
}

const done = loadDone();
const panes = {
  learn: document.getElementById('pane-learn'),
  calc: document.getElementById('pane-calc'),
  yaku: document.getElementById('pane-yaku'),
};
const tabs = [...document.querySelectorAll('[data-tab]')];

const tutorial = createTutorial(panes.learn, {
  done,
  onDone: id => { done.add(id); saveDone(done); },
  onOpen: id => { location.hash = id ? `lesson=${id}` : 'learn'; },
});
let calc = null;
let yakuDrawn = false;

function route() {
  const hash = location.hash.slice(1);
  let tab = 'learn';
  let lesson = null;
  if (hash === 'calc' || hash === 'yaku') tab = hash;
  else if (hash.startsWith('lesson=') && findLesson(hash.slice(7))) lesson = hash.slice(7);
  for (const [k, el] of Object.entries(panes)) el.hidden = k !== tab;
  for (const t of tabs) t.setAttribute('aria-selected', String(t.dataset.tab === tab));
  if (tab === 'learn' && tutorial.current !== lesson) tutorial.open(lesson);
  if (tab === 'learn' && !lesson && tutorial.current === null && !panes.learn.childElementCount) tutorial.open(null);
  if (tab === 'calc' && !calc) calc = createCalc(panes.calc);
  if (tab === 'yaku' && !yakuDrawn) { renderYakuList(panes.yaku); yakuDrawn = true; }
}

for (const t of tabs) t.addEventListener('click', () => { location.hash = t.dataset.tab; });
window.addEventListener('hashchange', route);
route();
