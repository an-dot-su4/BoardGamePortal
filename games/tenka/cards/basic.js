// 基本カード（どの組み合わせでも使う）
export const BASIC = {
  zeni: { name: '銅銭', cost: 0, types: ['treasure'], coin: 1, text: '+1文' },
  gin: { name: '銀', cost: 3, types: ['treasure'], coin: 2, text: '+2文' },
  kin: { name: '金', cost: 6, types: ['treasure'], coin: 3, text: '+3文' },
  ta: { name: '田', cost: 2, types: ['victory'], vp: 1, text: '1点' },
  shouen: { name: '荘園', cost: 5, types: ['victory'], vp: 3, text: '3点' },
  kuni: { name: '国', cost: 8, types: ['victory'], vp: 6, text: '6点' },
  tatari: { name: '祟り', cost: 0, types: ['curse'], vp: -1, text: '−1点' },
};

// 画面に出ない、ルール処理用の札（山札の上に戻す順番を選ぶ）
export const INTERNAL = {
  _order: {
    name: '順番',
    cost: 0,
    types: ['internal'],
    hidden: true,
    kingdom: false,
    text: '',
    steps: {
      start(e) {
        const look = e.g.ps[e.p].look;
        if (look.length <= 1) {
          e.g.ps[e.p].deck.push(...look);
          e.g.ps[e.p].look = [];
          return;
        }
        e.ask({ kind: 'list', cards: look.slice(), min: 1, max: 1, title: '山札の上に戻す順番: 先に選んだ札ほど下になります' }, 'pick');
      },
      pick(e, id) {
        const ps = e.g.ps[e.p];
        ps.look.splice(ps.look.indexOf(id), 1);
        ps.deck.push(id);
        e.step('start');
      },
    },
  },
};
