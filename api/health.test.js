import { describe, expect, it } from 'vitest';
import { GET, HEAD, OPTIONS } from './health.js';

describe('GET /api/health', () => {
  it('returns a minimal health document without leaking runtime configuration', async () => {
    const response = GET();
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(payload.status).toBe('ok');
    expect(payload.service).toBe('axem-fighterx-api');
    expect(payload.timestamp).toBeTruthy();
    expect(payload).not.toHaveProperty('env');
    expect(payload).not.toHaveProperty('secrets');
  });
  it('supports HEAD without returning a response body', async () => {
    const response = HEAD();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
  it('advertises only read-only methods', () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get('allow')).toBe('GET, HEAD, OPTIONS');
  });
});