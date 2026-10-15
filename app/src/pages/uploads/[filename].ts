import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const UPLOADS_DIR = process.env.UPLOADS_DIR || '/data/uploads';
const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif'
};

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;

  // guard against path traversal — filenames are always our own generated UUIDs
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = await readFile(path.join(UPLOADS_DIR, filename));
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return new Response(data, {
      headers: {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
