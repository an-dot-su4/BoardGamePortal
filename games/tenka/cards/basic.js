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
