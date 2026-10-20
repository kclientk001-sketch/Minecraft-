import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Deterministic, locally generated vector art. No remote images or fonts.
const P = (x, z, y = 0) => [700 + (x - z) * 32, 520 + (x + z) * 16 - y];
const points = (list) => list.map((p) => p.map((n) => +n.toFixed(2)).join(',')).join(' ');
const polygon = (list, fill, extra = '') => `<polygon points="${points(list)}" fill="${fill}" ${extra}/>`;
const line = (a, b, color, width = 1) => `<path d="M${a.join(',')}L${b.join(',')}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
const noise = (x, z) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
const cube = (x, z, y, w, d, h, colors) => {
  const a = P(x, z, y + h), b = P(x + w, z, y + h), c = P(x + w, z + d, y + h), e = P(x, z + d, y + h);
  return polygon([b, c, P(x + w, z + d, y), P(x + w, z, y)], colors[2]) + polygon([c, e, P(x, z + d, y), P(x + w, z + d, y)], colors[1]) + polygon([a, b, c, e], colors[0]);
};
const wood = ['#bc995d', '#926e40', '#71502f'];
function pine(x, z, y = 0, scale = 1) {
  let out = cube(x - .15, z - .15, y, .3, .3, 105 * scale, ['#8c6941', '#624526', '#473723']);
  for (let i = 0; i < 4; i++) {
    const s = (1.9 - i * .39) * scale;
    const colors = i % 2 ? ['#81a54c', '#486e37', '#355b32'] : ['#6e9343', '#3d6638', '#2d4f2f'];
    out += cube(x - s / 2, z - s / 2, y + (40 + i * 32) * scale, s, s, 29 * scale, colors);
  }
  return out;
}
function oak(x, z, y = 0) {
  return cube(x - .17, z - .17, y, .34, .34, 80, wood) + cube(x - 1.05, z - 1.05, y + 58, 2.1, 2.1, 58, ['#91b65b', '#648840', '#4b7136']) + cube(x - .65, z - .65, y + 116, 1.3, 1.3, 28, ['#a4c66a', '#799f4d', '#60863c']);
}
function house(x, z, y = 0) {
  let out = cube(x, z, y, 2.8, 2.6, 91, wood);
  for (let i = 1; i < 6; i++) {
    out += line(P(x + 2.8, z, y + i * 15), P(x + 2.8, z + 2.6, y + i * 15), '#5a412b', 2);
    out += line(P(x, z + 2.6, y + i * 15), P(x + 2.8, z + 2.6, y + i * 15), '#795632', 2);
  }
  out += polygon([P(x + .55, z + 2.61, y), P(x + 1.25, z + 2.61, y), P(x + 1.25, z + 2.61, y + 56), P(x + .55, z + 2.61, y + 56)], '#4b3825');
  out += polygon([P(x + 1.7, z + 2.62, y + 36), P(x + 2.35, z + 2.62, y + 36), P(x + 2.35, z + 2.62, y + 65), P(x + 1.7, z + 2.62, y + 65)], '#ffda85');
  out += line(P(x + 2.025, z + 2.63, y + 36), P(x + 2.025, z + 2.63, y + 65), '#7a5632', 3);
  out += polygon([P(x + 2.81, z + .5, y + 35), P(x + 2.81, z + 1.3, y + 35), P(x + 2.81, z + 1.3, y + 66), P(x + 2.81, z + .5, y + 66)], '#f7d282');
  out += polygon([P(x - .25, z - .22, y + 91), P(x + 1.4, z - .22, y + 146), P(x + 1.4, z + 2.85, y + 146), P(x - .25, z + 2.85, y + 91)], '#ba653b');
  out += polygon([P(x + 1.4, z - .22, y + 146), P(x + 3.05, z - .22, y + 91), P(x + 3.05, z + 2.85, y + 91), P(x + 1.4, z + 2.85, y + 146)], '#7e3e2b');
  out += polygon([P(x - .25, z + 2.85, y + 91), P(x + 1.4, z + 2.85, y + 146), P(x + 3.05, z + 2.85, y + 91)], '#945333');
  for (let i = 1; i < 6; i++) out += line(P(x + 1.4, z - .22 + i * .5, y + 146), P(x + 3.05, z - .22 + i * .5, y + 91), '#b0643d', 2);
  out += cube(x + .45, z + .3, y + 116, .42, .42, 56, ['#a4a18d', '#78786a', '#585c52']);
  return out;
}
function portal(x, z, y = 0) {
  let out = `<ellipse cx="${P(x + 1, z, y)[0]}" cy="${P(x + 1, z, y)[1]}" rx="110" ry="65" fill="url(#portal-glow)"/>`;
  out += cube(x, z, y, 2.6, .55, 17, ['#655379', '#3f344b', '#2d2935']);
  out += polygon([P(x + .38, z + .15, y + 17), P(x + 2.2, z + .15, y + 17), P(x + 2.2, z + .15, y + 126), P(x + .38, z + .15, y + 126)], 'url(#portal)');
  for (let i = 0; i < 5; i++) {
    out += cube(x, z, y + 17 + i * 23, .4, .55, 23, ['#6e5b7c', '#493c59', '#302d39']);
    out += cube(x + 2.2, z, y + 17 + i * 23, .4, .55, 23, ['#6e5b7c', '#493c59', '#302d39']);
  }
  out += cube(x, z, y + 132, 2.6, .55, 19, ['#776285', '#4c3e58', '#353040']);
  for (let i = 0; i < 9; i++) {
    const [px, py] = P(x + .6 + noise(i, 3) * 1.4, z + .16, y + 25 + noise(i, 7) * 90);
    out += `<rect x="${px}" y="${py}" width="4" height="4" fill="#e1a4ff" opacity=".7"/>`;
  }
  return out;
}
const defs = `<defs><linearGradient id="portal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9b4ff"/><stop offset=".4" stop-color="#9a54c4"/><stop offset="1" stop-color="#633b96"/></linearGradient><radialGradient id="portal-glow"><stop stop-color="#bb7ef0" stop-opacity=".32"/><stop offset="1" stop-color="#ab5eeb" stop-opacity="0"/></radialGradient></defs>`;
const svg = (body, viewBox = '0 0 1400 1100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img">${defs}${body}</svg>\n`;
function landscape() {
  let out = '';
  for (let i = 0; i < 40; i++) {
    const x = 120 + noise(i, 10) * 1160, y = 90 + noise(i, 20) * 780;
    const size = i % 6 === 0 ? 5 : 2;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size}" height="${size}" fill="#d8efaa" opacity="${i % 3 === 0 ? '.6' : '.2'}"/>`;
  }
  out += '<ellipse cx="700" cy="895" rx="340" ry="52" fill="#050c07" opacity=".28"/>';
  const tiles = [];
  for (let x = -8; x <= 8; x++) for (let z = -7; z <= 7; z++) {
    if ((x / 8.4) ** 2 + (z / 7.3) ** 2 > 1 + noise(x, z) * .1) continue;
    const water = (x >= -2 && x <= 0 && z >= -2 && z <= 6) || (x === 1 && z >= -1 && z <= 2);
    const elevation = water ? 0 : Math.floor(noise(x + 3, z) * 3) * 7 + (x < -3 && z < 0 ? 26 : 0);
    tiles.push({ x, z, water, elevation });
  }
  tiles.sort((a, b) => a.x + a.z - b.x - b.z || a.x - b.x);
  for (const { x, z, water, elevation } of tiles) {
    const depth = 110 + Math.floor(noise(x, z) * 4) * 20;
    const tops = ['#82a749', '#91b356', '#789c42', '#a0b75b', '#6e913e'];
    out += cube(x, z, -depth, 1.015, 1.015, depth + elevation, [tops[Math.floor(noise(x, z) * tops.length)], '#5f5537', '#48452f']);
    if (water) out += cube(x, z, elevation, 1.02, 1.02, 6, ['#6dafaf', '#3f888f', '#326e79']);
    else out += cube(x, z, elevation - 9, 1.025, 1.025, 11, [tops[Math.floor(noise(x, z) * tops.length)], '#6a8538', '#526b31']);
    if (noise(x, z) > .75 && !water) out += cube(x + .3, z + .2, elevation + 2, .2, .2, 3, ['#c0c579', '#859a4d', '#768a42']);
  }
  const falls = [P(-2, 7, 6), P(1, 7, 6), P(1, 7, -235), P(-2, 7, -235)];
  out += polygon(falls, '#5aa1a9', 'opacity=".85"');
  for (let i = 0; i < 5; i++) out += line(P(-1.9 + i * .58, 7.02, 4), P(-1.9 + i * .58, 7.02, -210 - i * 5), i % 2 ? '#95d0cb' : '#74b8bd', 4);
  const objects = [
    { x: -5, z: -3, art: () => pine(-5, -3, 42, 1.3) },
    { x: -3, z: -4, art: () => pine(-3, -4, 14, 1.15) },
    { x: 0, z: -5, art: () => pine(0, -5, 14, .9) },
    { x: 4, z: -3, art: () => pine(4, -3, 14, 1.1) },
    { x: -6, z: 0, art: () => pine(-6, 0, 14, 1) },
    { x: -4, z: 1, art: () => oak(-4, 1, 14) },
    { x: 2, z: -1, art: () => house(2, -1, 14) },
    { x: -4, z: 4, art: () => pine(-4, 4, 14, .75) },
    { x: 3, z: 4, art: () => portal(3, 4, 14) },
    { x: 5, z: 1, art: () => oak(5, 1, 14) },
  ];
  objects.sort((a, b) => a.x + a.z - b.x - b.z);
  for (const object of objects) out += object.art();
  // A little footbridge over the stream, then flowers and loose floating blocks.
  out += cube(-2.5, 2.6, 13, 4.2, .75, 10, ['#c5a569', '#9a7849', '#7b5b3b']);
  for (let i = 0; i < 7; i++) out += line(P(-2.4 + i * .6, 2.6, 23), P(-2.4 + i * .6, 3.35, 23), '#785c38', 2);
  for (const [x, z] of [[-3, 4], [2, 3], [3, 2], [5, 0], [-4, 0]]) {
    out += cube(x, z, 14, .08, .08, 14, ['#93ab53', '#72933d', '#547837']);
    out += cube(x - .1, z - .1, 26, .3, .3, 6, ['#f3da8e', '#d7af5d', '#b98c42']);
  }
  out += cube(-10, 1, -140, 1.2, 1.2, 35, ['#9cab59', '#5e5739', '#43442d']);
  out += cube(9, 2, -100, .8, .8, 29, ['#83994a', '#5b5138', '#42412e']);
  out += cube(-5, 9, -280, .55, .55, 18, ['#96a75b', '#605c40', '#464a34']);
  return out;
}
export async function generateArt(directory) {
  await mkdir(directory, { recursive: true });
  const mini = (kind) => {
    let body = '<ellipse cx="700" cy="690" rx="190" ry="27" fill="#000" opacity=".17"/>';
    const colors = kind === 'portal' ? ['#898484', '#5c585a', '#444348'] : ['#97ad5e', '#686044', '#4d5036'];
    body += cube(-3, -2.5, -65, 6, 5, 65, colors);
    for (let x = -3; x < 3; x++) for (let z = -2; z < 3; z++) {
      if (noise(x, z) > .7) body += cube(x, z, 0, .65, .7, 7, kind === 'portal' ? ['#9d9690', '#6c6664', '#58575c'] : ['#a3b967', '#7d9752', '#658343']);
    }
    if (kind === 'trees') body += pine(-1.5, -1, 7, 1.3) + pine(1, -1, 7, 1.0) + oak(0, 1.2, 7);
    if (kind === 'house') body += house(-1.4, -1.6, 7) + pine(-2.4, 1.3, 7, .6) + cube(1.7, 1.4, 7, .7, .7, 12, ['#d9bd6a', '#a3914e', '#7c753c']);
    if (kind === 'portal') body += cube(-2.2, -1.4, 0, 1.1, 1.2, 42, ['#a49b91', '#7f7773', '#625f61']) + portal(-.9, -.7, 7) + cube(1.8, 1.6, 0, .9, .9, 25, ['#a49b91', '#7f7773', '#625f61']);
    return svg(body, '375 205 650 470');
  };
  await writeFile(path.join(directory, 'world.svg'), svg(landscape()));
  await writeFile(path.join(directory, 'survival.svg'), mini('trees'));
  await writeFile(path.join(directory, 'creative.svg'), mini('house'));
  await writeFile(path.join(directory, 'adventure.svg'), mini('portal'));
}
