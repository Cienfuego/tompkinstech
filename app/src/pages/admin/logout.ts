import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete('session', { path: '/' });
  return redirect('/admin/login');
};
