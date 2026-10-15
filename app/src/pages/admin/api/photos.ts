import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pool from '../../../lib/db';

export const prerender = false;

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads';
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const file = form.get('photo');

  if (file && typeof file !== 'string' && file.size > 0) {
    const ext = EXT_BY_MIME[file.type] || 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;

    await mkdir(UPLOADS_DIR, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOADS_DIR, filename), buf);

    const caption = form.get('caption')?.toString().trim() || null;
    const { rows } = await pool.query('select coalesce(max(sort_order), 0) + 1 as n from photos');
    await pool.query(
      'insert into photos (filename, caption, sort_order) values ($1, $2, $3)',
      [filename, caption, rows[0].n]
    );
  }

  return redirect('/admin/photos');
};
