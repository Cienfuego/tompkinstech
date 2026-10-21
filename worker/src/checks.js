import https from 'node:https';
import { URL } from 'node:url';

const TIMEOUT_MS = 10000;

/**
 * Hits a site over HTTPS and reports status, response time, and SSL
 * days-remaining in one shot. Resolves, never rejects — a failed check
 * is still a result, not an exception.
 */
export function checkSite(url) {
  const start = Date.now();

  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      resolve({ status: 'down', httpStatus: null, responseMs: 0, sslDaysRemaining: null, error: 'invalid url' });
      return;
    }

    const req = https.request(
      { hostname: target.hostname, 
	path: target.pathname || '/', 
	method: 'GET', 
	timeout: TIMEOUT_MS,
        headers: {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
	}
      },
      (res) => {
        const responseMs = Date.now() - start;

        let sslDaysRemaining = null;
        const socket = res.socket;
        if (socket && typeof socket.getPeerCertificate === 'function') {
          const cert = socket.getPeerCertificate();
          if (cert && cert.valid_to) {
            sslDaysRemaining = Math.round((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
          }
        }

        res.resume(); // drain the body, we don't need it
        resolve({
          status: res.statusCode && res.statusCode < 400 ? 'up' : 'degraded',
          httpStatus: res.statusCode ?? null,
          responseMs,
          sslDaysRemaining,
          error: null
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'down', httpStatus: null, responseMs: Date.now() - start, sslDaysRemaining: null, error: 'timeout' });
    });

    req.on('error', (err) => {
      resolve({ status: 'down', httpStatus: null, responseMs: Date.now() - start, sslDaysRemaining: null, error: err.message });
    });

    req.end();
  });
}
