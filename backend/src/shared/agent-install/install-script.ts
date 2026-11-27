import { AgentArch, AgentOs } from '../../domain/enums/AgentOs.ts';
import {
  isAgentIdentifier,
  isHostAddress,
  normalizeVersion,
} from '../../domain/policies/agent-identifier.policy.ts';
import {
  WAZUH_EVENTS_PORT,
  WAZUH_LINUX_INSTALL_DIR,
  WAZUH_LINUX_SERVICE,
  WAZUH_WINDOWS_INSTALL_DIR,
  WAZUH_WINDOWS_SERVICE,
  wazuhPackageUrl,
} from './wazuh-packages.ts';
import { quoteBash, quotePowerShell } from './shell-quote.ts';

// Installs the agent for a pre-registered key. It never enrolls through authd and never needs the
// enrollment password: the package is installed with only WAZUH_MANAGER (which sets the server
// address and enrolls nothing), enrollment is switched off in ossec.conf, the client.keys line
// Wazuh issued for this agent is written straight into client.keys (never passed as a command-line
// argument, where other users could see it), and the agent is restarted. Checked against a real
// Wazuh 4.14.10 manager with the deb and rpm packages; the Windows steps follow the 4.14 docs.

export interface IInstallScriptInput {
  os: AgentOs;
  arch: AgentArch | null;
  agentVersion: string;
  managerAddress: string;
  agentName: string;
  // The agent's client key as Wazuh returned it (base64 of the client.keys line).
  agentKey: string;
}

