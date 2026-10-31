// 全カードの一覧と時代（拡張セット）の定義
import { BASIC } from './basic.js';
import { HEIAN } from './heian.js';

export const SETS = [
  { id: 'heian', name: '平安', era: '基本', ready: true, feature: '基本セット。引く・行動を増やす・妨害・圧縮。単体で遊べる。' },
  { id: 'kamakura', name: '鎌倉', ready: false, feature: '持続（御恩と奉公）: 次の手番にも効く札。' },
  { id: 'muromachi', name: '室町', ready: false, feature: '財宝と文化: 大判・御所・名声（勝利点トークン）。' },
  { id: 'sengoku', name: '戦国', ready: false, feature: '下剋上: 廃棄・落武者・戦利品・激しい妨害。' },
  { id: 'edo', name: '江戸', ready: false, feature: '町人文化: 蓄え（小判）・多く払うと得をする札。' },
];

function tag(cards, set) {
  return Object.fromEntries(Object.entries(cards).map(([id, c]) => [id, { id, set, ...c }]));
}

export const CARDS = { ...tag(BASIC, 'basic'), ...tag(HEIAN, 'heian') };

// 王国カード（BAN・選出の対象）
export const KINGDOM = Object.values(CARDS).filter(c => c.set !== 'basic');

export const PRESETS = [
  { id: 'heian-first', name: 'はじめての平安', note: '最初の1回におすすめ', cards: ['kura', 'ichi', 'kebiishi', 'kanayama', 'kekkai', 'zouei', 'shakyo', 'sato', 'koubou', 'gissha'] },
  { id: 'heian-curse', name: '祟りの都', note: '呪術師と結界の攻防', cards: ['jujutsu', 'kekkai', 'tera', 'teien', 'gozen', 'onmyo', 'ichi', 'sato', 'zouei', 'kura'] },
  { id: 'heian-insei', name: '院の権勢', note: '御前で強い札を2回', cards: ['gozen', 'shoko', 'chougi', 'utage', 'kanekashi', 'shakyo', 'koubou', 'kanayama', 'kebiishi', 'gissha'] },
];
