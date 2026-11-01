// 全カードの一覧と時代（拡張セット）の定義
import { BASIC, INTERNAL } from './basic.js';
import { HEIAN } from './heian.js';
import { KAMAKURA } from './kamakura.js';
import { MUROMACHI } from './muromachi.js';
import { SENGOKU } from './sengoku.js';
import { EDO } from './edo.js';

export const SETS = [
  { id: 'heian', name: '平安', era: '基本', ready: true, feature: '基本セット（本家の基本セット初版と同じ25種）。引く・行動を増やす・妨害・圧縮。単体で遊べる。' },
  { id: 'kamakura', name: '鎌倉', ready: true, feature: '持続（御恩と奉公）: 次の手番にも効く札。' },
  { id: 'muromachi', name: '室町', ready: true, feature: '財宝と文化: 大判・御所・名声（勝利点トークン）。' },
  { id: 'sengoku', name: '戦国', ready: true, feature: '下剋上: 廃棄・落武者・戦利品・激しい妨害。' },
  { id: 'edo', name: '江戸', ready: true, feature: '町人文化: 蓄え（小判）・多く払うと得をする札・札の名前を言う札。' },
];

function tag(cards, set) {
  return Object.fromEntries(Object.entries(cards).map(([id, c]) => [id, { id, set, ...c }]));
}

export const CARDS = { ...tag(INTERNAL, 'internal'), ...tag(BASIC, 'basic'), ...tag(HEIAN, 'heian'), ...tag(KAMAKURA, 'kamakura'), ...tag(MUROMACHI, 'muromachi'), ...tag(SENGOKU, 'sengoku'), ...tag(EDO, 'edo') };

// 王国カード（BAN・選出の対象）
export const KINGDOM = Object.values(CARDS).filter(c => c.set !== 'basic' && c.set !== 'internal' && c.kingdom !== false);

export const PRESETS = [
  { id: 'heian-first', name: 'はじめての平安', note: '最初の1回におすすめ', cards: ['kura', 'ichi', 'kebiishi', 'kanayama', 'kekkai', 'zouei', 'shakyo', 'sato', 'koubou', 'gissha'] },
  { id: 'heian-curse', name: '祟りの都', note: '呪術師と結界の攻防', cards: ['jujutsu', 'kekkai', 'tera', 'teien', 'gozen', 'onmyo', 'ichi', 'sato', 'zouei', 'kura'] },
  { id: 'heian-insei', name: '院の権勢', note: '御前で強い札を2回', cards: ['gozen', 'shoko', 'chougi', 'utage', 'kanekashi', 'shakyo', 'koubou', 'kanayama', 'kebiishi', 'gissha'] },
  { id: 'heian-takara', name: '都の財', note: 'お金を増やす札が中心', cards: ['kentoushi', 'kokushi', 'sessho', 'tera', 'sechie', 'onmyo', 'ichi', 'kanayama', 'kanekashi', 'gozen'] },
  { id: 'heian-mittei', name: '間者と盗賊', note: 'ほかの人に関わる札が中心', cards: ['kokushi', 'sessho', 'chougi', 'utage', 'shoko', 'kebiishi', 'kekkai', 'mittei', 'tozoku', 'sato'] },
  { id: 'kamakura-umi', name: '鎌倉の海', note: '鎌倉だけで持続を味わう', cards: ['monomi', 'shugo', 'ryoshi', 'hikitsuke', 'mihari', 'gokenin', 'akutou', 'sousen', 'toimaru', 'genkou'] },
  { id: 'kamakura-houkou', name: '奉公の道', note: '平安＋鎌倉。持続の入門', cards: ['ryoshi', 'gokenin', 'toimaru', 'sousen', 'monomi', 'kebiishi', 'sato', 'shakyo', 'ichi', 'kura'] },
  { id: 'muromachi-eiga', name: '室町の栄華', note: '室町だけで大判・御所を目指す', cards: ['za', 'chanoyu', 'jisha', 'kangou', 'machishu', 'kuramoto', 'nougaku', 'kinkaku', 'dosou', 'shichifuku'] },
  { id: 'muromachi-chanoyu', name: '茶の湯と名声', note: '平安＋室町。名声で点を稼ぐ', cards: ['chanoyu', 'jisha', 'kinkaku', 'za', 'sakaya', 'sato', 'tera', 'shakyo', 'ichi', 'koubou'] },
  { id: 'sengoku-gekokujo', name: '下剋上', note: '戦国だけ。廃棄と格上げ', cards: ['rakuichi', 'katanagari', 'yamashiro', 'randori', 'gekokujo', 'chigyou', 'kobutsu', 'nobushi', 'ikkou', 'takagari'] },
  { id: 'sengoku-ran', name: '戦乱の世', note: '平安＋戦国。攻めと結界', cards: ['randori', 'ikkou', 'yakiuchi', 'shinobi', 'kekkai', 'tera', 'sato', 'shakyo', 'ichi', 'zouei'] },
  { id: 'edo-chounin', name: '町人の世', note: '江戸だけ。蓄えをためて使う', cards: ['shukuba', 'touryou', 'ishiya', 'yose', 'kabuki', 'bantou', 'ryougae', 'echigoya', 'ukiyoe', 'watari'] },
  { id: 'edo-akinai', name: '商いの都', note: '室町＋江戸。財宝と蓄え', cards: ['ryougae', 'ukiyoe', 'daikan', 'touryou', 'yose', 'za', 'chanoyu', 'kuramoto', 'dosou', 'sakaya'] },
  { id: 'all-tenka', name: '天下統一', note: '五つの時代から2種ずつ', cards: ['sato', 'jujutsu', 'toimaru', 'monomi', 'chanoyu', 'dosou', 'ikkou', 'yamashiro', 'ryougae', 'ukiyoe'] },
  { id: 'kamakura-genkou', name: '元寇来たる', note: '平安＋鎌倉。攻めと守り', cards: ['genkou', 'akutou', 'monomi', 'kekkai', 'shikken', 'toimaru', 'gokenin', 'onmyo', 'tera', 'koubou'] },
];
