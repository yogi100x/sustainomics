// Replaces $media references in seed.json with embedded image objects using local storage keys
import { readFileSync, writeFileSync } from 'fs';

const mediaMap = {
  'biodiversity-credits.jpg': { id: '01KV3TVYDMSCKAKHR85ZKSNCZ3', storageKey: '01KV3TVYDDKXEAKVEV0Q6ANZKZ.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'cbam-steel.jpg':           { id: '01KV3TVY8NVNK0YMJSX5J0PT9F', storageKey: '01KV3TVY7VPMA1V4FCQ6D76AX0.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'clean-energy-investment.jpg': { id: '01KV3TVYA27J4KCJYBWX423WKN', storageKey: '01KV3TVY9XRM95VJN9H96PW64E.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'cover.png':                { id: '01KVH7660S60AXBBRBX8GD1RWD', storageKey: '01KVH765TNV52GHPSDVAKJMRH4.png', mimeType: 'image/png' },
  'esg-pragmatic.jpg':        { id: '01KV3TVYFV3HD8MZ94EX4W9YE7', storageKey: '01KV3TVYFR3ATCR5N5NKS6N2G9.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'green-hydrogen.jpg':       { id: '01KV3TVYB90DZX2ERVEVWD8HZC', storageKey: '01KV3TVYB496S7AMVE03A1RKAX.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'grid-bottlenecks.jpg':     { id: '01KV3TVYET8Q6PEHJHKYNQV9EP', storageKey: '01KV3TVYEP98CMEH8C5WJK1155.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'net-zero-reckoning.jpg':   { id: '01KV3TVYCENC2AH91F9KDNNMHX', storageKey: '01KV3TVYCADKGKDYMH9VEPGJ52.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
  'podcast-sample-15s.mp3':   { id: '01KV6HC3RDT663HW48B634N469', storageKey: '01KV6HC3RCWW10HF72PWP4QW99.mp3', mimeType: 'audio/mpeg' },
  'sustainomics-quarterly-q2-2026.pdf': { id: '01KV6HDPZX14YTCVYHW9RQYK8W', storageKey: '01KV6HDPZXGX53YTB2P4H8KX1X.pdf', mimeType: 'application/pdf' },
  'swf-grid.jpg':             { id: '01KV56EV7NH6PC17R4XE4PQGM4', storageKey: '01KV56EV7GNXD636KXF4FZ4RV7.jpg', mimeType: 'image/jpeg', width: 1200, height: 800 },
};

let replaced = 0;

function walk(obj) {
  if (Array.isArray(obj)) return obj.map(walk);
  if (!obj || typeof obj !== 'object') return obj;
  if ('$media' in obj) {
    const { filename } = obj['$media'];
    const m = mediaMap[filename];
    if (!m) { console.warn('No local media found for:', filename); return obj; }
    replaced++;
    const result = { id: m.id, provider: 'local', filename, mimeType: m.mimeType, meta: { storageKey: m.storageKey } };
    if (m.width) result.width = m.width;
    if (m.height) result.height = m.height;
    return result;
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = walk(v);
  return out;
}

const seed = JSON.parse(readFileSync('seed/seed.json', 'utf8'));
const fixed = walk(seed);
writeFileSync('seed/seed.json', JSON.stringify(fixed, null, '\t'));
console.log(`Done. Replaced ${replaced} $media references.`);