export interface IInstallScript {
  fileName: string;
  contentType: string;
  body: string;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
// A client.keys line: "<id> <name> <ip or any> <64 hex>", as checked against a real manager.
const CLIENT_KEY_LINE =
  /^(\d{3,}) ([A-Za-z0-9._-]{1,64}) (any|[0-9A-Fa-f.:/]{1,64}) ([0-9a-f]{64})$/;
const INSTALLED = 'Wazuh agent installed and started.';
const ALREADY_INSTALLED =
  'A Wazuh agent is already installed on this computer. Uninstall it first, then run this script again.';
const DISABLE_ENROLLMENT = '<enrollment><enabled>no</enabled></enrollment>';
const ADMINISTRATORS_SID = 'S-1-5-32-544';

// Rejects instead of cleaning: these values end up inside a script someone runs as root.
const validate = (input: IInstallScriptInput) => {
  const agentVersion = normalizeVersion(input.agentVersion);
  if (agentVersion === null) throw new Error('Invalid agent version');
  if (!isHostAddress(input.managerAddress)) throw new Error('Invalid manager address');
  if (!isAgentIdentifier(input.agentName)) throw new Error('Invalid agent name');
  if (!BASE64.test(input.agentKey)) throw new Error('Invalid agent key');
  const clientKey = Buffer.from(input.agentKey, 'base64').toString('utf8');
  const match = CLIENT_KEY_LINE.exec(clientKey);
  if (!match || match[2] !== input.agentName) throw new Error('Invalid agent key');
  return { ...input, agentVersion, clientKey, arch: input.arch ?? AgentArch.X86_64 };
};

type Valid = ReturnType<typeof validate>;

const header = (comment: string, v: Valid, run: string): string[] => [
  `${comment} SIEMple: installs the Wazuh agent "${v.agentName}" and connects it to ${v.managerAddress}.`,
  `${comment} This file contains the agent's key. Run it once; it deletes itself when it finishes.`,
  `${comment} ${run}`,
];

const renderLinux = (
  os: AgentOs.LINUX_DEB | AgentOs.LINUX_RPM,
  v: Valid,
  fileName: string,
): string => {
  const install =
    os === AgentOs.LINUX_DEB
      ? [
          'apt-get update -qq',
          'WAZUH_MANAGER="$MANAGER" DEBIAN_FRONTEND=noninteractive apt-get install -y "$TMP/wazuh-agent.deb"',
        ]
      : [
          'if command -v dnf > /dev/null 2>&1; then',
          '  WAZUH_MANAGER="$MANAGER" dnf install -y "$TMP/wazuh-agent.rpm"',
          'else',
          '  WAZUH_MANAGER="$MANAGER" yum install -y "$TMP/wazuh-agent.rpm"',
          'fi',
        ];
  const suffix = os === AgentOs.LINUX_DEB ? 'deb' : 'rpm';
  const keys = `${WAZUH_LINUX_INSTALL_DIR}/etc/client.keys`;
  return [
    '#!/bin/sh',
    ...header('#', v, `Run it as root: sudo bash ${fileName}`),
    'set -eu',
    '',
    `MANAGER=${quoteBash(v.managerAddress)}`,
    `CLIENT_KEY=${quoteBash(v.clientKey)}`,
    `PACKAGE_URL=${quoteBash(wazuhPackageUrl(os, v.agentVersion, v.arch))}`,
    '',
    'if [ "$(id -u)" -ne 0 ]; then',
    `  echo "Run this script as root: sudo bash ${fileName}" >&2`,
    '  exit 1',
    'fi',
    `if [ -e ${quoteBash(WAZUH_LINUX_INSTALL_DIR)} ]; then`,
    `  echo ${quoteBash(ALREADY_INSTALLED)} >&2`,
    '  exit 1',
    'fi',
    'for tool in curl systemctl; do',
    '  if ! command -v "$tool" > /dev/null 2>&1; then',
    '    echo "This script needs $tool." >&2',
    '    exit 1',
    '  fi',
    'done',
    '',
    'TMP="$(mktemp -d)"',
    'trap \'rm -rf "$TMP"\' EXIT',
    `echo "Downloading the Wazuh agent ${v.agentVersion}..."`,
    `curl -fsSL --proto '=https' -o "$TMP/wazuh-agent.${suffix}" "$PACKAGE_URL"`,
    '',
    '# Only WAZUH_MANAGER: the package sets the server address and enrolls nothing.',
    ...install,
    '',
    '# Never enroll through authd: this agent already has its key.',
    `sed -i '0,/<client>/s//<client>\\n    ${DISABLE_ENROLLMENT.replaceAll('/', '\\/')}/' ${WAZUH_LINUX_INSTALL_DIR}/etc/ossec.conf`,
    '',
    '# The key goes straight into client.keys (printf is a shell builtin, so it never shows up in',
    '# the process list), created readable by root and the wazuh group only.',
    `( umask 077 && printf '%s\\n' "$CLIENT_KEY" > ${keys} )`,
    `chown root:wazuh ${keys}`,
    `chmod 640 ${keys}`,
    '',
    'systemctl daemon-reload',
    `systemctl enable ${WAZUH_LINUX_SERVICE}`,
    `systemctl restart ${WAZUH_LINUX_SERVICE}`,
    '',
    '# Only delete this file itself (also a browser-renamed copy such as "siemple-agent (1).sh"),',
    '# never whatever $0 happens to be under curl | sh.',
    'case "$0" in *siemple-agent*.sh) rm -f -- "$0" ;; esac',
    `echo "${INSTALLED} It connects to $MANAGER on port ${WAZUH_EVENTS_PORT}."`,
    '',
  ].join('\n');
};

const renderWindows = (v: Valid, fileName: string): string => {
  const installDir = quotePowerShell(WAZUH_WINDOWS_INSTALL_DIR);
  const service = quotePowerShell(WAZUH_WINDOWS_SERVICE);
  return [
    ...header(
      '#',
      v,
      `Run it in PowerShell opened as Administrator: powershell -ExecutionPolicy Bypass -File .\\${fileName}`,
    ),
    '#Requires -RunAsAdministrator',
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    '[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12',
    '',
    `$Manager = ${quotePowerShell(v.managerAddress)}`,
    `$ClientKey = ${quotePowerShell(v.clientKey)}`,
    `$PackageUrl = ${quotePowerShell(wazuhPackageUrl(AgentOs.WINDOWS, v.agentVersion, v.arch))}`,
    `$InstallDir = ${installDir}`,
    '',
    `if ((Get-Service -Name ${service} -ErrorAction SilentlyContinue) -or (Test-Path -LiteralPath $InstallDir)) {`,
    `  throw ${quotePowerShell(ALREADY_INSTALLED)}`,
    '}',
    '',
    "$msi = Join-Path $env:TEMP ('wazuh-agent-' + [guid]::NewGuid() + '.msi')",
    'try {',
    `  Write-Host ${quotePowerShell(`Downloading the Wazuh agent ${v.agentVersion}...`)}`,
    '  Invoke-WebRequest -Uri $PackageUrl -OutFile $msi -UseBasicParsing',
    '  # Only WAZUH_MANAGER: the installer sets the server address and enrolls nothing.',
    '  $msiArgs = \'/i "{0}" /q WAZUH_MANAGER={1}\' -f $msi, $Manager',
    "  $install = Start-Process -FilePath 'msiexec.exe' -ArgumentList $msiArgs -Wait -PassThru",
    "  if ($install.ExitCode -ne 0) { throw ('The Wazuh agent installer failed with exit code {0}.' -f $install.ExitCode) }",
    '} finally {',
    '  Remove-Item -LiteralPath $msi -Force -ErrorAction SilentlyContinue',
    '}',
    '',
    '# Never enroll through authd: this agent already has its key.',
    "$conf = Join-Path $InstallDir 'ossec.conf'",
    '$text = [IO.File]::ReadAllText($conf)',
    `$text = ([regex]'<client>').Replace($text, "<client>\`r\`n    ${DISABLE_ENROLLMENT}", 1)`,
    '[IO.File]::WriteAllText($conf, $text)',
    '',
    '# The key goes straight into client.keys, never onto a command line. Only Administrators may',
    '# read it (the agent service runs as LocalSystem, which is a member of Administrators).',
    "$keys = Join-Path $InstallDir 'client.keys'",
    '[IO.File]::WriteAllText($keys, $ClientKey + "`n", [Text.Encoding]::ASCII)',
    `$admins = New-Object System.Security.Principal.SecurityIdentifier(${quotePowerShell(ADMINISTRATORS_SID)})`,
    '$acl = New-Object System.Security.AccessControl.FileSecurity',
    '$acl.SetAccessRuleProtection($true, $false)',
    '$acl.SetOwner($admins)',
    "$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($admins, 'FullControl', 'Allow')))",
    'Set-Acl -LiteralPath $keys -AclObject $acl',
    '',
    `Restart-Service -Name ${service}`,
    'Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue',
    `Write-Host ("${INSTALLED} It connects to {0} on port ${WAZUH_EVENTS_PORT}." -f $Manager)`,
    '',
  ].join('\r\n');
};

// The same name for every agent, so the run steps on the enrollment page can be exact.
export const installScriptFileName = (os: AgentOs): string =>
  `siemple-agent.${os === AgentOs.WINDOWS ? 'ps1' : 'sh'}`;

export const buildInstallScript = (input: IInstallScriptInput): IInstallScript => {
  const v = validate(input);
  const fileName = installScriptFileName(v.os);
  if (v.os === AgentOs.WINDOWS) {
    return { fileName, contentType: 'text/plain; charset=utf-8', body: renderWindows(v, fileName) };
  }
  return {
    fileName,
    contentType: 'text/x-shellscript; charset=utf-8',
    body: renderLinux(v.os, v, fileName),
  };
};
