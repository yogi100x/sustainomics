#!/usr/bin/env node
// One-shot script: import magazine PDFs into EmDash media + ec_magazines
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ulid() {
  const t = Date.now();
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let id = '';
  let time = t;
  for (let i = 9; i >= 0; i--) {
    id = chars[time % 32] + id;
    time = Math.floor(time / 32);
  }
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * 32)];
  }
  return id;
}

const SOURCE_DIR = '/Users/yogi/Projects/GCPIT';
const UPLOADS_DIR = path.resolve('./uploads');
const DB_PATH = path.resolve('./data.db');

const issues = [
  {
    filename: 'The Sustainomics DEC 2025 (1) (1).pdf',
    title: 'The Sustainomics — December 2025',
    slug: 'sustainomics-dec-2025',
    issue_date: '2025-12-01T00:00:00Z',
  },
  {
    filename: 'The Sustainomics Jan 2026.pdf',
    title: 'The Sustainomics — January 2026',
    slug: 'sustainomics-jan-2026',
    issue_date: '2026-01-01T00:00:00Z',
  },
  {
    filename: 'The Sustainomics March 2026 (7).pdf',
    title: 'The Sustainomics — March 2026',
    slug: 'sustainomics-march-2026',
    issue_date: '2026-03-01T00:00:00Z',
  },
  {
    filename: 'The Sustainomics May 2026.pdf',
    title: 'The Sustainomics — May 2026',
    slug: 'sustainomics-may-2026',
    issue_date: '2026-05-01T00:00:00Z',
  },
];

const db = new Database(DB_PATH);

const insertMedia = db.prepare(`
  INSERT INTO media (id, filename, mime_type, size, storage_key, status)
  VALUES (?, ?, 'application/pdf', ?, ?, 'ready')
`);

const insertMag = db.prepare(`
  INSERT INTO ec_magazines (id, slug, status, title, pdf, issue_date, published_at)
  VALUES (?, ?, 'published', ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`);

const tx = db.transaction(() => {
  for (const issue of issues) {
    const src = path.join(SOURCE_DIR, issue.filename);
    if (!fs.existsSync(src)) {
      console.error(`NOT FOUND: ${src}`);
      continue;
    }

    const size = fs.statSync(src).size;
    const mediaId = ulid();
    const storageKey = ulid() + '.pdf';
    const dest = path.join(UPLOADS_DIR, storageKey);

    fs.copyFileSync(src, dest);
    console.log(`Copied ${issue.filename} -> uploads/${storageKey}`);

    insertMedia.run(mediaId, issue.filename, size, storageKey);

    const pdfJson = JSON.stringify({
      id: mediaId,
      provider: 'local',
      filename: issue.filename,
      mimeType: 'application/pdf',
      alt: issue.title,
      meta: {},
    });

    const magId = ulid();
    insertMag.run(magId, issue.slug, issue.title, pdfJson, issue.issue_date, issue.issue_date);
    console.log(`Created magazine: ${issue.title} (${magId})`);
  }
});

tx();
console.log('Done.');
