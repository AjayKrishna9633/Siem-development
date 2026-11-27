import { AgentArch, AgentOs } from '../domain/enums/AgentOs.ts';
import {
  buildOneLiner,
  NO_TLS_PINNING,
  type IOneLinerTls,
} from '../shared/agent-install/one-liner.ts';
import { installScriptFileName } from '../shared/agent-install/install-script.ts';

// The enrollment page: plain HTML that works without JavaScript (every download is a link), with
// /e/assets/enroll.js adding OS detection, the switch, copy buttons and the live status. No inline
// script or style, nothing from another origin, no login, no dashboard links, no organisation data.

export type PageState = 'fresh' | 'used' | 'connected';

export interface IPageInput {
  token: string;
  agentName: string | null;
  state: PageState;
  os: AgentOs;
  arch: AgentArch | null;
  // Absolute https:// base of this service (for the copyable commands); null hides them.
  publicUrl: string | null;
  tls?: IOneLinerTls;
}

export const EXPIRED_MESSAGE =
  'This link has expired or was revoked. Ask your admin for a new one.';
export const USED_MESSAGE = 'Script downloaded, waiting for the agent to connect.';
export const CONNECTED_MESSAGE = 'Connected. The agent is reporting to SIEMple.';
export const WAITING_MESSAGE = 'Waiting for the script to run.';
export const DEVICE_HINT = "Open this link on the computer you're installing the agent on.";
export const LOST_FILE_HINT = 'Lost the file? Ask your admin for a new link.';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const ARCH_LABELS: Readonly<Record<AgentArch, string>> = {
  [AgentArch.X86_64]: 'x86_64 (Intel or AMD)',
  [AgentArch.ARM64]: 'arm64 (ARM)',
};

const OS_LABELS: Readonly<Record<AgentOs, string>> = {
  [AgentOs.WINDOWS]: 'Windows',
  [AgentOs.LINUX_DEB]: 'Debian / Ubuntu',
  [AgentOs.LINUX_RPM]: 'RHEL / Alma / Rocky',
};

const scriptPath = (token: string, os: AgentOs, arch?: AgentArch): string =>
  `/e/${encodeURIComponent(token)}/script?os=${os}${arch ? `&arch=${arch}` : ''}`;

const commandBlock = (id: string, command: string): string =>
  [
    '<div class="command">',
    `<pre><code id="${id}">${escapeHtml(command)}</code></pre>`,
    `<button type="button" class="copy" data-copy="${id}" hidden>Copy</button>`,
    '</div>',
  ].join('');

const fallback = (input: IPageInput, os: AgentOs, arch?: AgentArch): string => {
  if (!input.publicUrl) return '';
  const url = `${input.publicUrl.replace(/\/+$/, '')}${scriptPath(input.token, os, arch)}`;
  const id = `cmd-${os}${arch ? `-${arch}` : ''}`;
  return commandBlock(id, buildOneLiner(os, url, input.tls ?? NO_TLS_PINNING));
};

const windowsSection = (input: IPageInput): string => {
  const file = installScriptFileName(AgentOs.WINDOWS);
  return [
    `<section class="os" id="os-${AgentOs.WINDOWS}" data-os="${AgentOs.WINDOWS}">`,
    `<h2>${OS_LABELS[AgentOs.WINDOWS]}</h2>`,
    `<p><a class="button" href="${scriptPath(input.token, AgentOs.WINDOWS)}" download="${file}">Download ${file}</a></p>`,
    '<ol class="steps">',
    '<li>Open PowerShell as Administrator.</li>',
    `<li>Go to the folder with the file, then run:${commandBlock('run-windows', `powershell -ExecutionPolicy Bypass -File .\\${file}`)}</li>`,
    '</ol>',
    input.publicUrl
      ? `<details class="fallback"><summary>Or paste one command into PowerShell (as Administrator)</summary>${fallback(input, AgentOs.WINDOWS)}</details>`
      : '',
    '</section>',
  ].join('');
};

