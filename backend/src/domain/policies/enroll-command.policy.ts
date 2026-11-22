import { AppError } from '../errors/AppError.ts';
import { AppErrorCode } from '../enums/AppErrorCode.ts';
import { ErrorMessage } from '../enums/ErrorMessage.ts';
import { AgentArch, AgentOs } from '../enums/AgentOs.ts';
import {
  WAZUH_AGENT_PORTS,
  WAZUH_LINUX_INSTALL_DIR,
  WAZUH_LINUX_SERVICE,
  WAZUH_WINDOWS_INSTALL_DIR,
  WAZUH_WINDOWS_SERVICE,
  wazuhPackageFileName,
  wazuhPackageUrl,
} from '../constants/wazuh-packages.ts';
import {
  isAgentIdentifier,
  isEnrollmentPassword,
  isHostAddress,
  normalizeVersion,
} from './agent-identifier.policy.ts';

export interface IEnrollCommandInput {
  managerAddress: string;
  enrollmentPassword: string;
  agentVersion: string;
  group: string;
  agentName?: string;
  arch?: AgentArch;
}

interface IValidInput {
  managerAddress: string;
  agentVersion: string;
  group: string;
  agentName: string | undefined;
  arch: AgentArch;
}

export interface IEnrollCommand {
  command: string;
  maskedCommand: string;
}

export const ENROLLMENT_SECRET_MASK = '********';

const INSTALLED_MESSAGE = 'Wazuh agent installed and started';

export const quotePowerShell = (value: string): string => `'${value.replaceAll("'", "''")}'`;

