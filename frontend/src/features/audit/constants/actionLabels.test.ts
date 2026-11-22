import { describe, expect, it } from 'vitest';
import { ACTION_LABELS, actionLabel, humanize } from './actionLabels.ts';

const BACKEND_ACTIONS = [
  'auth.setup_token.used',
  'system.setup.completed',
  'auth.login.success',
  'auth.login.failure',
  'auth.logout',
  'user.role.change',
  'user.disable',
  'user.enable',
  'user.invite.create',
  'user.invite.resend',
  'user.invite.revoke',
  'user.invite.accept',
  'auth.password.reset_request',
  'auth.password.reset',
  'auth.password.change',
  'auth.account.locked',
  'access.denied',
  'user.update',
  'system.settings.changed',
  'audit.export',
  'agent.enroll_command.generated',
];

describe('actionLabel', () => {
  it.each(BACKEND_ACTIONS)('has human wording for %s', (action) => {
    const label = actionLabel(action);
    expect(ACTION_LABELS[action]).toBe(label);
    expect(label).not.toMatch(/[._]/);
    expect(label).toMatch(/^[A-Z]/);
  });

  it('maps the events people look for to plain words', () => {
    expect(actionLabel('auth.login.failure')).toBe('Failed sign-in');
    expect(actionLabel('access.denied')).toBe('Access denied');
    expect(actionLabel('user.role.change')).toBe('Changed a role');
  });

  it('gives an action it has never seen a readable fallback instead of a blank', () => {
    expect(actionLabel('agent.enroll_failed')).toBe('Agent enroll failed');
    expect(actionLabel('rule.edit')).toBe('Rule edit');
  });

  it('uses no label twice, so two different actions never read the same', () => {
    const labels = Object.values(ACTION_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('humanize', () => {
  it('turns dots and underscores into spaces and capitalises the first letter', () => {
    expect(humanize('system_settings')).toBe('System settings');
    expect(humanize('t1_analyst')).toBe('T1 analyst');
    expect(humanize('user')).toBe('User');
  });
});
