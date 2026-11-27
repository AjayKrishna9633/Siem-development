import { formatDistanceStrict } from 'date-fns';
import type { ICreatedEnrollmentLink } from '../types/agent.types.ts';

export const formatLocal = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatRelative = (iso: string, now: Date): string =>
  formatDistanceStrict(new Date(iso), now, { addSuffix: true });

// A short, ready-to-send text for whoever installs the agent.
export const buildLinkMessage = (link: ICreatedEnrollmentLink, now: Date): string =>
  [
    `Install the SIEMple agent on ${link.name}:`,
    link.url,
    '',
    "Open this link on the computer you're installing the agent on. It works for one install and " +
      `expires ${formatLocal(link.expiresAt)} (${formatRelative(link.expiresAt, now)}).`,
  ].join('\n');