export const quoteBash = (value: string): string => `'${value.replaceAll("'", `'\\''`)}'`;

const invalid = (message: ErrorMessage): AppError =>
  new AppError(AppErrorCode.VALIDATION_ERROR, message);

// Rejects, never cleans: a value that doesn't match is refused as a whole.
const validate = (input: IEnrollCommandInput): IValidInput => {
  if (!isAgentIdentifier(input.group)) throw invalid(ErrorMessage.AGENT_GROUP_INVALID);
  if (input.agentName !== undefined && !isAgentIdentifier(input.agentName)) {
    throw invalid(ErrorMessage.AGENT_NAME_INVALID);
  }
  if (!isHostAddress(input.managerAddress)) throw invalid(ErrorMessage.WAZUH_ADDRESS_INVALID);
  if (!isEnrollmentPassword(input.enrollmentPassword)) {
    throw invalid(ErrorMessage.ENROLLMENT_PASSWORD_INVALID);
  }
  const agentVersion = normalizeVersion(input.agentVersion);
  if (agentVersion === null) throw invalid(ErrorMessage.AGENT_VERSION_INVALID);
  return {
    managerAddress: input.managerAddress,
    agentVersion,
    group: input.group,
    agentName: input.agentName,
    arch: input.arch ?? AgentArch.X86_64,
  };
};

const renderWindows = (v: IValidInput, password: string): string => {
  const url = wazuhPackageUrl(AgentOs.WINDOWS, v.agentVersion, v.arch);
  const file = wazuhPackageFileName(AgentOs.WINDOWS, v.agentVersion, v.arch);
  const name = v.agentName === undefined ? '$env:COMPUTERNAME' : quotePowerShell(v.agentName);
  const address = quotePowerShell(v.managerAddress);
  const service = quotePowerShell(WAZUH_WINDOWS_SERVICE);
  return [
    '& {',
    "  $ErrorActionPreference = 'Stop'",
    "  $ProgressPreference = 'SilentlyContinue'",
    '  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12',
    `  if ((Get-Service -Name ${service} -ErrorAction SilentlyContinue) -or (Test-Path -LiteralPath ${quotePowerShell(WAZUH_WINDOWS_INSTALL_DIR)})) {`,
    "    throw 'A Wazuh agent is already installed on this computer. Uninstall it first, then run this command again.'",
    '  }',
    `  $msi = Join-Path $env:TEMP ${quotePowerShell(file)}`,
    '  try {',
    `    Invoke-WebRequest -Uri ${quotePowerShell(url)} -OutFile $msi -UseBasicParsing`,
    `    $msiArgs = '/i "{0}" /q WAZUH_MANAGER={1} WAZUH_REGISTRATION_SERVER={1} WAZUH_REGISTRATION_PASSWORD={2} WAZUH_AGENT_GROUP={3} WAZUH_AGENT_NAME={4}' -f $msi, ${address}, ${password}, ${quotePowerShell(v.group)}, ${name}`,
    "    $install = Start-Process -FilePath 'msiexec.exe' -ArgumentList $msiArgs -Wait -PassThru",
    "    if ($install.ExitCode -ne 0) { throw ('The Wazuh agent installer failed with exit code {0}.' -f $install.ExitCode) }",
    `    Start-Service -Name ${service}`,
    `    Write-Host ${quotePowerShell(INSTALLED_MESSAGE)}`,
    '  } finally {',
    '    Remove-Item -LiteralPath $msi -Force -ErrorAction SilentlyContinue',
    '  }',
    '}',
  ].join('\n');
};

// The quoted heredoc stops the outer shell expanding anything, and the { } group makes bash read
// the whole script before running it, so no command can swallow the rest of it from stdin.
const renderLinux = (
  os: AgentOs.LINUX_DEB | AgentOs.LINUX_RPM,
  v: IValidInput,
  password: string,
): string => {
  const url = wazuhPackageUrl(os, v.agentVersion, v.arch);
  const suffix = os === AgentOs.LINUX_DEB ? '.deb' : '.rpm';
  // The package manager installs the downloaded file and pulls in its dependencies, which a
  // bare dpkg -i / rpm -ihv would not.
  const install =
    os === AgentOs.LINUX_DEB
      ? ['apt-get update -qq', 'DEBIAN_FRONTEND=noninteractive apt-get install -y "$pkg"']
      : [
          'if command -v dnf >/dev/null 2>&1; then dnf install -y "$pkg"; else yum install -y "$pkg"; fi',
        ];
  const name = v.agentName === undefined ? '"$(hostname)"' : quoteBash(v.agentName);
  const address = quoteBash(v.managerAddress);
  return [
    "sudo bash -euo pipefail <<'WAZUH_ENROLL'",
    '{',
    `if [ -e ${quoteBash(WAZUH_LINUX_INSTALL_DIR)} ]; then`,
    `  echo 'A Wazuh agent is already installed (${WAZUH_LINUX_INSTALL_DIR} exists). Uninstall it first, then run this command again.' >&2`,
    '  exit 1',
    'fi',
    `pkg="$(mktemp --suffix=${suffix})"`,
    `trap 'rm -f "$pkg"' EXIT`,
    `curl -fsSL -o "$pkg" ${quoteBash(url)}`,
    `export WAZUH_MANAGER=${address} WAZUH_REGISTRATION_SERVER=${address} WAZUH_REGISTRATION_PASSWORD=${password} WAZUH_AGENT_GROUP=${quoteBash(v.group)} WAZUH_AGENT_NAME=${name}`,
    ...install,
    'systemctl daemon-reload',
    `systemctl enable --now ${WAZUH_LINUX_SERVICE}`,
    `echo ${quoteBash(INSTALLED_MESSAGE)}`,
    '}',
    'WAZUH_ENROLL',
  ].join('\n');
};

export const buildWindowsEnrollCommand = (input: IEnrollCommandInput): string =>
  renderWindows(validate(input), quotePowerShell(input.enrollmentPassword));

export const buildDebEnrollCommand = (input: IEnrollCommandInput): string =>
  renderLinux(AgentOs.LINUX_DEB, validate(input), quoteBash(input.enrollmentPassword));

export const buildRpmEnrollCommand = (input: IEnrollCommandInput): string =>
  renderLinux(AgentOs.LINUX_RPM, validate(input), quoteBash(input.enrollmentPassword));

// The masked copy is rendered with the mask in place of the password, never by search-and-replace.
export const buildEnrollCommand = (os: AgentOs, input: IEnrollCommandInput): IEnrollCommand => {
  const v = validate(input);
  if (os === AgentOs.WINDOWS) {
    return {
      command: renderWindows(v, quotePowerShell(input.enrollmentPassword)),
      maskedCommand: renderWindows(v, quotePowerShell(ENROLLMENT_SECRET_MASK)),
    };
  }
  return {
    command: renderLinux(os, v, quoteBash(input.enrollmentPassword)),
    maskedCommand: renderLinux(os, v, quoteBash(ENROLLMENT_SECRET_MASK)),
  };
};

export const buildConnectivityCheck = (os: AgentOs, managerAddress: string): string => {
  const [connection, enrollment] = WAZUH_AGENT_PORTS;
  if (os === AgentOs.WINDOWS) {
    const address = quotePowerShell(managerAddress);
    return [
      `Test-NetConnection -ComputerName ${address} -Port ${connection}`,
      `Test-NetConnection -ComputerName ${address} -Port ${enrollment}`,
    ].join('\n');
  }
  const address = quoteBash(managerAddress);
  return `nc -zv ${address} ${connection} && nc -zv ${address} ${enrollment}`;
};

export const enrollRequirements = (os: AgentOs, managerAddress: string): string[] => {
  const ports = `TCP ${WAZUH_AGENT_PORTS.join(' and ')} on ${managerAddress} reachable from this machine`;
  if (os === AgentOs.WINDOWS) {
    return [
      'Run in Windows PowerShell as Administrator',
      ports,
      `No Wazuh agent installed (uninstall any old agent first; ${WAZUH_WINDOWS_INSTALL_DIR} must not exist)`,
      'Internet access to packages.wazuh.com',
    ];
  }
  return [
    'Run in a terminal with sudo (or as root)',
    ports,
    `No Wazuh agent installed (uninstall any old agent first; ${WAZUH_LINUX_INSTALL_DIR} must not exist)`,
    'curl and systemd available, and internet access to packages.wazuh.com',
  ];
};
