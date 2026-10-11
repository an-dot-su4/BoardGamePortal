// シミュレーション用のプレイヤー生成
export function makePlayers(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
}
