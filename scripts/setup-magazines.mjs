/**
 * First-deploy setup: registers the four magazine issues (and their media)
 * into a fresh EmDash database. Run AFTER the initial seed:
 *
 *   npx emdash seed seed/seed.json --on-conflict=update
 *   node scripts/setup-magazines.mjs
 *
 * Idempotent — safe to re-run.
 */
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = new Database(path.join(ROOT, 'data.db'));
const UPLOADS = path.join(ROOT, 'uploads');

const ISSUES = [
  {
    magId:   '01KVTKWWEYHW55MVCQ3ZWZ85AH',
    slug:    'sustainomics-dec-2025',
    title:   'The Sustainomics — December 2025',
    issueDate: '2025-12-15T12:00:00Z',
    revId:   '01KVTM8HPY15DJJJDFEDTN3RCM',
    pdf: {
      mediaId:    '01KVTKWWE790M4Y1MSV97WXKK8',
      storageKey: '01KVTKWWE7Z2ATFB43VD0G4BJP.pdf',
      filename:   'The Sustainomics DEC 2025 (1) (1).pdf',
    },
    cover: {
      mediaId:    '01KVTMCVPJ798CBX1SPCX0ETJ9',
      storageKey: '01KVTMCVPK2BNV5YGAY6REKTWV.jpg',
      filename:   'sustainomics-dec-2025-cover.jpg',
    },
  },
  {
    magId:   '01KVTKWWH8RRC1KERH588C8EE9',
    slug:    'sustainomics-jan-2026',
    title:   'The Sustainomics — January 2026',
    issueDate: '2026-01-15T12:00:00Z',
    revId:   '01KVTM8HQ050GVZVE0P4D50AB7',
    pdf: {
      mediaId:    '01KVTKWWF39PKB9AAT9A8FZS5V',
      storageKey: '01KVTKWWF3SSDV3NMW43HVCAQX.pdf',
      filename:   'The Sustainomics Jan 2026.pdf',
    },
    cover: {
      mediaId:    '01KVTMCVPNJHSQM2W17TPX3BV0',
      storageKey: '01KVTMCVPNMG1K3W59NRNGZ7QN.jpg',
      filename:   'sustainomics-jan-2026-cover.jpg',
    },
  },
  {
    magId:   '01KVTKWWK7V81WBHT9JMADN9W3',
    slug:    'sustainomics-march-2026',
    title:   'The Sustainomics — March 2026',
    issueDate: '2026-03-15T12:00:00Z',
    revId:   '01KVTM8HQ0JQWV2C70WV8R5E7V',
    pdf: {
      mediaId:    '01KVTKWWH8MHP3XWZ1875H7KQD',
      storageKey: '01KVTKWWH8BQV99VSYCNHH8MX9.pdf',
      filename:   'The Sustainomics March 2026 (7).pdf',
    },
    cover: {
      mediaId:    '01KVTMCVPPS4S1Q0YT9CN0FZTS',
      storageKey: '01KVTMCVPPKS0354Z0XKDPJRJC.jpg',
      filename:   'sustainomics-march-2026-cover.jpg',
    },
  },
  {
    magId:   '01KVTKWX4Q1S3GFH5MQ46QP9HJ',
    slug:    'sustainomics-may-2026',
    title:   'The Sustainomics — May 2026',
    issueDate: '2026-05-15T12:00:00Z',
    revId:   '01KVTM8HQ0S8KGV9Q1ANME6AQR',
    pdf: {
      mediaId:    '01KVTKWWK8DJ4KFKTSNHHVWPVD',
      storageKey: '01KVTKWWK8ES6YK100X8N3SGP5.pdf',
      filename:   'The Sustainomics May 2026.pdf',
    },
    cover: {
      mediaId:    '01KVTMCVPQDF89R0A7QNM98B09',
      storageKey: '01KVTMCVPQM2J4289KM3MZKK24.jpg',
      filename:   'sustainomics-may-2026-cover.jpg',
    },
  },
];

const insMedia = db.prepare(`
  INSERT INTO media (id, filename, mime_type, size, storage_key, status)
  VALUES (?, ?, ?, ?, ?, 'ready')
  ON CONFLICT(id) DO NOTHING
`);
const insMag = db.prepare(`
  INSERT INTO ec_magazines (id, slug, status, title, pdf, cover, issue_date, published_at, live_revision_id)
  VALUES (?, ?, 'published', ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`);
const insRev = db.prepare(`
  INSERT INTO revisions (id, collection, entry_id, data)
  VALUES (?, 'magazines', ?, ?)
  ON CONFLICT(id) DO NOTHING
`);

db.transaction(() => {
  for (const issue of ISSUES) {
    const pdfPath   = path.join(UPLOADS, issue.pdf.storageKey);
    const coverPath = path.join(UPLOADS, issue.cover.storageKey);

    if (!fs.existsSync(pdfPath))   { console.error('Missing:', pdfPath);   continue; }
    if (!fs.existsSync(coverPath)) { console.error('Missing:', coverPath); continue; }

    const pdfSize   = fs.statSync(pdfPath).size;
    const coverSize = fs.statSync(coverPath).size;

    insMedia.run(issue.pdf.mediaId,   issue.pdf.filename,   'application/pdf', pdfSize,   issue.pdf.storageKey);
    insMedia.run(issue.cover.mediaId, issue.cover.filename, 'image/jpeg',      coverSize, issue.cover.storageKey);

    const pdfJson = JSON.stringify({
      id: issue.pdf.mediaId, provider: 'local', filename: issue.pdf.filename,
      mimeType: 'application/pdf', alt: issue.title,
      meta: { storageKey: issue.pdf.storageKey },
    });
    const coverJson = JSON.stringify({
      id: issue.cover.mediaId, provider: 'local', filename: issue.cover.filename,
      mimeType: 'image/jpeg',
      meta: { storageKey: issue.cover.storageKey },
    });
    const revData = JSON.stringify({
      title: issue.title, pdf: JSON.parse(pdfJson),
      cover: JSON.parse(coverJson), issue_date: issue.issueDate,
    });

    insRev.run(issue.revId, issue.magId, revData);
    insMag.run(issue.magId, issue.slug, issue.title, pdfJson, coverJson,
               issue.issueDate, issue.issueDate, issue.revId);

    console.log('✓', issue.slug);
  }
})();

console.log('Magazine setup complete.');
