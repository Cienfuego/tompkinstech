import { defineMiddleware } from 'astro/middleware';
import { verifySession } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  if (isAdminRoute) {
    const token = context.cookies.get('session')?.value;
    if (!verifySession(token)) {
      return context.redirect('/admin/login');
    }
  }

  return next();
});
