const { test } = require('node:test');
const assert = require('node:assert/strict');

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const example = "B R2 F2 D2 F L2 D2 F D2 F2 L2 U' R' U' F2 D R D' B";

async function get(algorithm) {
  const url = new URL('/api/scramble', baseURL);
  url.searchParams.set('algorithm', algorithm);
  return fetch(url);
}

function faceColors(svg, face) {
  const group = svg.match(new RegExp(`<g data-face="${face}"[^>]*>(.*?)</g>`));
  assert.ok(group);
  return [...group[1].matchAll(/fill="(#[0-9a-f]+)"/g)].slice(1).map((match) => match[1]);
}

test('example returns a transparent SVG net with all 54 stickers', async () => {
  const response = await get(example);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^image\/svg\+xml/);
  const svg = await response.text();
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.equal((svg.match(/<rect /g) || []).length, 60);
  assert.equal((svg.match(/<g data-face=/g) || []).length, 6);
  assert.doesNotMatch(svg, /<rect[^>]*width="322"|background/);
  for (const color of ['#ffffff', '#f9d71c', '#10b23c', '#2d5be3', '#e3191f', '#f58216']) {
    assert.equal((svg.match(new RegExp(`fill="${color}"`, 'g')) || []).length, 9);
  }
  assert.notEqual(svg, await (await get('')).text());
});

test('solved orientation is white up, green front and red right', async () => {
  const svg = await (await get('')).text();
  assert.deepEqual(faceColors(svg, 'U'), Array(9).fill('#ffffff'));
  assert.deepEqual(faceColors(svg, 'F'), Array(9).fill('#10b23c'));
  assert.deepEqual(faceColors(svg, 'R'), Array(9).fill('#e3191f'));
});

test('default size stays 161 by 121 with square corners and halved face gaps', async () => {
  const svg = await (await get('')).text();
  const [, width, height, viewWidth, viewHeight] = svg.match(
    /<svg[^>]*width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)" viewBox="0 0 (\d+) (\d+)"/
  );
  assert.equal(Number(width), 161);
  assert.equal(Number(height), 121);
  assert.doesNotMatch(svg, /\br[xy]=/);
  const positions = Object.fromEntries([...svg.matchAll(
    /<g data-face="([ULFRBD])" transform="translate\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\)"><rect width="(\d+)" height="(\d+)"/g
  )].map(([, face, x, y, w, h]) => [face, { x: +x, y: +y, w: +w, h: +h }]));
  const scaleX = Number(width) / Number(viewWidth);
  const scaleY = Number(height) / Number(viewHeight);
  for (const face of Object.values(positions)) {
    assert.equal(face.w * scaleX, 37);
    assert.equal(face.h * scaleY, 37);
  }
  for (const [left, right] of [['L', 'F'], ['F', 'R'], ['R', 'B']]) {
    assert.equal((positions[right].x - positions[left].x - positions[left].w) * scaleX, 1.5);
  }
  for (const [top, bottom] of [['U', 'F'], ['F', 'D']]) {
    assert.equal((positions[bottom].y - positions[top].y - positions[top].h) * scaleY, 1.5);
  }
});

test('front clockwise turn moves white bottom row to right left column', async () => {
  const svg = await (await get('F')).text();
  assert.deepEqual(faceColors(svg, 'R'), [
    '#ffffff', '#e3191f', '#e3191f',
    '#ffffff', '#e3191f', '#e3191f',
    '#ffffff', '#e3191f', '#e3191f',
  ]);
  const solved = await (await get('')).text();
  assert.equal(await (await get("R U F F' U' R'")).text(), solved);
});

test('missing, duplicate, invalid and oversized algorithms return errors', async () => {
  for (const query of ['', '?algorithm=R&algorithm=U', '?algorithm=R4', '?algorithm=%3Cscript%3E']) {
    const response = await fetch(`${baseURL}/api/scramble${query}`);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
  const response = await get('R '.repeat(2049));
  assert.equal(response.status, 400);
});

test('POST is rejected and HEAD returns SVG headers without a body', async () => {
  const post = await fetch(`${baseURL}/api/scramble?algorithm=R`, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD, OPTIONS');
  const head = await fetch(`${baseURL}/api/scramble?algorithm=R`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.match(head.headers.get('content-type'), /^image\/svg\+xml/);
  assert.equal(await head.text(), '');
});

test('CORS allows cross-origin reads including error responses', async () => {
  for (const [query, method, status] of [
    ['?algorithm=R', 'GET', 200],
    ['?algorithm=R', 'HEAD', 200],
    ['?algorithm=R4', 'GET', 400],
    ['?algorithm=R', 'POST', 405],
  ]) {
    const response = await fetch(`${baseURL}/api/scramble${query}`, {
      method,
      headers: { Origin: 'https://example.com' },
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  }
});

test('CORS preflight succeeds without an algorithm', async () => {
  const response = await fetch(`${baseURL}/api/scramble`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://example.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type');
  assert.equal(await response.text(), '');
});
