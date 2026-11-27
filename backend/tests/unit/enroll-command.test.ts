import { describe, expect, it } from 'vitest';
import {
  ENROLLMENT_SECRET_MASK,
  buildConnectivityCheck,
  buildDebEnrollCommand,
  buildEnrollCommand,
  buildRpmEnrollCommand,
  buildWindowsEnrollCommand,
  enrollRequirements,
  quoteBash,
  quotePowerShell,
  type IEnrollCommandInput,
} from '../../src/shared/agent-install/enroll-command.ts';
import { AgentArch, AgentOs } from '../../src/domain/enums/AgentOs.ts';
import { wazuhPackageUrl } from '../../src/shared/agent-install/wazuh-packages.ts';
import { AppError } from '../../src/domain/errors/AppError.ts';
import { AppErrorCode } from '../../src/domain/enums/AppErrorCode.ts';

const PASSWORD = 'Enr0ll-Secret_pass.2026:x';

const input = (overrides: Partial<IEnrollCommandInput> = {}): IEnrollCommandInput => ({
  managerAddress: '192.168.1.20',
  enrollmentPassword: PASSWORD,
  agentVersion: '4.14.10',
  group: 'default',
  ...overrides,
});

const WINDOWS_EXPECTED = [
  '& {',
  "  $ErrorActionPreference = 'Stop'",
  "  $ProgressPreference = 'SilentlyContinue'",
  '  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12',
  "  if ((Get-Service -Name 'WazuhSvc' -ErrorAction SilentlyContinue) -or (Test-Path -LiteralPath 'C:\\Program Files (x86)\\ossec-agent')) {",
  "    throw 'A Wazuh agent is already installed on this computer. Uninstall it first, then run this command again.'",
  '  }',
  "  $msi = Join-Path $env:TEMP 'wazuh-agent-4.14.10-1.msi'",
  '  try {',
  "    Invoke-WebRequest -Uri 'https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.10-1.msi' -OutFile $msi -UseBasicParsing",
  `    $msiArgs = '/i "{0}" /q WAZUH_MANAGER={1} WAZUH_REGISTRATION_SERVER={1} WAZUH_REGISTRATION_PASSWORD={2} WAZUH_AGENT_GROUP={3} WAZUH_AGENT_NAME={4}' -f $msi, '192.168.1.20', '${PASSWORD}', 'windows-servers', 'web-01'`,
  "    $install = Start-Process -FilePath 'msiexec.exe' -ArgumentList $msiArgs -Wait -PassThru",
  "    if ($install.ExitCode -ne 0) { throw ('The Wazuh agent installer failed with exit code {0}.' -f $install.ExitCode) }",
  "    Start-Service -Name 'WazuhSvc'",
  "    Write-Host 'Wazuh agent installed and started'",
  '  } finally {',
  '    Remove-Item -LiteralPath $msi -Force -ErrorAction SilentlyContinue',
  '  }',
  '}',
].join('\n');

const linuxExpected = (suffix: string, url: string, install: string[], name: string) =>
  [
    "sudo bash -euo pipefail <<'WAZUH_ENROLL'",
    '{',
    "if [ -e '/var/ossec' ]; then",
    "  echo 'A Wazuh agent is already installed (/var/ossec exists). Uninstall it first, then run this command again.' >&2",
    '  exit 1',
    'fi',
    `pkg="$(mktemp --suffix=${suffix})"`,
    `trap 'rm -f "$pkg"' EXIT`,
    `curl -fsSL -o "$pkg" '${url}'`,
    `export WAZUH_MANAGER='siem.example.com' WAZUH_REGISTRATION_SERVER='siem.example.com' WAZUH_REGISTRATION_PASSWORD='${PASSWORD}' WAZUH_AGENT_GROUP='linux' WAZUH_AGENT_NAME=${name}`,
    ...install,
    'systemctl daemon-reload',
    'systemctl enable --now wazuh-agent',
    "echo 'Wazuh agent installed and started'",
    '}',
    'WAZUH_ENROLL',
  ].join('\n');

