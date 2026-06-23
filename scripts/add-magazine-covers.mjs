import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function ulid() {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let id = ''; let time = Date.now();
  for (let i = 9; i >= 0; i--) { id = chars[time % 32] + id; time = Math.floor(time / 32); }
  for (let i = 0; i < 16; i++) id += chars[Math.floor(Math.random() * 32)];
  return id;
}

const issues = [
  { slug: 'sustainomics-dec-2025',   issueDate: '2025-12-15T12:00:00Z', tmpCover: '/tmp/cover-sustainomics-dec-2025.jpg' },
  { slug: 'sustainomics-jan-2026',   issueDate: '2026-01-15T12:00:00Z', tmpCover: '/tmp/cover-sustainomics-jan-2026.jpg' },
  { slug: 'sustainomics-march-2026', issueDate: '2026-03-15T12:00:00Z', tmpCover: '/tmp/cover-sustainomics-march-2026.jpg' },
  { slug: 'sustainomics-may-2026',   issueDate: '2026-05-15T12:00:00Z', tmpCover: '/tmp/cover-sustainomics-may-2026.jpg' },
];

const db = new Database(path.join(ROOT, 'data.db'));
const UPLOADS = path.join(ROOT, 'uploads');

const insertMedia = db.prepare('INSERT INTO media (id, filename, mime_type, size, storage_key, status) VALUES (?, ?, ?, ?, ?, \'ready\')');
const updateRev   = db.prepare('UPDATE revisions SET data=? WHERE id=?');
const updateMag   = db.prepare('UPDATE ec_magazines SET issue_date=?, cover=? WHERE slug=?');

db.transaction(() => {
  for (const issue of issues) {
    const mag = db.prepare('SELECT id, live_revision_id FROM ec_magazines WHERE slug=?').get(issue.slug);
    const rev = db.prepare('SELECT data FROM revisions WHERE id=?').get(mag.live_revision_id);
    const data = JSON.parse(rev.data);

    const mediaId   = ulid();
    const storageKey = ulid() + '.jpg';
    const dest = path.join(UPLOADS, storageKey);
    const size = fs.statSync(issue.tmpCover).size;
    fs.copyFileSync(issue.tmpCover, dest);
    insertMedia.run(mediaId, issue.slug + '-cover.jpg', 'image/jpeg', size, storageKey);

    const cover = { id: mediaId, provider: 'local', filename: issue.slug + '-cover.jpg', mimeType: 'image/jpeg', meta: { storageKey } };
    data.cover = cover;
    data.issue_date = issue.issueDate;

    updateRev.run(JSON.stringify(data), mag.live_revision_id);
    updateMag.run(issue.issueDate, JSON.stringify(cover), issue.slug);
    console.log(issue.slug, '->', storageKey);
  }
})();
console.log('Done.');
