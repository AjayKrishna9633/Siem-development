/* global document, navigator, fetch, setTimeout, clearTimeout */
// SIEMple enrollment page. Everything works without this file (every download is a plain link);
// it only adds OS and processor detection, the switches, copy buttons and the live status.
// No network calls except to this page's own /status endpoint.

export const POLL_INTERVAL_MS = 5000;
export const USED_MESSAGE = 'Script downloaded, waiting for the agent to connect.';
export const CONNECTED_MESSAGE = 'Connected. The agent is reporting to SIEMple.';
export const EXPIRED_MESSAGE =
  'This link has expired or was revoked. Ask your admin for a new one.';

const OS_VALUES = ['windows', 'linux-deb', 'linux-rpm'];
const ARCH_VALUES = ['x86_64', 'arm64'];

// A guess from the browser's user agent; the person can always switch. Phones and Macs keep the
// OS the admin chose when making the link.
export const detectOs = (userAgent, fallback) => {
  const ua = userAgent || '';
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return fallback;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Fedora|Red Hat|CentOS|Rocky|AlmaLinux/i.test(ua)) return 'linux-rpm';
  if (/Linux|X11|Ubuntu|Debian/i.test(ua)) return 'linux-deb';
  return fallback;
};

export const detectArch = (userAgent, fallback) => {
  const ua = userAgent || '';
  if (/aarch64|arm64|armv8/i.test(ua)) return 'arm64';
  if (/x86_64|x64|amd64|Win64|WOW64/i.test(ua)) return 'x86_64';
  return fallback;
};

// Asks /status every few seconds until the agent connects or the link is gone (404). Network
// errors and other answers just mean "ask again later".
export const startStatusPolling = ({
  url,
  onConnected,
  onGone,
  fetchFn = fetch,
  schedule = setTimeout,
  cancel = clearTimeout,
  intervalMs = POLL_INTERVAL_MS,
}) => {
  let stopped = false;
  let timer = null;
  const stop = () => {
    stopped = true;
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const next = () => {
    if (!stopped) timer = schedule(tick, intervalMs);
  };
  const tick = async () => {
    timer = null;
    if (stopped) return;
    let res;
    try {
      res = await fetchFn(url, { cache: 'no-store', credentials: 'omit' });
    } catch {
      next();
      return;
    }
    if (res.status === 404) {
      stop();
      onGone();
      return;
    }
    if (res.ok) {
      const body = await res.json().catch(() => null);
      if (body && body.status === 'connected') {
        stop();
        onConnected();
        return;
      }
    }
    next();
  };
  next();
  return { stop, tick };
};

const setStatus = (doc, text, state) => {
  const status = doc.getElementById('status');
  if (!status) return;
  status.textContent = text;
  status.className = `status status-${state}`;
};

const hide = (element) => {
  if (element) element.hidden = true;
};

const init = (doc, nav) => {
  const main = doc.querySelector('main[data-status-url]');
  if (!main) return;
  const install = doc.getElementById('install');

  if (install) {
    const osButtons = [...doc.querySelectorAll('.os-switch button[data-os]')];
    const archButtons = [...doc.querySelectorAll('.arch-switch button[data-arch]')];
    const archSwitch = doc.querySelector('.arch-switch');
    let arch = detectArch(nav.userAgent, main.dataset.defaultArch);
    if (!ARCH_VALUES.includes(arch)) arch = 'x86_64';

    const showArch = () => {
      for (const button of archButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.arch === arch));
      }
      for (const element of doc.querySelectorAll('.os [data-arch]')) {
        element.hidden = element.dataset.arch !== arch;
        element.classList.remove('secondary');
      }
    };
    const showOs = (os) => {
      for (const section of doc.querySelectorAll('section.os')) {
        section.hidden = section.dataset.os !== os;
      }
      for (const button of osButtons) {
        button.setAttribute('aria-pressed', String(button.dataset.os === os));
      }
      if (archSwitch) archSwitch.hidden = os === 'windows';
    };

    let os = detectOs(nav.userAgent, main.dataset.defaultOs);
    if (!OS_VALUES.includes(os)) os = 'windows';
    doc.querySelector('.os-switch').hidden = false;
    for (const button of osButtons)
      button.addEventListener('click', () => showOs(button.dataset.os));
    for (const button of archButtons) {
      button.addEventListener('click', () => {
        arch = button.dataset.arch;
        showArch();
      });
    }
    showArch();
    showOs(os);

    // The script can be taken once: after a download, say so instead of offering it again.
    for (const link of doc.querySelectorAll('#install a[download]')) {
      link.addEventListener('click', () => {
        setTimeout(() => {
          hide(install);
          setStatus(doc, USED_MESSAGE, 'used');
          const lost = doc.getElementById('lost-file');
          if (lost) lost.hidden = false;
        }, 500);
      });
    }

    for (const button of doc.querySelectorAll('button.copy[data-copy]')) {
      const source = doc.getElementById(button.dataset.copy);
      if (!source) continue;
      button.hidden = false;
      button.addEventListener('click', async () => {
        try {
          await nav.clipboard.writeText(source.textContent);
          button.textContent = 'Copied';
        } catch {
          // No clipboard access (plain HTTP, old browser): select it for Ctrl+C instead.
          const range = doc.createRange();
          range.selectNodeContents(source);
          const selection = doc.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          button.textContent = 'Press Ctrl+C';
        }
      });
    }
  }

  if (main.dataset.state === 'connected') return;
  startStatusPolling({
    url: main.dataset.statusUrl,
    onConnected: () => {
      hide(install);
      hide(doc.getElementById('lost-file'));
      hide(doc.querySelector('.device-hint'));
      setStatus(doc, CONNECTED_MESSAGE, 'connected');
    },
    onGone: () => {
      for (const element of main.children) element.hidden = element.id !== 'expired';
      const expired = doc.getElementById('expired');
      if (expired) expired.hidden = false;
    },
  });
};

if (typeof document !== 'undefined') init(document, navigator);
