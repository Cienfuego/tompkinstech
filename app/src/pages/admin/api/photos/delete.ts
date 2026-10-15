import type { APIRoute } from 'astro';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import pool from '../../../../lib/db';

export const prerender = false;

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const id = Number(form.get('id'));

  if (Number.isFinite(id)) {
    const { rows } = await pool.query('select filename from photos where id = $1', [id]);
    if (rows[0]) {
      await unlink(path.join(UPLOADS_DIR, rows[0].filename)).catch(() => {});
      await pool.query('delete from photos where id = $1', [id]);
    }
  }

  return redirect('/admin/photos');
};
