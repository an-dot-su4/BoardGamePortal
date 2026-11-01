// 戦国「下剋上」: 廃棄・落武者（廃墟）・戦利品・激しい妨害
//   落武者の山 (ruins): 4種の弱い行動札を混ぜた山。攻撃で押しつけられる。山の一番上の札を獲得する
//   戦利品 (senrihin): 財宝+3。使うと山に戻る。供給には含まれず、買えない
//   onTrash: 廃棄されたときの効果（steps.onTrash として実行）
import { CARDS } from './index.js';

const cardName = id => CARDS[id].name;
const isType = (id, t) => CARDS[id].types.includes(t);
const RUIN = { types: ['action', 'ruins'], cost: 0, kingdom: false, notSupply: true };

export const SENGOKU = {
  // 落武者の山（供給に置かれる札。中身は下の4種）
  ruins: { name: '落武者の山', cost: 0, types: ['action', 'ruins'], kingdom: false, text: '落武者の札を混ぜた山。一番上の1枚を獲得する。' },
  ochimusha: { ...RUIN, name: '落武者', text: '+1文', play: e => e.coins(1) },
  yakedera: { ...RUIN, name: '焼け寺', text: '+1札', play: e => e.draw(1) },
  arechi: { ...RUIN, name: '荒れ市', text: '+1購入', play: e => e.buys(1) },
  haison: { ...RUIN, name: '廃村', text: '+1行動', play: e => e.actions(1) },

  senrihin: {
    name: '戦利品',
    cost: 0,
    types: ['treasure'],
    coin: 3,
    kingdom: false,
    notSupply: true,
    text: '+3文\n使ったら戦利品の山に戻す。（買えない）',
    canBuy: () => false,
    play(e) {
      const play = e.g.ps[e.p].play;
      play.splice(play.lastIndexOf('senrihin'), 1);
      e.g.supply.senrihin += 1;
    },
  },

  rakuichi: {
    name: '楽市',
    cost: 3,
    types: ['action'],
    text: '+1札\n+1行動\n+1購入',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.buys(1);
    },
  },
  katanagari: {
    name: '刀狩',
    cost: 3,
    types: ['action'],
    text: '+1行動\n+1購入\n手札を1枚廃棄する。廃棄置き場にある財宝の種類の数だけ+1文。',
    play(e) {
      e.actions(1);
      e.buys(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '刀狩: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
        const kinds = new Set(e.g.trash.filter(id => isType(id, 'treasure'))).size;
        e.coins(kinds);
        if (kinds) e.log(`${e.name()}: 刀狩で+${kinds}文`);
      },
    },
  },
  yamashiro: {
    name: '山城',
    cost: 4,
    types: ['action'],
    text: '+1札\n+2行動\n廃棄されたとき、廃棄置き場から手札に戻る。',
    play(e) {
      e.draw(1);
      e.actions(2);
    },
    steps: {
      onTrash(e) {
        const i = e.g.trash.lastIndexOf('yamashiro');
        if (i < 0) return;
        e.g.trash.splice(i, 1);
        e.g.ps[e.p].hand.push('yamashiro');
        e.log(`${e.name()}: 山城は落ちず、手札に戻った`);
      },
    },
  },
  randori: {
    name: '乱取り',
    cost: 4,
    types: ['action', 'attack'],
    spoils: true,
    ruins: true,
    text: '戦利品を1枚獲得する。ほかの全員は落武者を1枚獲得する。',
    play(e) {
      if (e.gain('senrihin')) e.log(`${e.name()}: 戦利品を手に入れた`);
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const got = e.gain('ruins', e.target);
        if (got) e.log(`${e.name(e.target)}: ${cardName(got)}を押しつけられた`);
      },
    },
  },
  gekokujo: {
    name: '下剋上',
    cost: 4,
    types: ['action'],
    text: '手札の行動札を1枚選び、2回使う。そのあとその札を廃棄し、コストがちょうど1高い行動札を1枚獲得する。',
    play(e) {
      e.ask({ kind: 'hand', min: 0, max: 1, types: ['action'], title: '下剋上: 2回使って格上げする行動札を選ぶ' }, 'pick');
    },
    steps: {
      pick(e, ids) {
        if (!ids.length) return;
        const id = ids[0];
        const ps = e.g.ps[e.p];
        ps.hand.splice(ps.hand.indexOf(id), 1);
        ps.play.push(id);
        e.log(`${e.name()}: 下剋上で${cardName(id)}を2回使う`);
        e.later({ op: 'step', p: e.p, card: 'gekokujo', step: 'upgrade', data: { card: id } });
        e.play(id, 2, { token: e.newToken(), card: 'gekokujo' });
      },
      upgrade(e) {
        const id = e.data.card;
        const ps = e.g.ps[e.p];
        const i = ps.play.lastIndexOf(id);
        if (i >= 0 && !isType(id, 'duration')) {
          ps.play.splice(i, 1);
          e.trashCard(id);
        }
        const cost = e.cost(id) + 1;
        e.ask({ kind: 'supply', min: 1, exactCost: cost, types: ['action'], title: `コストがちょうど${cost}の行動札を獲得` }, 'gain', { from: id });
      },
      gain(e, id) {
        if (id && e.gain(id)) e.log(`${e.name()}: ${cardName(e.data.from)}を${cardName(id)}に下剋上`);
      },
    },
  },
  chigyou: {
    name: '知行',
    cost: 4,
    types: ['victory'],
    text: '持っている銀3枚ごとに1点。廃棄されたとき、銀を3枚獲得する。',
    vp: ({ cards }) => Math.floor(cards.filter(id => id === 'gin').length / 3),
    steps: {
      onTrash(e) {
        for (let i = 0; i < 3; i++) e.gain('gin');
        e.log(`${e.name()}: 知行を手放して銀を3枚得た`);
      },
    },
  },
  kobutsu: {
    name: '古物商',
    cost: 5,
    types: ['action'],
    text: '+1札\n+1行動\n+1文\n手札を1枚廃棄する。',
    play(e) {
      e.draw(1);
      e.actions(1);
      e.coins(1);
      e.ask({ kind: 'hand', min: 1, max: 1, title: '古物商: 廃棄する札を選ぶ' }, 'trash');
    },
    steps: {
      trash(e, ids) {
        e.trash(ids);
      },
    },
  },
  nobushi: {
    name: '野武士の砦',
    cost: 5,
    types: ['action'],
    spoils: true,
    text: '+1札\n+2行動\n戦利品を1枚獲得する。',
    play(e) {
      e.draw(1);
      e.actions(2);
      e.gain('senrihin');
    },
  },
  ikkou: {
    name: '一向一揆',
    cost: 5,
    types: ['action', 'attack'],
    ruins: true,
    text: '+2札\nほかの全員は落武者を1枚獲得する。手札の一向一揆を、行動を使わずに続けて使ってもよい。',
    play(e) {
      e.draw(2);
      e.step('chain'); // 攻撃のあとで聞く
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const got = e.gain('ruins', e.target);
        if (got) e.log(`${e.name(e.target)}: ${cardName(got)}を押しつけられた`);
      },
      chain(e) {
        if (!e.hand().includes('ikkou')) return;
        e.ask({ kind: 'option', title: 'もう1枚の一向一揆を続けて使う？', options: [{ value: 'yes', label: '続けて使う' }, { value: 'no', label: '使わない' }] }, 'more');
      },
      more(e, choice) {
        if (choice !== 'yes') return;
        const ps = e.g.ps[e.p];
        ps.hand.splice(ps.hand.indexOf('ikkou'), 1);
        ps.play.push('ikkou');
        e.play('ikkou');
      },
    },
  },
  yakiuchi: {
    name: '焼き討ち',
    cost: 5,
    types: ['action', 'attack'],
    spoils: true,
    text: 'この札を廃棄する。ほかの全員は、手札が5枚以上なら手札を見せ、あなたが選んだ1枚を捨てる。戦利品を2枚獲得する。',
    play(e) {
      const play = e.g.ps[e.p].play;
      const i = play.lastIndexOf('yakiuchi');
      if (i >= 0) {
        play.splice(i, 1);
        e.trashCard('yakiuchi');
      }
      e.later({ op: 'step', p: e.p, card: 'yakiuchi', step: 'loot', data: {} }); // 攻撃のあとで
      e.attack('hit');
    },
    steps: {
      hit(e) {
        const hand = e.hand(e.target);
        if (hand.length < 5) return;
        e.ask({ p: e.p, kind: 'list', cards: hand.slice(), min: 1, max: 1, title: `焼き討ち: ${e.name(e.target)} に捨てさせる札を選ぶ` }, 'pick');
      },
      pick(e, id) {
        if (!id) return;
        e.discard([id], e.target);
        e.log(`${e.name(e.target)}: 焼き討ちで${cardName(id)}を失った`);
      },
      loot(e) {
        e.gain('senrihin');
        e.gain('senrihin');
      },
    },
  },
  shinobi: {
    name: '忍び',
    cost: 5,
    types: ['action', 'attack'],
    text: '+2文\n廃棄置き場にコスト3〜6の札があれば、1枚獲得する。無ければ、ほかの全員は山札を2枚めくり、コスト3〜6の札を1枚廃棄して残りを捨てる。',
    play(e) {
      e.coins(2);
      const loot = [...new Set(e.g.trash.filter(id => e.cost(id) >= 3 && e.cost(id) <= 6))];
      if (loot.length) {
        e.ask({ kind: 'list', cards: loot, min: 1, max: 1, title: '忍び: 廃棄置き場から獲得する札を選ぶ' }, 'steal');
        return;
      }
      e.attack('hit');
    },
    steps: {
      steal(e, id) {
        if (!id) return;
        e.gainFromTrash(id);
        e.log(`${e.name()}: 忍びが廃棄置き場から${cardName(id)}を盗み出した`);
      },
      hit(e) {
        const ps = e.g.ps[e.target];
        const seen = e.draw(2, e.target);
        for (const id of seen) ps.hand.splice(ps.hand.lastIndexOf(id), 1);
        ps.look.push(...seen);
        const targets = seen.filter(id => e.cost(id) >= 3 && e.cost(id) <= 6);
        if (!targets.length) return e.step('rest');
        e.ask({ p: e.target, kind: 'list', cards: targets, min: 1, max: 1, title: '忍び: 廃棄する札を選ぶ' }, 'burn');
      },
      burn(e, id) {
        const ps = e.g.ps[e.target];
        if (id) {
          ps.look.splice(ps.look.indexOf(id), 1);
          e.trashCard(id, e.target);
          e.log(`${e.name(e.target)}: 忍びに${cardName(id)}を焼かれた`);
        }
        e.step('rest');
      },
      rest(e) {
        const ps = e.g.ps[e.target];
        ps.discard.push(...ps.look);
        ps.look = [];
      },
    },
  },
  takagari: {
    name: '鷹狩',
    cost: 6,
    types: ['action'],
    text: '+4札\n廃棄されたとき、荘園1枚か田3枚を獲得する。',
    play(e) {
      e.draw(4);
    },
    steps: {
      onTrash(e) {
        e.ask({ kind: 'option', title: '鷹狩: 獲得する札を選ぶ', options: [{ value: 'shouen', label: '荘園1枚' }, { value: 'ta', label: '田3枚' }] }, 'reward');
      },
      reward(e, choice) {
        if (choice === 'shouen') e.gain('shouen');
        else for (let i = 0; i < 3; i++) e.gain('ta');
      },
    },
  },
};