describe('package URLs', () => {
  it.each([
    [
      AgentOs.WINDOWS,
      AgentArch.X86_64,
      'https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.10-1.msi',
    ],
    [
      AgentOs.LINUX_DEB,
      AgentArch.X86_64,
      'https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.14.10-1_amd64.deb',
    ],
    [
      AgentOs.LINUX_DEB,
      AgentArch.ARM64,
      'https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.14.10-1_arm64.deb',
    ],
    [
      AgentOs.LINUX_RPM,
      AgentArch.X86_64,
      'https://packages.wazuh.com/4.x/yum/wazuh-agent-4.14.10-1.x86_64.rpm',
    ],
    [
      AgentOs.LINUX_RPM,
      AgentArch.ARM64,
      'https://packages.wazuh.com/4.x/yum/wazuh-agent-4.14.10-1.aarch64.rpm',
    ],
  ])('%s %s', (os, arch, url) => {
    expect(wazuhPackageUrl(os, '4.14.10', arch)).toBe(url);
  });
});

describe('Windows enroll command', () => {
  it('renders the exact PowerShell script', () => {
    expect(
      buildWindowsEnrollCommand(input({ group: 'windows-servers', agentName: 'web-01' })),
    ).toBe(WINDOWS_EXPECTED);
  });

  it('defaults the agent name to the computer name', () => {
    const command = buildWindowsEnrollCommand(input());
    expect(command).toContain("'default', $env:COMPUTERNAME\n");
  });

  it('nests no double-quoted strings', () => {
    const command = buildWindowsEnrollCommand(input({ agentName: 'web-01' }));
    const doubleQuoted = command.split('\n').filter((l) => /"[^"]*"/.test(l));
    expect(doubleQuoted).toEqual([expect.stringContaining(`'/i "{0}" /q`)]);
  });
});

describe('Linux enroll commands', () => {
  it('renders the exact DEB script (amd64)', () => {
    expect(
      buildDebEnrollCommand(
        input({ managerAddress: 'siem.example.com', group: 'linux', agentName: 'db-01' }),
      ),
    ).toBe(
      linuxExpected(
        '.deb',
        'https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_4.14.10-1_amd64.deb',
        ['apt-get update -qq', 'DEBIAN_FRONTEND=noninteractive apt-get install -y "$pkg"'],
        "'db-01'",
      ),
    );
  });

  it('renders the exact RPM script (aarch64), defaulting the name to the hostname', () => {
    expect(
      buildRpmEnrollCommand(
        input({ managerAddress: 'siem.example.com', group: 'linux', arch: AgentArch.ARM64 }),
      ),
    ).toBe(
      linuxExpected(
        '.rpm',
        'https://packages.wazuh.com/4.x/yum/wazuh-agent-4.14.10-1.aarch64.rpm',
        [
          'if command -v dnf >/dev/null 2>&1; then dnf install -y "$pkg"; else yum install -y "$pkg"; fi',
        ],
        '"$(hostname)"',
      ),
    );
  });

  it('uses the arm64 DEB and the x86_64 RPM for those architectures', () => {
    expect(buildDebEnrollCommand(input({ arch: AgentArch.ARM64 }))).toContain('_arm64.deb');
    expect(buildRpmEnrollCommand(input())).toContain('.x86_64.rpm');
  });

  it('installs with the package manager, so dependencies are pulled in', () => {
    expect(buildDebEnrollCommand(input())).not.toContain('dpkg -i');
    expect(buildRpmEnrollCommand(input())).not.toContain('rpm -ihv');
  });

  it('accepts an IPv6 manager address', () => {
    expect(buildDebEnrollCommand(input({ managerAddress: 'fd00::20' }))).toContain(
      "WAZUH_MANAGER='fd00::20'",
    );
  });
});