const linuxSection = (input: IPageInput, os: AgentOs.LINUX_DEB | AgentOs.LINUX_RPM): string => {
  const file = installScriptFileName(os);
  const preferred = input.arch ?? AgentArch.X86_64;
  const archs = [preferred, ...Object.values(AgentArch).filter((a) => a !== preferred)];
  return [
    `<section class="os" id="os-${os}" data-os="${os}">`,
    `<h2>${OS_LABELS[os]}</h2>`,
    '<div class="downloads" role="group" aria-label="Processor">',
    ...archs.map(
      (arch, i) =>
        `<a class="button${i === 0 ? '' : ' secondary'}" data-arch="${arch}" href="${scriptPath(input.token, os, arch)}" download="${file}">Download for ${ARCH_LABELS[arch]}</a>`,
    ),
    '</div>',
    '<p class="hint">Not sure? Run <code>uname -m</code>: <code>x86_64</code> or <code>aarch64</code> (arm64).</p>',
    '<ol class="steps">',
    '<li>Open a terminal in the folder with the file.</li>',
    `<li>Run:${commandBlock(`run-${os}`, `sudo bash ${file}`)}</li>`,
    '</ol>',
    input.publicUrl
      ? [
          '<details class="fallback"><summary>Or paste one command into a terminal</summary>',
          ...archs.map(
            (arch) =>
              `<div class="fallback-arch" data-arch="${arch}"><p class="label">${ARCH_LABELS[arch]}</p>${fallback(input, os, arch)}</div>`,
          ),
          '</details>',
        ].join('')
      : '',
    '</section>',
  ].join('');
};

const STATUS_TEXT: Readonly<Record<PageState, string>> = {
  fresh: WAITING_MESSAGE,
  used: USED_MESSAGE,
  connected: CONNECTED_MESSAGE,
};

export const renderEnrollPage = (input: IPageInput): string => {
  const statusUrl = `/e/${encodeURIComponent(input.token)}/status`;
  const body = [
    `<main class="card" data-state="${input.state}" data-status-url="${statusUrl}" data-default-os="${input.os}" data-default-arch="${input.arch ?? AgentArch.X86_64}">`,
    '<h1>Install the SIEMple agent</h1>',
    input.agentName
      ? `<p class="agent">Agent <strong>${escapeHtml(input.agentName)}</strong></p>`
      : '',
    input.state === 'connected' ? '' : `<p class="device-hint">${escapeHtml(DEVICE_HINT)}</p>`,
    `<p id="status" class="status status-${input.state}" role="status" aria-live="polite">${STATUS_TEXT[input.state]}</p>`,
    // Shown once the script is taken (also by enroll.js right after a download in this tab).
    `<p id="lost-file" class="hint"${input.state === 'used' ? '' : ' hidden'}>${LOST_FILE_HINT}</p>`,
    input.state === 'fresh'
      ? [
          '<div id="install">',
          '<nav class="os-switch" aria-label="Operating system" hidden>',
          ...Object.values(AgentOs).map(
            (os) =>
              `<button type="button" data-os="${os}" aria-pressed="false">${OS_LABELS[os]}</button>`,
          ),
          '</nav>',
          '<div class="arch-switch" role="group" aria-label="Processor" hidden>',
          ...Object.values(AgentArch).map(
            (arch) =>
              `<button type="button" data-arch="${arch}" aria-pressed="false">${ARCH_LABELS[arch]}</button>`,
          ),
          '</div>',
          windowsSection(input),
          linuxSection(input, AgentOs.LINUX_DEB),
          linuxSection(input, AgentOs.LINUX_RPM),
          '<p class="once">The script can be downloaded once. Use either the download or the command, not both.</p>',
          '</div>',
        ].join('')
      : '',
    `<p id="expired" class="status status-expired" hidden>${EXPIRED_MESSAGE}</p>`,
    '</main>',
  ].join('');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    '<meta name="robots" content="noindex, nofollow">',
    '<title>Install the SIEMple agent</title>',
    '<link rel="stylesheet" href="/e/assets/enroll.css">',
    '<script type="module" src="/e/assets/enroll.js"></script>',
    '</head>',
    `<body>${body}</body>`,
    '</html>',
  ].join('\n');
};
