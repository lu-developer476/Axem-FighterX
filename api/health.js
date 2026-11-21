const SERVICE_NAME = 'axem-fighterx-api';

function jsonResponse(payload, status = 200, method = 'GET') {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  return new Response(method === 'HEAD' ? null : JSON.stringify(payload), { status, headers });
}

/** Read-only backend probe. It deliberately exposes no environment or deployment secrets. */
export function GET() {
  return jsonResponse({ status: 'ok', service: SERVICE_NAME, timestamp: new Date().toISOString() });
}

export function HEAD() {
  return jsonResponse(null, 200, 'HEAD');
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { Allow: 'GET, HEAD, OPTIONS', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}