// 3x3 cube model. Axes: x → R, y → U, z → F.
(function (root) {
  const FACES = {
    U: [0, 1, 0], D: [0, -1, 0],
    R: [1, 0, 0], L: [-1, 0, 0],
    F: [0, 0, 1], B: [0, 0, -1],
  };

  // Grid (row, col) → cubie position for each face as drawn in the net.
  const FACE_POS = {
    U: (r, c) => [c - 1, 1, r - 1],
    D: (r, c) => [c - 1, -1, 1 - r],
    F: (r, c) => [c - 1, 1 - r, 1],
    B: (r, c) => [1 - c, 1 - r, -1],
    R: (r, c) => [1, 1 - r, 1 - c],
    L: (r, c) => [-1, 1 - r, c - 1],
  };

  // Slices / rotations follow the direction of the listed face.
  const SPECIAL = {
    M: { face: 'L', layers: [0] },
    E: { face: 'D', layers: [0] },
    S: { face: 'F', layers: [0] },
    x: { face: 'R', layers: [1, 0, -1] },
    y: { face: 'U', layers: [1, 0, -1] },
    z: { face: 'F', layers: [1, 0, -1] },
  };

  const MOVE_RE = /^([URFDLB]w|[URFDLB]|[urfdlb]|[MESxyz])(\d?)('?)$/;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  // Clockwise quarter turn when looking at the face along -k: v' = k(k·v) − k×v
  const rotCW = (v, k) => {
    const kv = dot(k, v);
    const c = cross(k, v);
    return [k[0] * kv - c[0], k[1] * kv - c[1], k[2] * kv - c[2]];
  };

  function normalizeToken(t) {
    return t.replace(/[’′‘`´]/g, "'").replace(/^\(|\)$/g, '');
  }

  function parseMove(token) {
    const m = MOVE_RE.exec(normalizeToken(token));
    if (!m) return null;
    let [, base, num, prime] = m;
    const n = num === '' ? 1 : parseInt(num, 10);
    if (n < 1 || n > 3) return null;
    let face, layers;
    if (SPECIAL[base]) {
      ({ face, layers } = SPECIAL[base]);
    } else if (/^[urfdlb]$/.test(base) || base.endsWith('w')) {
      face = base[0].toUpperCase();
      layers = [1, 0];
    } else {
      face = base;
      layers = [1];
    }
    let turns = n % 4;
    if (prime) turns = (4 - turns) % 4;
    return { face, layers, turns };
  }

  function tokenize(text) {
    return String(text || '')
      .replace(/[’′‘`´]/g, "'")
      .replace(/(\d)\s+'/g, "$1'")
      .split(/[\s,]+/)
      .filter(Boolean);
  }

  function parseScramble(text) {
    const tokens = tokenize(text);
    const moves = [];
    const invalid = [];
    for (const t of tokens) {
      const mv = parseMove(t);
      if (mv) moves.push(mv);
      else invalid.push(t);
    }
    return { tokens, moves, invalid };
  }

  function solved() {
    const stickers = [];
    for (const [name, n] of Object.entries(FACES)) {
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          stickers.push({ p: FACE_POS[name](r, c), n: n.slice(), color: name });
    }
    return stickers;
  }

  function applyMove(stickers, mv) {
    const k = FACES[mv.face];
    for (let t = 0; t < mv.turns; t++) {
      for (const s of stickers) {
        if (mv.layers.includes(dot(s.p, k))) {
          s.p = rotCW(s.p, k);
          s.n = rotCW(s.n, k);
        }
      }
    }
  }

  // Returns { U: [[...3],[...3],[...3]], ... } of colour letters.
  function stateFromScramble(text) {
    const parsed = parseScramble(text);
    const stickers = solved();
    parsed.moves.forEach((mv) => applyMove(stickers, mv));
    const key = (p, n) => p.join(',') + '|' + n.join(',');
    const map = new Map(stickers.map((s) => [key(s.p, s.n), s.color]));
    const faces = {};
    for (const name of Object.keys(FACES)) {
      faces[name] = [0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => map.get(key(FACE_POS[name](r, c), FACES[name])))
      );
    }
    return { faces, parsed };
  }

  const api = { parseMove, parseScramble, tokenize, stateFromScramble, MOVE_RE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Cube = api;
})(typeof self !== 'undefined' ? self : this);
