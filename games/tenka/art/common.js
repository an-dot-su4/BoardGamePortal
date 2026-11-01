// イラストの共通部品（和紙の地・空のぼかし）。枠は 200×130
export const W = 200;
export const H = 130;

// 和紙の地（色と、繊維の細い線）
export function washi(color, id) {
  let fibers = '';
  let seed = [...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const len = 6 + rnd() * 18;
    const a = rnd() * Math.PI;
    fibers += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(a) * len).toFixed(1)} ${(Math.sin(a) * len).toFixed(1)}" />`;
  }
  return `<rect width="${W}" height="${H}" fill="${color}"/><g stroke="#fff" stroke-opacity=".28" stroke-width=".7" fill="none">${fibers}</g>`;
}

// 浮世絵の空のぼかし（上が濃い）
export function skyGradient(id, top, bottom) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
}
