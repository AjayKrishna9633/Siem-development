import { describe, expect, it } from 'vitest';
import { resolveAppOrigin } from '../../src/config/env.config.ts';
import { setupTokenLine } from '../../src/cli/setup-banner.ts';

describe('resolveAppOrigin', () => {
  it('prefers APP_URL over the older FRONTEND_URL', () => {
    expect(resolveAppOrigin('http://192.168.1.20', 'http://localhost:5173')).toBe(
      'http://192.168.1.20',
    );
  });

  it('falls back to FRONTEND_URL so existing .env files keep working', () => {
    expect(resolveAppOrigin(undefined, 'http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('reduces the URL to an origin, so it matches the browser Origin header for CORS', () => {
    expect(resolveAppOrigin('https://siem.acme.test/', 'http://x')).toBe('https://siem.acme.test');
    expect(resolveAppOrigin('https://siem.acme.test:8443/app', 'http://x')).toBe(
      'https://siem.acme.test:8443',
    );
  });
});

describe('setupTokenLine', () => {
  // install.sh greps the API logs for this exact shape; changing it breaks `install.sh token`.
  it('has the fixed shape the installer looks for', () => {
    expect(setupTokenLine('a'.repeat(64), 'http://10.0.0.5')).toBe(
      `==== SIEMple setup token: ${'a'.repeat(64)} (open http://10.0.0.5 to complete setup) ====`,
    );
  });
});
