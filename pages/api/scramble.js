import Cube from '../../cube.js';

const COLORS = {
  U: '#ffffff', D: '#f9d71c',
  F: '#10b23c', B: '#2d5be3',
  R: '#e3191f', L: '#f58216',
};

const LAYOUT = {
  U: [1, 0],
  L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1],
  D: [1, 2],
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    return res.status(405).json({ error: 'Use GET with an algorithm query parameter.' });
  }

  const { algorithm } = req.query;
  if (typeof algorithm !== 'string') {
    return res.status(400).json({ error: 'Provide exactly one algorithm query parameter. Use algorithm= for a solved cube.' });
  }
  if (algorithm.length > 4096) {
    return res.status(400).json({ error: 'Algorithm must not exceed 4096 characters.' });
  }

  const parsed = Cube.parseScramble(algorithm);
  if (parsed.invalid.length) {
    return res.status(400).json({ error: 'Invalid moves.', invalid: parsed.invalid });
  }

  const { faces } = Cube.stateFromScramble(algorithm);
  const groups = Object.entries(LAYOUT).map(([face, [x, y]]) => {
    const stickers = faces[face].flatMap((row, r) =>
      row.map((color, c) =>
        `<rect x="${c * 24 + 2}" y="${r * 24 + 2}" width="22" height="22" fill="${COLORS[color]}"/>`
      )
    ).join('');
    return `<g data-face="${face}" transform="translate(${x * 77 + 8.5} ${y * 77 + 7})"><rect width="74" height="74" fill="#1b1b1b"/>${stickers}</g>`;
  }).join('');

  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(
    `<svg xmlns="http://www.w3.org/2000/svg" width="161" height="121" viewBox="0 0 322 242" role="img" aria-labelledby="title"><title id="title">Scrambled cube net, white up and green front</title>${groups}</svg>`
  );
}