describe('quoting', () => {
  it('escapes single quotes for each shell', () => {
    expect(quotePowerShell("it's")).toBe("'it''s'");
    expect(quoteBash("it's")).toBe(`'it'\\''s'`);
    expect(quoteBash('$(id) `id` "x"')).toBe(`'$(id) \`id\` "x"'`);
  });
});

describe('masking', () => {
  it.each(Object.values(AgentOs))('%s: masks the password and keeps everything else', (os) => {
    const { command, maskedCommand } = buildEnrollCommand(os, input({ agentName: 'web-01' }));
    expect(command).toContain(PASSWORD);
    expect(maskedCommand).not.toContain(PASSWORD);
    expect(maskedCommand).toContain(ENROLLMENT_SECRET_MASK);
    expect(maskedCommand.replace(ENROLLMENT_SECRET_MASK, PASSWORD)).toBe(command);
  });
});

describe('input validation', () => {
  const UNSAFE = [
    'a;b',
    '$(id)',
    'a)b',
    'a(b',
    '`id`',
    'a"b',
    "a'b",
    'a b',
    'a\nb',
    '',
    'x'.repeat(65),
  ];

  const expectValidationError = (fn: () => unknown) => {
    try {
      fn();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe(AppErrorCode.VALIDATION_ERROR);
      return;
    }
    throw new Error('expected a validation error');
  };

  it.each(UNSAFE)('rejects the agent name %j', (agentName) => {
    for (const os of Object.values(AgentOs)) {
      expectValidationError(() => buildEnrollCommand(os, input({ agentName })));
    }
  });

  it.each(UNSAFE)('rejects the group %j', (group) => {
    for (const os of Object.values(AgentOs)) {
      expectValidationError(() => buildEnrollCommand(os, input({ group })));
    }
  });

  it('accepts 64 characters of the allowed set', () => {
    const agentName = `A-b_c.9${'x'.repeat(57)}`;
    expect(agentName).toHaveLength(64);
    expect(buildDebEnrollCommand(input({ agentName }))).toContain(`'${agentName}'`);
  });

  it.each(['bad address', '256.1.1.1', '1.2.3', '-host', "host';rm"])(
    'rejects the manager address %j',
    (managerAddress) => {
      expectValidationError(() => buildWindowsEnrollCommand(input({ managerAddress })));
    },
  );

  it.each([
    'short',
    "has'quote-but-long-enough-1234",
    'has space but long enough 1234',
    'dollar$-long-enough-123456',
  ])('rejects the enrollment password %j', (enrollmentPassword) => {
    expectValidationError(() => buildDebEnrollCommand(input({ enrollmentPassword })));
  });

  it.each(['latest', '4.14', '4.14.10; id'])('rejects the agent version %j', (agentVersion) => {
    expectValidationError(() => buildRpmEnrollCommand(input({ agentVersion })));
  });

  it('accepts a v-prefixed version', () => {
    expect(buildRpmEnrollCommand(input({ agentVersion: 'v4.14.10' }))).toContain('4.14.10-1');
  });
});

describe('connectivity check and requirements', () => {
  it('uses Test-NetConnection on Windows and nc on Linux', () => {
    expect(buildConnectivityCheck(AgentOs.WINDOWS, '192.168.1.20')).toBe(
      "Test-NetConnection -ComputerName '192.168.1.20' -Port 1514\nTest-NetConnection -ComputerName '192.168.1.20' -Port 1515",
    );
    expect(buildConnectivityCheck(AgentOs.LINUX_DEB, '192.168.1.20')).toBe(
      "nc -zv '192.168.1.20' 1514 && nc -zv '192.168.1.20' 1515",
    );
  });

  it('lists admin rights, both ports and no existing agent', () => {
    for (const os of Object.values(AgentOs)) {
      const text = enrollRequirements(os, '192.168.1.20').join('\n');
      expect(text).toMatch(/Administrator|sudo/);
      expect(text).toContain('TCP 1514 and 1515');
      expect(text).toContain('No Wazuh agent installed');
    }
  });
});
