import { describe, expect, it } from 'vitest';
import {
  CONNECTED_MESSAGE,
  EXPIRED_MESSAGE,
  POLL_INTERVAL_MS,
  USED_MESSAGE,
  detectArch,
  detectOs,
  startStatusPolling,
  type IStatusResponse,
} from '../../enroll-assets/enroll.js';
import * as page from '../../src/enroll/page.ts';

const UA = {
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0 Safari/537.36',
  ubuntu: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  fedora: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  armLinux: 'Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/158.0 Mobile',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_5) AppleWebKit/605.1.15 Version/19.0 Safari/605.1.15',
};

describe('enrollment page script: detection', () => {
  it.each([
    ['Windows', UA.windows, 'windows'],
    ['Ubuntu', UA.ubuntu, 'linux-deb'],
    ['Fedora', UA.fedora, 'linux-rpm'],
    ['an Android phone (keeps the link OS)', UA.android, 'linux-rpm'],
    ['an iPhone (keeps the link OS)', UA.iphone, 'linux-rpm'],
    ['a Mac (keeps the link OS)', UA.mac, 'linux-rpm'],
  ])('picks the OS on %s', (_label, userAgent, expected) => {
    expect(detectOs(userAgent, 'linux-rpm')).toBe(expected);
  });

  it.each([
    [UA.windows, 'x86_64'],
    [UA.ubuntu, 'x86_64'],
    [UA.armLinux, 'arm64'],
    [UA.mac, 'arm64'],
  ])('picks the processor from %s', (userAgent, expected) => {
    expect(detectArch(userAgent, 'arm64')).toBe(expected);
  });

  it('shows exactly the messages the server renders', () => {
    expect(USED_MESSAGE).toBe(page.USED_MESSAGE);
    expect(CONNECTED_MESSAGE).toBe(page.CONNECTED_MESSAGE);
    expect(EXPIRED_MESSAGE).toBe(page.EXPIRED_MESSAGE);
  });
});

// Drives the poller by hand: each scheduled callback is run when the test says so.
const harness = (answers: (IStatusResponse | Error)[]) => {
  const scheduled: { callback: () => void; ms: number }[] = [];
  const requested: { url: string; init: object }[] = [];
  const events: string[] = [];
  const poller = startStatusPolling({
    url: '/e/abc/status',
    onConnected: () => events.push('connected'),
    onGone: () => events.push('gone'),
    fetchFn: async (url, init) => {
      requested.push({ url, init });
      const answer = answers.shift();
      if (!answer || answer instanceof Error) throw answer ?? new Error('offline');
      return answer;
    },
    schedule: (callback, ms) => {
      scheduled.push({ callback, ms });
      return scheduled.length;
    },
    cancel: () => {},
  });
  const runNext = async () => {
    const next = scheduled.shift();
    if (!next) throw new Error('nothing scheduled');
    next.callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { poller, scheduled, requested, events, runNext };
};

const answer = (status: number, body?: unknown): IStatusResponse => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe('enrollment page script: live status', () => {
  it('asks every 5 seconds, without cookies or a cached answer, until the agent connects', async () => {
    const h = harness([answer(200, { status: 'pending' }), answer(200, { status: 'connected' })]);
    expect(h.scheduled[0]?.ms).toBe(POLL_INTERVAL_MS);
    expect(POLL_INTERVAL_MS).toBe(5000);

    await h.runNext();
    expect(h.events).toEqual([]);
    expect(h.requested[0]).toEqual({
      url: '/e/abc/status',
      init: { cache: 'no-store', credentials: 'omit' },
    });

    await h.runNext();
    expect(h.events).toEqual(['connected']);
    expect(h.scheduled).toHaveLength(0);
  });

  it('stops for good on a 404 and reports the link gone', async () => {
    const h = harness([answer(404, { message: 'This link is not valid.' })]);
    await h.runNext();
    expect(h.events).toEqual(['gone']);
    expect(h.scheduled).toHaveLength(0);
  });

  it('keeps asking through network errors and server errors', async () => {
    const h = harness([new Error('offline'), answer(503), answer(200, { status: 'connected' })]);
    await h.runNext();
    await h.runNext();
    expect(h.events).toEqual([]);
    await h.runNext();
    expect(h.events).toEqual(['connected']);
  });

  it('stops when told to', async () => {
    const h = harness([answer(200, { status: 'pending' })]);
    h.poller.stop();
    await h.runNext();
    expect(h.requested).toHaveLength(0);
  });
});
