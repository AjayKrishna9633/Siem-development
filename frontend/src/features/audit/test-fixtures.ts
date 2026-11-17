import type { IAuditLog } from './types/audit.types.ts';

// An ISO timestamp the way the server prints it: six fractional digits.
export const microIso = (date: Date): string => date.toISOString().replace('Z', '456Z');

const ADMIN_ID = '0b2f4a52-1111-4222-8333-444455556666';

let counter = 0;

// A realistic entry; override only what a test cares about.
export const makeEntry = (overrides: Partial<IAuditLog> = {}): IAuditLog => {
  counter += 1;
  const suffix = String(counter).padStart(12, '0');
  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    occurredAt: microIso(new Date(Date.now() - 5 * 60_000)),
    actor: { id: ADMIN_ID, username: 'First Admin', role: 'admin' },
    action: 'auth.login.success',
    category: 'auth',
    outcome: 'success',
    target: { type: 'user', id: ADMIN_ID, label: 'admin@example.com' },
    ipAddress: '203.0.113.7',
    userAgent: 'vitest',
    requestId: 'req-1',
    metadata: {},
    ...overrides,
  };
};

export const ADMIN = { id: ADMIN_ID, username: 'First Admin', role: 'admin' } as const;
